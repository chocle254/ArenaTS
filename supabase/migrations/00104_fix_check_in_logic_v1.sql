-- ============================================================================
-- UPDATE CHECK-IN TIMEOUT LOGIC
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_match_check_in_timeout(p_match_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_result record;
  v_tournament record;
  v_winner_id uuid;
  v_match_number integer;
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_player_slot text;
  v_num_rounds integer;
BEGIN
  -- Get match result details
  SELECT * INTO v_match_result FROM match_results WHERE id = p_match_result_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- If already confirmed or both ready, do nothing
  IF v_match_result.status = 'confirmed' OR (v_match_result.player1_checked_in AND v_match_result.player2_checked_in) THEN
    RETURN;
  END IF;

  -- Get tournament details
  SELECT num_rounds INTO v_num_rounds FROM tournaments WHERE id = v_match_result.tournament_id;

  -- Logic based on who checked in
  IF v_match_result.player1_checked_in AND NOT v_match_result.player2_checked_in THEN
    -- Player 1 wins by no-show
    v_winner_id := v_match_result.player1_id;
    
    UPDATE match_results 
    SET status = 'confirmed',
        winner_id = v_winner_id,
        updated_at = now()
    WHERE id = p_match_result_id;
    
    -- Eliminate player 2
    UPDATE tournament_participants 
    SET eliminated = true 
    WHERE tournament_id = v_match_result.tournament_id 
      AND user_id = v_match_result.player2_id;

  ELSIF NOT v_match_result.player1_checked_in AND v_match_result.player2_checked_in THEN
    -- Player 2 wins by no-show
    v_winner_id := v_match_result.player2_id;
    
    UPDATE match_results 
    SET status = 'confirmed',
        winner_id = v_winner_id,
        updated_at = now()
    WHERE id = p_match_result_id;
    
    -- Eliminate player 1
    UPDATE tournament_participants 
    SET eliminated = true 
    WHERE tournament_id = v_match_result.tournament_id 
      AND user_id = v_match_result.player1_id;

  ELSE
    -- Neither checked in: both eliminated
    UPDATE match_results 
    SET status = 'confirmed',
        winner_id = NULL,
        updated_at = now()
    WHERE id = p_match_result_id;
    
    UPDATE tournament_participants 
    SET eliminated = true 
    WHERE tournament_id = v_match_result.tournament_id 
      AND (user_id = v_match_result.player1_id OR user_id = v_match_result.player2_id);

    -- Parent match slot should receive a bye (NULL player)
    v_match_number := SUBSTRING(v_match_result.match_id FROM 'm(\d+)$')::integer;
    v_next_round := v_match_result.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;

    IF v_next_round <= v_num_rounds THEN
      IF v_match_number % 2 = 0 THEN
        v_player_slot := 'player1';
      ELSE
        v_player_slot := 'player2';
      END IF;

      -- Update parent match row to set this slot as NULL
      -- This effectively gives the other player in the next match a bye if they exist,
      -- or keeps the slot empty if they don't yet.
      IF v_player_slot = 'player1' THEN
        UPDATE match_results
        SET player1_id = NULL,
            team1_id = NULL
        WHERE tournament_id = v_match_result.tournament_id
          AND match_id = v_next_match_id;
      ELSE
        UPDATE match_results
        SET player2_id = NULL,
            team2_id = NULL
        WHERE tournament_id = v_match_result.tournament_id
          AND match_id = v_next_match_id;
      END IF;
      
      -- If the parent match now has one NULL and one player, or two NULLs, handle accordingly
      -- Actually, the advance_winner trigger will fire when we set status = 'confirmed' above,
      -- but since winner_id is NULL, it won't do much.
      -- We explicitly handled the parent slot update here.
    END IF;
  END IF;
END;
$$;

-- ============================================================================
-- TRIGGER TO AUTOMATICALLY START MATCH WHEN BOTH READY
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_both_players_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND NOT OLD.both_players_ready THEN
    NEW.both_players_ready := true;
    NEW.match_started_at := now();
    NEW.match_deadline := now() + interval '30 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS both_players_ready_trigger ON match_results;
CREATE TRIGGER both_players_ready_trigger
BEFORE UPDATE ON match_results
FOR EACH ROW
WHEN (NEW.player1_checked_in AND NEW.player2_checked_in)
EXECUTE FUNCTION handle_both_players_ready();