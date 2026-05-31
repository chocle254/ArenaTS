-- ============================================================
-- FUNCTION 1: confirm_match_result
-- Called when both players agree on a winner.
-- Finds or creates the match row and sets it to confirmed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_match_result(
  p_tournament_id uuid,
  p_match_id      text,
  p_round         integer,
  p_player1_id    uuid,
  p_player2_id    uuid,
  p_winner_id     uuid,
  p_reported_by   uuid,
  p_report_field  text  -- 'player1_reported_winner' or 'player2_reported_winner'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing    match_results%ROWTYPE;
  v_other_report uuid;
  v_new_status  text;
  v_result      json;
BEGIN
  -- Fetch existing row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  IF v_existing.id IS NULL THEN
    -- No row yet — insert with this player's report
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
    );
    RETURN json_build_object('status', 'pending', 'message', 'Result submitted. Waiting for opponent.');
  ELSE
    -- Row exists — check what the other player reported
    v_other_report := CASE
      WHEN p_report_field = 'player1_reported_winner' THEN v_existing.player2_reported_winner
      ELSE v_existing.player1_reported_winner
    END;

    -- Determine new status
    IF v_other_report IS NOT NULL THEN
      IF v_other_report = p_winner_id THEN
        v_new_status := 'confirmed';
      ELSE
        v_new_status := 'disputed';
      END IF;
    ELSE
      v_new_status := 'pending';
    END IF;

    -- Update by primary key — always safe
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
  END IF;
END;
$$;

-- ============================================================
-- FUNCTION 2: admin_override_match
-- Called when admin clicks override in dispute center.
-- Finds or creates the match row and forces confirmation.
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
  -- Fetch existing row
  SELECT * INTO v_existing
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND match_id = p_match_id;

  IF v_existing.id IS NULL THEN
    -- No row yet — insert as confirmed immediately
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
    );
  ELSE
    -- Row exists — force confirmed by primary key
    UPDATE match_results
    SET
      winner_id      = p_winner_id,
      status         = 'confirmed',
      admin_override = true,
      submitted_by   = p_admin_id,
      updated_at     = now()
    WHERE id = v_existing.id;
  END IF;

  RETURN json_build_object(
    'status', 'confirmed',
    'message', 'Admin override applied successfully.'
  );
END;
$$;

-- ============================================================
-- Grant execute permission to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.confirm_match_result TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_match TO authenticated;