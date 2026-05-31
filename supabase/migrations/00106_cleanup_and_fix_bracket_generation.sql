-- Delete the singular RPC
DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid);

-- Update the plural RPC to be more robust
CREATE OR REPLACE FUNCTION generate_tournament_brackets(p_tournament_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_n integer;
  v_num_rounds integer;
  v_bracket_size integer;
  v_num_byes integer;
  v_match_index integer;
  v_match_id text;
  v_p1_id uuid;
  v_p2_id uuid;
  v_t1_id uuid;
  v_t2_id uuid;
  v_seed1 integer;
  v_seed2 integer;
  v_round integer;
  v_matches_in_round integer;
  v_check_in_deadline timestamptz;
BEGIN
  FOR v_tournament IN 
    SELECT * FROM tournaments
    WHERE (p_tournament_id IS NULL AND status = 'open' AND bracket_generated = false AND start_time <= now() + interval '15 minutes' AND current_players >= min_participants)
       OR (p_tournament_id IS NOT NULL AND id = p_tournament_id AND bracket_generated = false)
  LOOP
    -- Mark as generated and active IMMEDIATELY to prevent double execution
    UPDATE tournaments 
    SET bracket_generated = true, 
        bracket_generated_at = now(), 
        status = 'active'
    WHERE id = v_tournament.id;

    -- Calculate participants count
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n FROM tournament_teams WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n FROM tournament_participants WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    -- If not enough participants, we can't generate a bracket
    IF v_n < 2 THEN 
      UPDATE tournaments SET bracket_generated = false, status = 'open' WHERE id = v_tournament.id;
      CONTINUE; 
    END IF;
    
    v_num_rounds := ceil(log(2, v_n))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes := v_bracket_size - v_n;

    -- Update tournament with num_rounds
    UPDATE tournaments SET num_rounds = v_num_rounds WHERE id = v_tournament.id;

    -- Assign seeds for individual tournaments (1-indexed)
    IF v_tournament.mode != 'team' THEN
      WITH seeded_confirmed AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp 
      SET bracket_seed = sc.seed 
      FROM seeded_confirmed sc 
      WHERE tp.id = sc.id;
    ELSE
      -- Assign seeds for teams if not already assigned
      WITH seeded_teams AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed 
        FROM tournament_teams 
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt 
      SET bracket_seed = st.seed 
      FROM seeded_teams st 
      WHERE tt.id = st.id;
    END IF;

    -- Set check-in deadline (5 minutes from now)
    v_check_in_deadline := now() + interval '5 minutes';

    -- Delete any existing match results for this tournament to ensure a clean slate
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- Create ALL matches for ALL rounds
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;
      
      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        v_match_id := 'r' || v_round || '-m' || v_match_index;
        v_p1_id := NULL;
        v_p2_id := NULL;
        v_t1_id := NULL;
        v_t2_id := NULL;

        -- For Round 1, populate players/teams
        IF v_round = 1 THEN
          IF v_match_index < v_num_byes THEN
            -- Bye match: player 1 vs nobody
            v_seed1 := v_match_index + 1;
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, team1_id, winner_id, status, admin_override, match_duration_minutes, both_players_ready
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_t1_id, v_p1_id, 'confirmed', true, COALESCE(v_tournament.match_time_limit, 30), false
            );
          ELSE
            -- Real match
            v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
            v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;
            
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
               SELECT id, captain_id INTO v_t2_id, v_p2_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
               SELECT user_id INTO v_p2_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, player2_id, team1_id, team2_id, 
              status, match_duration_minutes, check_in_deadline, both_players_ready
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, v_t1_id, v_t2_id, 
              'pending', COALESCE(v_tournament.match_time_limit, 30), v_check_in_deadline, false
            );
          END IF;
        ELSE
          -- Round 2+, create empty match record
          INSERT INTO match_results (
            tournament_id, match_id, round, status, match_duration_minutes, both_players_ready
          ) VALUES (
            v_tournament.id, v_match_id, v_round, 'pending', COALESCE(v_tournament.match_time_limit, 30), false
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;
