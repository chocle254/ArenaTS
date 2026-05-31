
-- Add is_standby to tournament_participants
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS is_standby boolean DEFAULT false;

-- Add check-in deadline to tournament_participants (to track per-player check-in)
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Function to handle standby replacement and match progression
CREATE OR REPLACE FUNCTION handle_match_check_in_timeout(p_match_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_result record;
  v_standby_player record;
  v_tournament record;
  v_p1_ready boolean;
  v_p2_ready boolean;
  v_winner_id uuid;
BEGIN
  -- Get match result details
  SELECT * INTO v_match_result FROM match_results WHERE id = p_match_result_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- If already confirmed or both ready, do nothing
  IF v_match_result.status = 'confirmed' OR (v_match_result.player1_checked_in AND v_match_result.player2_checked_in) THEN
    RETURN;
  END IF;

  v_p1_ready := v_match_result.player1_checked_in;
  v_p2_ready := v_match_result.player2_checked_in;

  -- Try to replace non-ready players with standby players
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = v_match_result.tournament_id;

  -- Replace Player 1 if not ready
  IF NOT v_p1_ready THEN
    SELECT * INTO v_standby_player 
    FROM tournament_participants 
    WHERE tournament_id = v_match_result.tournament_id 
      AND is_standby = true 
      AND eliminated = false
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
      -- Replace Player 1
      UPDATE match_results 
      SET player1_id = v_standby_player.user_id,
          player1_checked_in = false,
          check_in_deadline = now() + interval '5 minutes'
      WHERE id = p_match_result_id;
      
      -- Mark standby player as no longer standby
      UPDATE tournament_participants 
      SET is_standby = false 
      WHERE id = v_standby_player.id;
      
      -- Recalculate p1_ready for subsequent logic
      v_p1_ready := false; 
      
      -- Notify new player
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_standby_player.user_id, 'You are in!', 'A slot opened up in the tournament. Check in now to play!', 'tournament', '/tournaments/' || v_match_result.tournament_id);
    END IF;
  END IF;

  -- Replace Player 2 if not ready
  IF NOT v_p2_ready THEN
    SELECT * INTO v_standby_player 
    FROM tournament_participants 
    WHERE tournament_id = v_match_result.tournament_id 
      AND is_standby = true 
      AND eliminated = false
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
      -- Replace Player 2
      UPDATE match_results 
      SET player2_id = v_standby_player.user_id,
          player2_checked_in = false,
          check_in_deadline = now() + interval '5 minutes'
      WHERE id = p_match_result_id;
      
      -- Mark standby player as no longer standby
      UPDATE tournament_participants 
      SET is_standby = false 
      WHERE id = v_standby_player.id;
      
      -- Recalculate p2_ready
      v_p2_ready := false;

      -- Notify new player
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_standby_player.user_id, 'You are in!', 'A slot opened up in the tournament. Check in now to play!', 'tournament', '/tournaments/' || v_match_result.tournament_id);
    END IF;
  END IF;

  -- Re-fetch match result after possible replacements
  SELECT * INTO v_match_result FROM match_results WHERE id = p_match_result_id;
  
  -- If still someone not ready and no more standby players, handle forfeit
  IF NOT v_match_result.player1_checked_in OR NOT v_match_result.player2_checked_in THEN
    -- If no more replacements possible, we must decide a winner or double DQ
    IF v_match_result.player1_checked_in THEN
      v_winner_id := v_match_result.player1_id;
    ELSIF v_match_result.player2_checked_in THEN
      v_winner_id := v_match_result.player2_id;
    ELSE
      v_winner_id := NULL; -- Double DQ
    END IF;

    UPDATE match_results 
    SET status = 'confirmed',
        winner_id = v_winner_id,
        admin_override = true,
        updated_at = now()
    WHERE id = p_match_result_id;
    
    -- Mark non-ready players as eliminated
    IF NOT v_match_result.player1_checked_in THEN
       UPDATE tournament_participants SET eliminated = true WHERE tournament_id = v_match_result.tournament_id AND user_id = v_match_result.player1_id;
    END IF;
    IF NOT v_match_result.player2_checked_in THEN
       UPDATE tournament_participants SET eliminated = true WHERE tournament_id = v_match_result.tournament_id AND user_id = v_match_result.player2_id;
    END IF;
  END IF;
END;
$$;

-- Create Round 1 matches when tournament starts
CREATE OR REPLACE FUNCTION initialize_tournament_bracket()
RETURNS trigger AS $$
DECLARE
  v_participants_count integer;
  v_num_matches integer;
  v_i integer;
  v_p1 record;
  v_p2 record;
  v_check_in_deadline timestamptz;
BEGIN
  -- Only run when status changes to 'active'
  IF NEW.status = 'active' AND OLD.status = 'open' THEN
    -- Get confirmed participants (not standby)
    -- If we have more than max_players, some remain standby
    -- For now, let's just take the first max_players
    
    -- Assign seeds if not assigned
    WITH seeded_participants AS (
      SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed
      FROM tournament_participants
      WHERE tournament_id = NEW.id
      LIMIT NEW.max_players
    )
    UPDATE tournament_participants tp
    SET bracket_seed = sp.seed,
        is_standby = false
    FROM seeded_participants sp
    WHERE tp.id = sp.id;

    -- Mark others as standby
    UPDATE tournament_participants
    SET is_standby = true
    WHERE tournament_id = NEW.id AND bracket_seed IS NULL;

    -- Create Round 1 Matches
    -- Standard single elimination bracket logic
    v_participants_count := NEW.max_players;
    v_num_matches := v_participants_count / 2;
    v_check_in_deadline := now() + interval '5 minutes';

    FOR v_i IN 0..(v_num_matches - 1) LOOP
      -- Get players for this match (seed i+1 and max-i)
      SELECT user_id INTO v_p1 FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_i + 1;
      SELECT user_id INTO v_p2 FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_participants_count - v_i;

      IF v_p1.user_id IS NOT NULL AND v_p2.user_id IS NOT NULL THEN
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          player1_id,
          player2_id,
          check_in_deadline,
          status
        ) VALUES (
          NEW.id,
          'r1-m' || v_i,
          1,
          v_p1.user_id,
          v_p2.user_id,
          v_check_in_deadline,
          'pending'
        ) ON CONFLICT (tournament_id, match_id) DO UPDATE SET
          player1_id = EXCLUDED.player1_id,
          player2_id = EXCLUDED.player2_id,
          check_in_deadline = EXCLUDED.check_in_deadline;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_initialize_bracket ON tournaments;
CREATE TRIGGER trigger_initialize_bracket
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION initialize_tournament_bracket();
