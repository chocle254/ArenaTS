-- Ensure only plural RPC exists
DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid);

-- Simplified and robust bracket generation
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
    -- 1. Count entities
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n FROM tournament_teams WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n FROM tournament_participants WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    IF v_n < 2 THEN CONTINUE; END IF;

    -- 2. Mark tournament
    UPDATE tournaments 
    SET bracket_generated = true, 
        bracket_generated_at = now(), 
        status = 'active'
    WHERE id = v_tournament.id;
    
    v_num_rounds := ceil(log(2, v_n))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes := v_bracket_size - v_n;

    UPDATE tournaments SET num_rounds = v_num_rounds WHERE id = v_tournament.id;

    -- 3. Clear and assign fresh seeds
    IF v_tournament.mode != 'team' THEN
      UPDATE tournament_participants SET bracket_seed = NULL WHERE tournament_id = v_tournament.id;
      WITH seeded AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as new_seed 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp 
      SET bracket_seed = seeded.new_seed 
      FROM seeded 
      WHERE tp.id = seeded.id;
    ELSE
      UPDATE tournament_teams SET bracket_seed = NULL WHERE tournament_id = v_tournament.id;
      WITH seeded AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) as new_seed 
        FROM tournament_teams 
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt 
      SET bracket_seed = seeded.new_seed 
      FROM seeded 
      WHERE tt.id = seeded.id;
    END IF;

    -- 4. Set common deadline
    v_check_in_deadline := now() + interval '5 minutes';

    -- 5. Clean matches
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- 6. Generate matches
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;
      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        v_match_id := 'r' || v_round || '-m' || v_match_index;
        v_p1_id := NULL; v_p2_id := NULL; v_t1_id := NULL; v_t2_id := NULL;

        IF v_round = 1 THEN
          IF v_match_index < v_num_byes THEN
            -- Bye
            v_seed1 := v_match_index + 1;
            IF v_tournament.mode = 'team' THEN
               SELECT id, captain_id INTO v_t1_id, v_p1_id FROM tournament_teams WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            ELSE
               SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
            END IF;
            
            INSERT INTO match_results (
              tournament_id, match_id, round, player1_id, team1_id, winner_id, status, both_players_ready
            ) VALUES (
              v_tournament.id, v_match_id, 1, v_p1_id, v_t1_id, v_p1_id, 'confirmed', false
            );
          ELSE
            -- Real
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
          -- Placeholder for future rounds
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

-- Ensure advance_winner always sets deadline when both players are ready
CREATE OR REPLACE FUNCTION advance_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_number integer;
  v_next_round integer;
  v_next_match_number integer;
  v_next_match_id text;
  v_num_rounds integer;
  v_tournament_mode text;
  v_winner_team_id uuid;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND NEW.winner_id IS NOT NULL THEN
    v_match_number := SUBSTRING(NEW.match_id FROM 'm(\\d+)$')::integer;
    v_next_round := NEW.round + 1;
    v_next_match_number := v_match_number / 2;
    v_next_match_id := 'r' || v_next_round || '-m' || v_next_match_number;

    SELECT num_rounds, mode INTO v_num_rounds, v_tournament_mode
    FROM tournaments
    WHERE id = NEW.tournament_id;

    IF v_tournament_mode = 'team' THEN
      SELECT team_id INTO v_winner_team_id
      FROM tournament_participants
      WHERE tournament_id = NEW.tournament_id AND user_id = NEW.winner_id
      LIMIT 1;
    END IF;

    IF v_next_round <= v_num_rounds THEN
      IF v_match_number % 2 = 0 THEN
        UPDATE match_results
        SET player1_id = NEW.winner_id,
            team1_id = v_winner_team_id,
            check_in_deadline = CASE WHEN player2_id IS NOT NULL THEN NOW() + INTERVAL '5 minutes' ELSE check_in_deadline END,
            both_players_ready = false
        WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;
      ELSE
        UPDATE match_results
        SET player2_id = NEW.winner_id,
            team2_id = v_winner_team_id,
            check_in_deadline = CASE WHEN player1_id IS NOT NULL THEN NOW() + INTERVAL '5 minutes' ELSE check_in_deadline END,
            both_players_ready = false
        WHERE tournament_id = NEW.tournament_id AND match_id = v_next_match_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
