-- ============================================================
-- STEP 1: Delete duplicate rows
-- Keep only the most recently updated row per
-- (tournament_id, match_id) pair.
-- ============================================================
DELETE FROM match_results
WHERE id NOT IN (
  SELECT DISTINCT ON (tournament_id, match_id) id
  FROM match_results
  ORDER BY tournament_id, match_id, updated_at DESC NULLS LAST
);

-- ============================================================
-- STEP 2: Add the UNIQUE constraint
-- Prevents duplicate rows from ever being created again.
-- ============================================================
ALTER TABLE match_results
  ADD CONSTRAINT match_results_tournament_match_unique
  UNIQUE (tournament_id, match_id);

-- ============================================================
-- STEP 3: Rebuild advance_winner_to_next_match with
-- defensive LIMIT 1 on all SELECT INTO statements.
-- ============================================================
CREATE OR REPLACE FUNCTION public.advance_winner_to_next_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_round         integer;
  v_next_match_number  integer;
  v_next_match_id      text;
  v_is_player1         boolean;
  v_num_rounds         integer;
  v_match_number       integer;
  v_existing_id        uuid;
BEGIN
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
    AND NEW.winner_id IS NOT NULL
  THEN
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;
    v_match_number      := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round        := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;
    v_is_player1        := (v_match_number % 2 = 0);
    
    SELECT MAX(round) INTO v_num_rounds
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    IF v_next_round <= v_num_rounds THEN
      SELECT id INTO v_existing_id
      FROM match_results
      WHERE tournament_id = NEW.tournament_id
        AND match_id = v_next_match_id
      LIMIT 1;
      
      IF v_existing_id IS NOT NULL THEN
        UPDATE match_results
        SET
          player1_id         = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
          player2_id         = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
          player1_checked_in = CASE WHEN v_is_player1 THEN false ELSE player1_checked_in END,
          player2_checked_in = CASE WHEN NOT v_is_player1 THEN false ELSE player2_checked_in END,
          both_players_ready = false,
          match_started_at   = NULL,
          status             = 'pending',
          check_in_deadline  = CASE
            WHEN (v_is_player1 AND player2_id IS NOT NULL)
              OR (NOT v_is_player1 AND player1_id IS NOT NULL)
            THEN now() + interval '5 minutes'
            ELSE check_in_deadline
          END
        WHERE id = v_existing_id;
      ELSE
        INSERT INTO match_results (
          tournament_id, match_id, round,
          player1_id, player2_id,
          status, check_in_deadline
        )
        VALUES (
          NEW.tournament_id, v_next_match_id, v_next_round,
          CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
          CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
          'pending', NULL
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- STEP 4: Fix the trigger so advance_winner only fires on
-- UPDATE — not INSERT.
-- ============================================================
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner_to_next_match();

-- ============================================================
-- STEP 5: Rebuild confirm_match_result RPC to use
-- INSERT ON CONFLICT instead of SELECT then INSERT/UPDATE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_match_result(
  p_tournament_id uuid,
  p_match_id      text,
  p_round         integer,
  p_player1_id    uuid,
  p_player2_id    uuid,
  p_winner_id     uuid,
  p_reported_by   uuid,
  p_report_field  text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing     match_results%ROWTYPE;
  v_other_report uuid;
  v_new_status   text;
BEGIN
  -- Upsert: create the row if it doesn't exist, do nothing if it does
  INSERT INTO match_results (
    tournament_id, match_id, round,
    player1_id, player2_id,
    player1_reported_winner, player2_reported_winner,
    submitted_by, status
  )
  VALUES (
    p_tournament_id, p_match_id, p_round,
    p_player1_id, p_player2_id,
    CASE WHEN p_report_field = 'player1_reported_winner' THEN p_winner_id ELSE NULL END,
    CASE WHEN p_report_field = 'player2_reported_winner' THEN p_winner_id ELSE NULL END,
    p_reported_by, 'pending'
  )
  ON CONFLICT (tournament_id, match_id) DO NOTHING;

  -- Now fetch the single guaranteed row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  -- Get what the other player reported
  v_other_report := CASE
    WHEN p_report_field = 'player1_reported_winner' THEN v_existing.player2_reported_winner
    ELSE v_existing.player1_reported_winner
  END;

  -- Determine status
  IF v_other_report IS NOT NULL THEN
    v_new_status := CASE WHEN v_other_report = p_winner_id THEN 'confirmed' ELSE 'disputed' END;
  ELSE
    v_new_status := 'pending';
  END IF;

  -- Single safe update by primary key
  UPDATE match_results
  SET
    player1_reported_winner = CASE WHEN p_report_field = 'player1_reported_winner' THEN p_winner_id ELSE player1_reported_winner END,
    player2_reported_winner = CASE WHEN p_report_field = 'player2_reported_winner' THEN p_winner_id ELSE player2_reported_winner END,
    submitted_by = p_reported_by,
    winner_id    = CASE WHEN v_new_status = 'confirmed' THEN p_winner_id ELSE winner_id END,
    status       = v_new_status,
    updated_at   = now()
  WHERE id = v_existing.id;

  RETURN json_build_object(
    'status', v_new_status,
    'message', CASE
      WHEN v_new_status = 'confirmed' THEN 'Match confirmed. Winner advancing.'
      WHEN v_new_status = 'disputed'  THEN 'Results conflict. Dispute raised.'
      ELSE 'Result submitted. Waiting for opponent.'
    END
  );
END;
$$;

-- ============================================================
-- STEP 6: Rebuild admin_override_match RPC with same
-- INSERT ON CONFLICT pattern for safety.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_override_match(
  p_tournament_id uuid,
  p_match_id      text,
  p_round         integer,
  p_player1_id    uuid,
  p_player2_id    uuid,
  p_winner_id     uuid,
  p_admin_id      uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing match_results%ROWTYPE;
BEGIN
  -- Upsert: create row if missing, do nothing if exists
  INSERT INTO match_results (
    tournament_id, match_id, round,
    player1_id, player2_id,
    winner_id, status,
    admin_override, submitted_by
  )
  VALUES (
    p_tournament_id, p_match_id, p_round,
    p_player1_id, p_player2_id,
    p_winner_id, 'confirmed',
    true, p_admin_id
  )
  ON CONFLICT (tournament_id, match_id) DO NOTHING;

  -- Fetch the single guaranteed row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  -- Force confirm by primary key
  UPDATE match_results
  SET
    winner_id      = p_winner_id,
    status         = 'confirmed',
    admin_override = true,
    submitted_by   = p_admin_id,
    updated_at     = now()
  WHERE id = v_existing.id;

  RETURN json_build_object(
    'status', 'confirmed',
    'message', 'Admin override applied successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_match_result TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_match TO authenticated;