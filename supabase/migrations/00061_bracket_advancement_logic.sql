-- Function to advance winner to next match
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
BEGIN
  -- Only run if match is newly confirmed and has a winner
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') AND NEW.winner_id IS NOT NULL THEN
    
    -- Extract current round and match number from match_id (e.g., 'r1-m0')
    -- We assume match_id format is 'r{round}-m{match_number}'
    v_match_number := (regexp_match(NEW.match_id, 'm(\d+)'))[1]::integer;
    
    v_next_round := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;
    v_is_player1 := (v_match_number % 2 = 0);

    -- Get tournament info to check if we've reached the end
    SELECT max_players INTO v_tournament_max_players FROM tournaments WHERE id = NEW.tournament_id;
    v_num_rounds := ceil(log(2, v_tournament_max_players));

    -- If there's a next round
    IF v_next_round <= v_num_rounds THEN
      -- Upsert the next match result
      INSERT INTO match_results (
        tournament_id,
        match_id,
        round,
        player1_id,
        player2_id,
        status
      )
      VALUES (
        NEW.tournament_id,
        v_next_match_id,
        v_next_round,
        CASE WHEN v_is_player1 THEN NEW.winner_id ELSE NULL END,
        CASE WHEN NOT v_is_player1 THEN NEW.winner_id ELSE NULL END,
        'pending'
      )
      ON CONFLICT (tournament_id, match_id) DO UPDATE
      SET 
        player1_id = CASE WHEN v_is_player1 THEN EXCLUDED.player1_id ELSE match_results.player1_id END,
        player2_id = CASE WHEN NOT v_is_player1 THEN EXCLUDED.player2_id ELSE match_results.player2_id END,
        -- Reset statuses if match is now full
        check_in_deadline = CASE 
          WHEN (v_is_player1 AND match_results.player2_id IS NOT NULL) OR (NOT v_is_player1 AND match_results.player1_id IS NOT NULL) 
          THEN now() + interval '5 minutes' 
          ELSE match_results.check_in_deadline 
        END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bracket advancement
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
AFTER UPDATE OF status ON match_results
FOR EACH ROW
EXECUTE FUNCTION advance_winner_to_next_match();
