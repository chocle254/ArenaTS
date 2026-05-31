-- ============================================================
-- FUNCTION 1: advance_winner_to_next_match
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

  -- Only run when a match transitions to confirmed and has a winner
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
    AND NEW.winner_id IS NOT NULL
  THEN

    -- Only process match IDs that follow the r{n}-m{n} pattern
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;

    -- Extract current match number from match_id (e.g. 'r1-m3' -> 3)
    v_match_number      := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round        := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;

    -- Even match number = player1 slot, odd = player2 slot
    v_is_player1 := (v_match_number % 2 = 0);

    -- Read the actual final round from existing rows.
    -- Never use max_players -- it reflects capacity, not reality.
    SELECT MAX(round) INTO v_num_rounds
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    -- If there is a next round to advance into
    IF v_next_round <= v_num_rounds THEN

      -- Check if the next match row already exists
      SELECT id INTO v_existing_id
      FROM match_results
      WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;

      IF v_existing_id IS NOT NULL THEN

        -- Update the existing next-round row
        UPDATE match_results
        SET
          player1_id = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
          player2_id = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
          player1_checked_in = CASE WHEN v_is_player1 THEN false ELSE player1_checked_in END,
          player2_checked_in = CASE WHEN NOT v_is_player1 THEN false ELSE player2_checked_in END,
          both_players_ready = false,
          match_started_at   = NULL,
          status             = 'pending',
          -- Only open check-in once BOTH players are in the slot
          check_in_deadline  = CASE
            WHEN (v_is_player1 AND player2_id IS NOT NULL)
              OR (NOT v_is_player1 AND player1_id IS NOT NULL)
            THEN now() + interval '5 minutes'
            ELSE check_in_deadline
          END
        WHERE id = v_existing_id;

      ELSE

        -- Create new match row with only this winner filled in.
        -- check_in_deadline stays NULL until second player arrives.
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          player1_id,
          player2_id,
          status,
          check_in_deadline
        )
        VALUES (
          NEW.tournament_id,
          v_next_match_id,
          v_next_round,
          CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
          CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
          'pending',
          NULL
        );

      END IF;

    END IF;

  END IF;

  RETURN NEW;

END;
$function$;


-- ============================================================
-- FUNCTION 2: check_for_tournament_completion
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_for_tournament_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max_round   integer;
  v_final_match text;
BEGIN

  -- Only run when a match transitions to confirmed
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
  THEN

    -- The final is always the highest round, match index 0
    SELECT MAX(round) INTO v_max_round
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    v_final_match := 'r' || v_max_round || '-m0';

    -- If the match just confirmed IS the final, mark tournament complete
    IF NEW.match_id = v_final_match AND NEW.winner_id IS NOT NULL THEN
      UPDATE tournaments
      SET
        status    = 'completed',
        winner_id = NEW.winner_id
      WHERE id = NEW.tournament_id;
    END IF;

  END IF;

  RETURN NEW;

END;
$function$;
