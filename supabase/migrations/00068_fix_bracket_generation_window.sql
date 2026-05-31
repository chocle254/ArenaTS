-- Update the bracket generation function to be more robust
CREATE OR REPLACE FUNCTION generate_tournament_brackets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_confirmed_count integer;
  v_total_needed integer;
  v_i integer;
  v_p1_id uuid;
  v_p2_id uuid;
  v_t1_id uuid;
  v_t2_id uuid;
  v_check_in_deadline timestamptz;
  v_match_id text;
  v_p1_gamertag text;
  v_p2_gamertag text;
BEGIN
  -- Find tournaments that start soon (within 15 minutes) or have already started,
  -- but haven't generated brackets yet.
  FOR v_tournament IN 
    SELECT * FROM tournaments
    WHERE status = 'open'
      AND bracket_generated = false
      AND start_time <= now() + interval '15 minutes'
      AND current_players >= min_participants
  LOOP
    -- Mark bracket as generated
    UPDATE tournaments 
    SET bracket_generated = true, bracket_generated_at = now()
    WHERE id = v_tournament.id;

    IF v_tournament.team_size > 1 THEN
      -- Team-based tournament logic
      SELECT count(*) INTO v_confirmed_count FROM tournament_teams WHERE tournament_id = v_tournament.id;
      v_total_needed := v_tournament.max_players / v_tournament.team_size;
      v_check_in_deadline := v_tournament.start_time + interval '5 minutes';

      FOR v_i IN 0..(v_total_needed / 2 - 1) LOOP
        v_match_id := 'r1-m' || v_i;
        
        SELECT id, captain_id INTO v_t1_id, v_p1_id FROM (
          SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed 
          FROM tournament_teams WHERE tournament_id = v_tournament.id
        ) s WHERE seed = v_i + 1;
        
        SELECT id, captain_id INTO v_t2_id, v_p2_id FROM (
          SELECT id, captain_id, row_number() OVER (ORDER BY created_at ASC) as seed 
          FROM tournament_teams WHERE tournament_id = v_tournament.id
        ) s WHERE seed = v_total_needed - v_i;

        IF v_t1_id IS NOT NULL AND v_t2_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, player2_id, team1_id, team2_id, 
            check_in_deadline, check_in_started_at, status
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, v_t1_id, v_t2_id, 
            v_check_in_deadline, v_tournament.start_time, 'pending'
          );

          -- Send pairing notifications to both captains
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES 
            (v_p1_id, 'Match Pairing Ready', 'Your match pairing for ' || v_tournament.name || ' is ready. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id),
            (v_p2_id, 'Match Pairing Ready', 'Your match pairing for ' || v_tournament.name || ' is ready. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id);
        ELSIF v_t1_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, team1_id, winner_id, status, admin_override
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_t1_id, v_p1_id, 'confirmed', true
          );
        END IF;
      END LOOP;

    ELSE
      -- Individual tournament logic
      WITH seeded_confirmed AS (
        SELECT id, user_id, gamertag, row_number() OVER (ORDER BY created_at ASC) as seed
        FROM tournament_participants
        WHERE tournament_id = v_tournament.id AND is_standby = false
        LIMIT v_tournament.max_players
      )
      UPDATE tournament_participants tp
      SET bracket_seed = sc.seed
      FROM seeded_confirmed sc
      WHERE tp.id = sc.id;

      SELECT count(*) INTO v_confirmed_count FROM tournament_participants 
      WHERE tournament_id = v_tournament.id AND bracket_seed IS NOT NULL;

      v_total_needed := v_tournament.max_players;
      v_check_in_deadline := v_tournament.start_time + interval '5 minutes';

      FOR v_i IN 0..(v_total_needed / 2 - 1) LOOP
        v_match_id := 'r1-m' || v_i;
        
        SELECT user_id, gamertag INTO v_p1_id, v_p1_gamertag 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND bracket_seed = v_i + 1;
        
        SELECT user_id, gamertag INTO v_p2_id, v_p2_gamertag 
        FROM tournament_participants 
        WHERE tournament_id = v_tournament.id AND bracket_seed = v_total_needed - v_i;

        IF v_p1_id IS NOT NULL AND v_p2_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, player2_id, 
            check_in_deadline, check_in_started_at, status
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p2_id, 
            v_check_in_deadline, v_tournament.start_time, 'pending'
          );

          -- Send pairing notifications
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES 
            (v_p1_id, 'Match Pairing Ready', 'You will face ' || COALESCE(v_p2_gamertag, 'opponent') || ' in ' || v_tournament.name || '. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id),
            (v_p2_id, 'Match Pairing Ready', 'You will face ' || COALESCE(v_p1_gamertag, 'opponent') || ' in ' || v_tournament.name || '. Check in when the tournament starts!', 'tournament', '/tournaments/' || v_tournament.id);
        ELSIF v_p1_id IS NOT NULL THEN
          INSERT INTO match_results (
            tournament_id, match_id, round, player1_id, winner_id, status, admin_override
          ) VALUES (
            v_tournament.id, v_match_id, 1, v_p1_id, v_p1_id, 'confirmed', true
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
