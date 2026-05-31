-- FIX 1: Fix the bare UPDATE in distribute_arena_prizes
CREATE OR REPLACE FUNCTION public.distribute_arena_prizes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament    tournaments%ROWTYPE;
  v_prize_pool    numeric;
  v_platform_fee  numeric;
  v_winner_prize  numeric;
BEGIN
  -- Fetch the tournament
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = NEW.tournament_id
  LIMIT 1;

  IF v_tournament.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only distribute if tournament just became completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_prize_pool   := COALESCE(v_tournament.prize_pool, 0);
    v_platform_fee := v_prize_pool * 0.1;  -- 10% platform fee
    v_winner_prize := v_prize_pool - v_platform_fee;

    -- Update platform settings WITH a WHERE clause using LIMIT 1 subquery
    UPDATE platform_settings
    SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee
    WHERE id = (SELECT id FROM platform_settings LIMIT 1);

    -- Record the prize payout for the winner
    IF v_tournament.winner_id IS NOT NULL AND v_winner_prize > 0 THEN
      INSERT INTO prize_payouts (
        tournament_id,
        user_id,
        amount,
        status,
        created_at
      )
      VALUES (
        v_tournament.id,
        v_tournament.winner_id,
        v_winner_prize,
        'pending',
        now()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- FIX 2: Drop and recreate trigger_advance_winner as UPDATE ONLY
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner_to_next_match();

-- FIX 3: Verify and clean duplicate rows, then enforce the unique constraint
DELETE FROM match_results
WHERE id NOT IN (
  SELECT DISTINCT ON (tournament_id, match_id) id
  FROM match_results
  ORDER BY tournament_id, match_id, updated_at DESC NULLS LAST
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'match_results'
      AND constraint_name = 'match_results_tournament_match_unique'
  ) THEN
    ALTER TABLE match_results
      ADD CONSTRAINT match_results_tournament_match_unique
      UNIQUE (tournament_id, match_id);
  END IF;
END $$;

-- FIX 4: Add LIMIT 1 guard to advance_winner function
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