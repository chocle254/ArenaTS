CREATE OR REPLACE FUNCTION advance_winner_to_next_match()
RETURNS TRIGGER AS $$
DECLARE
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_is_player1 boolean;
  v_tournament_max_players integer;
  v_num_rounds integer;
  v_match_number integer;
  v_existing_id uuid;
BEGIN
  -- Only run if match is newly confirmed and has a winner
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') AND NEW.winner_id IS NOT NULL THEN
    
    -- Extract current round and match number from match_id (e.g., 'r1-m0')
    IF NEW.match_id NOT LIKE 'r%-m%' THEN
      RETURN NEW;
    END IF;
    
    v_match_number := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    v_next_round := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;
    v_is_player1 := (v_match_number % 2 = 0);

    -- Get tournament info
    SELECT max_players INTO v_tournament_max_players FROM tournaments WHERE id = NEW.tournament_id;
    v_num_rounds := ceil(log(2, v_tournament_max_players));

    -- If there's a next round
    IF v_next_round <= v_num_rounds THEN
      -- Check if next match already exists
      SELECT id INTO v_existing_id FROM match_results 
      WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;

      IF v_existing_id IS NOT NULL THEN
        -- Update existing match
        UPDATE match_results
        SET 
          player1_id = CASE WHEN v_is_player1 THEN NEW.winner_id ELSE player1_id END,
          player2_id = CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE player2_id END,
          -- Reset statuses if match is updated
          player1_checked_in = CASE WHEN v_is_player1 THEN false ELSE player1_checked_in END,
          player2_checked_in = CASE WHEN NOT v_is_player1 THEN false ELSE player2_checked_in END,
          both_players_ready = false,
          match_started_at = NULL,
          status = 'pending',
          -- Set deadline if now full
          check_in_deadline = CASE 
            WHEN (v_is_player1 AND player2_id IS NOT NULL) OR (NOT v_is_player1 AND player1_id IS NOT NULL) 
            THEN now() + interval '5 minutes' 
            ELSE check_in_deadline 
          END
        WHERE id = v_existing_id;
      ELSE
        -- Insert new match
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
          NULL -- Don't set deadline yet, wait for both players
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
