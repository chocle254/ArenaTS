-- ============================================================================
-- REBUILD TOURNAMENT BRACKET SYSTEM FROM SCRATCH
-- ============================================================================

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS advance_winner_trigger ON match_results;
DROP TRIGGER IF EXISTS check_tournament_completion_trigger ON match_results;
DROP FUNCTION IF EXISTS advance_winner() CASCADE;
DROP FUNCTION IF EXISTS check_tournament_completion() CASCADE;
DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid) CASCADE;

-- ============================================================================
-- FUNCTION 1: GENERATE TOURNAMENT BRACKET
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_tournament_bracket(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_n integer;
  v_num_rounds integer;
  v_bracket_size integer;
  v_num_byes integer;
  v_match_index integer;
  v_seed1 integer;
  v_seed2 integer;
  v_player1_id uuid;
  v_player2_id uuid;
  v_team1_id uuid;
  v_team2_id uuid;
  v_match_id text;
  v_check_in_deadline timestamptz;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Count actual registered participants (not standby, limited by max_players)
  SELECT COUNT(*) INTO v_n
  FROM (
    SELECT user_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND is_standby = false
    ORDER BY created_at ASC
    LIMIT v_tournament.max_players
  ) subquery;

  IF v_n < 2 THEN
    RAISE EXCEPTION 'Need at least 2 participants to generate bracket';
  END IF;

  -- Calculate bracket structure
  v_num_rounds := CEIL(LOG(2, v_n));
  v_bracket_size := POWER(2, v_num_rounds)::integer;
  v_num_byes := v_bracket_size - v_n;

  -- Store num_rounds in tournaments table (CRITICAL)
  UPDATE tournaments
  SET num_rounds = v_num_rounds
  WHERE id = p_tournament_id;

  -- Assign bracket seeds to participants ordered by created_at
  v_match_index := 1;
  FOR v_participant IN
    SELECT user_id, team_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND is_standby = false
    ORDER BY created_at ASC
    LIMIT v_tournament.max_players
  LOOP
    UPDATE tournament_participants
    SET bracket_seed = v_match_index
    WHERE tournament_id = p_tournament_id
      AND user_id = v_participant.user_id;
    
    v_match_index := v_match_index + 1;
  END LOOP;

  -- Set bracket_seed to NULL for standby players
  UPDATE tournament_participants
  SET bracket_seed = NULL
  WHERE tournament_id = p_tournament_id
    AND is_standby = true;

  -- Generate bye matches (round 1, matches 0 to numByes-1)
  FOR v_match_index IN 0..(v_num_byes - 1) LOOP
    v_seed1 := v_match_index + 1;
    
    -- Find participant with this seed
    SELECT user_id, team_id INTO v_player1_id, v_team1_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND bracket_seed = v_seed1
    LIMIT 1;

    v_match_id := 'r1-m' || v_match_index;

    -- Insert bye match as pending first
    INSERT INTO match_results (
      tournament_id,
      match_id,
      round,
      player1_id,
      player2_id,
      winner_id,
      status,
      team1_id
    ) VALUES (
      p_tournament_id,
      v_match_id,
      1,
      v_player1_id,
      NULL,
      v_player1_id,
      'pending',
      CASE WHEN v_tournament.mode = 'team' THEN v_team1_id ELSE NULL END
    );

    -- Update to confirmed to fire the advance_winner trigger
    UPDATE match_results
    SET status = 'confirmed'
    WHERE tournament_id = p_tournament_id
      AND match_id = v_match_id;

    -- Send notification to bye player
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      tournament_id
    ) VALUES (
      v_player1_id,
      'tournament_update',
      'Bye - Auto Advance',
      'You received a bye and will automatically advance to round 2.',
      p_tournament_id
    );
  END LOOP;

  -- Generate real matches (round 1, matches numByes to bracketSize/2-1)
  FOR v_match_index IN v_num_byes..((v_bracket_size / 2) - 1) LOOP
    -- Pair lowest seed vs highest remaining seed
    v_seed1 := v_match_index + 1;
    v_seed2 := v_n - (v_match_index - v_num_byes);

    -- Find player 1
    SELECT user_id, team_id INTO v_player1_id, v_team1_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND bracket_seed = v_seed1
    LIMIT 1;

    -- Find player 2
    SELECT user_id, team_id INTO v_player2_id, v_team2_id
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND bracket_seed = v_seed2
    LIMIT 1;

    v_match_id := 'r1-m' || v_match_index;
    v_check_in_deadline := v_tournament.start_time + INTERVAL '5 minutes';

    -- Insert real match
    INSERT INTO match_results (
      tournament_id,
      match_id,
      round,
      player1_id,
      player2_id,
      status,
      check_in_deadline,
      team1_id,
      team2_id
    ) VALUES (
      p_tournament_id,
      v_match_id,
      1,
      v_player1_id,
      v_player2_id,
      'pending',
      v_check_in_deadline,
      CASE WHEN v_tournament.mode = 'team' THEN v_team1_id ELSE NULL END,
      CASE WHEN v_tournament.mode = 'team' THEN v_team2_id ELSE NULL END
    );

    -- Notify both players
    INSERT INTO notifications (user_id, type, title, message, tournament_id)
    VALUES (
      v_player1_id,
      'match_ready',
      'Match Pairing',
      'Your round 1 match is ready. Check in before the deadline.',
      p_tournament_id
    );

    INSERT INTO notifications (user_id, type, title, message, tournament_id)
    VALUES (
      v_player2_id,
      'match_ready',
      'Match Pairing',
      'Your round 1 match is ready. Check in before the deadline.',
      p_tournament_id
    );
  END LOOP;

  -- Mark bracket as generated
  UPDATE tournaments
  SET bracket_generated = true,
      bracket_generated_at = NOW()
  WHERE id = p_tournament_id;
END;
$$;

-- ============================================================================
-- FUNCTION 2: ADVANCE WINNER TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION advance_winner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_number integer;
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_num_rounds integer;
  v_next_match_exists boolean;
  v_player_slot text;
  v_tournament_mode text;
  v_winner_team_id uuid;
BEGIN
  -- Only process when status becomes confirmed and winner is set
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND NEW.winner_id IS NOT NULL THEN
    
    -- Extract match number from match_id (format: r1-m0, r2-m3, etc.)
    v_match_number := SUBSTRING(NEW.match_id FROM 'm(\d+)$')::integer;
    
    -- Calculate next round and match
    v_next_round := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;

    -- Get num_rounds and mode from tournaments table (NEVER use MAX(round))
    SELECT num_rounds, mode INTO v_num_rounds, v_tournament_mode
    FROM tournaments
    WHERE id = NEW.tournament_id;

    -- Get winner's team_id if in team mode
    IF v_tournament_mode = 'team' THEN
      SELECT team_id INTO v_winner_team_id
      FROM tournament_participants
      WHERE tournament_id = NEW.tournament_id
        AND user_id = NEW.winner_id
      LIMIT 1;
    END IF;

    -- Determine which slot the winner fills (even = player1, odd = player2)
    IF v_match_number % 2 = 0 THEN
      v_player_slot := 'player1';
    ELSE
      v_player_slot := 'player2';
    END IF;

    -- Check if this is the final match
    IF v_next_round <= v_num_rounds THEN
      -- Check if next match exists
      SELECT EXISTS(
        SELECT 1
        FROM match_results
        WHERE tournament_id = NEW.tournament_id
          AND match_id = v_next_match_id
      ) INTO v_next_match_exists;

      IF v_next_match_exists THEN
        -- Update existing match with winner
        IF v_player_slot = 'player1' THEN
          UPDATE match_results
          SET player1_id = NEW.winner_id,
              team1_id = v_winner_team_id,
              check_in_deadline = CASE 
                WHEN player2_id IS NOT NULL THEN NOW() + INTERVAL '5 minutes'
                ELSE NULL
              END,
              both_players_ready = false,
              match_started_at = NULL
          WHERE tournament_id = NEW.tournament_id
            AND match_id = v_next_match_id;
        ELSE
          UPDATE match_results
          SET player2_id = NEW.winner_id,
              team2_id = v_winner_team_id,
              check_in_deadline = CASE 
                WHEN player1_id IS NOT NULL THEN NOW() + INTERVAL '5 minutes'
                ELSE NULL
              END,
              both_players_ready = false,
              match_started_at = NULL
          WHERE tournament_id = NEW.tournament_id
            AND match_id = v_next_match_id;
        END IF;
      ELSE
        -- Insert new match with one player
        IF v_player_slot = 'player1' THEN
          INSERT INTO match_results (
            tournament_id,
            match_id,
            round,
            player1_id,
            player2_id,
            status,
            check_in_deadline,
            team1_id
          ) VALUES (
            NEW.tournament_id,
            v_next_match_id,
            v_next_round,
            NEW.winner_id,
            NULL,
            'pending',
            NULL,
            v_winner_team_id
          );
        ELSE
          INSERT INTO match_results (
            tournament_id,
            match_id,
            round,
            player1_id,
            player2_id,
            status,
            check_in_deadline,
            team2_id
          ) VALUES (
            NEW.tournament_id,
            v_next_match_id,
            v_next_round,
            NULL,
            NEW.winner_id,
            'pending',
            NULL,
            v_winner_team_id
          );
        END IF;
      END IF;
    END IF;
    -- If v_next_round > v_num_rounds, this was the final match - do nothing
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for advance_winner
CREATE TRIGGER advance_winner_trigger
AFTER UPDATE ON match_results
FOR EACH ROW
EXECUTE FUNCTION advance_winner();

-- ============================================================================
-- FUNCTION 3: CHECK TOURNAMENT COMPLETION
-- ============================================================================
CREATE OR REPLACE FUNCTION check_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num_rounds integer;
  v_final_match_id text;
  v_all_confirmed boolean;
BEGIN
  -- Only process when status becomes confirmed
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    
    -- Get num_rounds from tournaments table
    SELECT num_rounds INTO v_num_rounds
    FROM tournaments
    WHERE id = NEW.tournament_id;

    -- Build final match ID
    v_final_match_id := 'r' || v_num_rounds || '-m0';

    -- Check all three conditions:
    -- 1. This is the final match
    -- 2. Winner is set
    -- 3. All matches are confirmed
    IF NEW.match_id = v_final_match_id AND NEW.winner_id IS NOT NULL THEN
      
      -- Check if all matches are confirmed
      SELECT NOT EXISTS(
        SELECT 1
        FROM match_results
        WHERE tournament_id = NEW.tournament_id
          AND status != 'confirmed'
      ) INTO v_all_confirmed;

      IF v_all_confirmed THEN
        -- Tournament is complete
        UPDATE tournaments
        SET status = 'completed',
            winner_id = NEW.winner_id,
            ended_at = NOW()
        WHERE id = NEW.tournament_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for tournament completion
CREATE TRIGGER check_tournament_completion_trigger
AFTER UPDATE ON match_results
FOR EACH ROW
EXECUTE FUNCTION check_tournament_completion();