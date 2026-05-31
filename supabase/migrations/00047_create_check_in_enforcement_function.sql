-- Function to handle check-in timeouts and spectator replacement
CREATE OR REPLACE FUNCTION enforce_check_in_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match record;
  v_spectator record;
  v_new_deadline timestamptz;
  v_tournament record;
BEGIN
  -- Find matches where check-in deadline has passed and not both players checked in
  FOR v_match IN 
    SELECT mr.*, t.name as tournament_name, t.team_size
    FROM match_results mr
    JOIN tournaments t ON t.id = mr.tournament_id
    WHERE mr.status = 'pending'
      AND mr.check_in_deadline < now()
      AND NOT (COALESCE(mr.player1_checked_in, false) AND COALESCE(mr.player2_checked_in, false))
      AND mr.replacement_count < 3  -- Limit replacements to prevent infinite loops
  LOOP
    SELECT * INTO v_tournament FROM tournaments WHERE id = v_match.tournament_id;

    -- Case 1: Both players didn't check in
    IF NOT COALESCE(v_match.player1_checked_in, false) AND NOT COALESCE(v_match.player2_checked_in, false) THEN
      -- Try to find 2 spectators
      IF v_tournament.team_size > 1 THEN
        -- Team tournament - need 2 teams from standby
        DECLARE
          v_team1 record;
          v_team2 record;
        BEGIN
          SELECT tt.id, tt.captain_id INTO v_team1
          FROM tournament_teams tt
          WHERE tt.tournament_id = v_match.tournament_id
            AND NOT EXISTS (
              SELECT 1 FROM match_results mr2 
              WHERE mr2.tournament_id = v_match.tournament_id 
                AND (mr2.team1_id = tt.id OR mr2.team2_id = tt.id)
                AND mr2.status != 'confirmed'
            )
          LIMIT 1;

          SELECT tt.id, tt.captain_id INTO v_team2
          FROM tournament_teams tt
          WHERE tt.tournament_id = v_match.tournament_id
            AND tt.id != v_team1.id
            AND NOT EXISTS (
              SELECT 1 FROM match_results mr2 
              WHERE mr2.tournament_id = v_match.tournament_id 
                AND (mr2.team1_id = tt.id OR mr2.team2_id = tt.id)
                AND mr2.status != 'confirmed'
            )
          LIMIT 1;

          IF v_team1.id IS NOT NULL AND v_team2.id IS NOT NULL THEN
            v_new_deadline := now() + interval '5 minutes';
            UPDATE match_results
            SET player1_id = v_team1.captain_id,
                player2_id = v_team2.captain_id,
                team1_id = v_team1.id,
                team2_id = v_team2.id,
                player1_checked_in = false,
                player2_checked_in = false,
                check_in_deadline = v_new_deadline,
                replacement_count = v_match.replacement_count + 1
            WHERE id = v_match.id;

            -- Notify new teams
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES 
              (v_team1.captain_id, 'Match Assignment', 'Your team has been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id),
              (v_team2.captain_id, 'Match Assignment', 'Your team has been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
          ELSE
            -- Not enough teams, mark match as no contest
            UPDATE match_results
            SET status = 'confirmed',
                winner_id = NULL,
                admin_override = true
            WHERE id = v_match.id;
          END IF;
        END;
      ELSE
        -- Individual tournament - need 2 spectators
        DECLARE
          v_spec1 record;
          v_spec2 record;
        BEGIN
          SELECT tp.user_id, tp.gamertag, tp.id as participant_id INTO v_spec1
          FROM tournament_participants tp
          WHERE tp.tournament_id = v_match.tournament_id
            AND tp.is_standby = true
            AND tp.spectator_assigned = false
          ORDER BY tp.created_at ASC
          LIMIT 1;

          SELECT tp.user_id, tp.gamertag, tp.id as participant_id INTO v_spec2
          FROM tournament_participants tp
          WHERE tp.tournament_id = v_match.tournament_id
            AND tp.is_standby = true
            AND tp.spectator_assigned = false
            AND tp.user_id != v_spec1.user_id
          ORDER BY tp.created_at ASC
          LIMIT 1;

          IF v_spec1.user_id IS NOT NULL AND v_spec2.user_id IS NOT NULL THEN
            v_new_deadline := now() + interval '5 minutes';
            UPDATE match_results
            SET player1_id = v_spec1.user_id,
                player2_id = v_spec2.user_id,
                player1_checked_in = false,
                player2_checked_in = false,
                check_in_deadline = v_new_deadline,
                replacement_count = v_match.replacement_count + 1
            WHERE id = v_match.id;

            UPDATE tournament_participants
            SET spectator_assigned = true
            WHERE id IN (v_spec1.participant_id, v_spec2.participant_id);

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES 
              (v_spec1.user_id, 'Match Assignment', 'You have been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id),
              (v_spec2.user_id, 'Match Assignment', 'You have been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
          ELSE
            -- Not enough spectators, mark as no contest
            UPDATE match_results
            SET status = 'confirmed',
                winner_id = NULL,
                admin_override = true
            WHERE id = v_match.id;
          END IF;
        END;
      END IF;

    -- Case 2: Only player1 checked in
    ELSIF COALESCE(v_match.player1_checked_in, false) AND NOT COALESCE(v_match.player2_checked_in, false) THEN
      IF v_tournament.team_size > 1 THEN
        -- Find replacement team
        DECLARE
          v_new_team record;
        BEGIN
          SELECT tt.id, tt.captain_id INTO v_new_team
          FROM tournament_teams tt
          WHERE tt.tournament_id = v_match.tournament_id
            AND tt.id != v_match.team1_id
            AND NOT EXISTS (
              SELECT 1 FROM match_results mr2 
              WHERE mr2.tournament_id = v_match.tournament_id 
                AND (mr2.team1_id = tt.id OR mr2.team2_id = tt.id)
                AND mr2.status != 'confirmed'
            )
          LIMIT 1;

          IF v_new_team.id IS NOT NULL THEN
            v_new_deadline := now() + interval '5 minutes';
            UPDATE match_results
            SET player2_id = v_new_team.captain_id,
                team2_id = v_new_team.id,
                player2_checked_in = false,
                check_in_deadline = v_new_deadline,
                replacement_count = v_match.replacement_count + 1
            WHERE id = v_match.id;

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (v_new_team.captain_id, 'Match Assignment', 'Your team has been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
          ELSE
            -- No replacement, player1 advances
            UPDATE match_results
            SET status = 'confirmed',
                winner_id = v_match.player1_id,
                admin_override = true
            WHERE id = v_match.id;
          END IF;
        END;
      ELSE
        -- Find replacement player
        SELECT tp.user_id, tp.gamertag, tp.id as participant_id INTO v_spectator
        FROM tournament_participants tp
        WHERE tp.tournament_id = v_match.tournament_id
          AND tp.is_standby = true
          AND tp.spectator_assigned = false
        ORDER BY tp.created_at ASC
        LIMIT 1;

        IF v_spectator.user_id IS NOT NULL THEN
          v_new_deadline := now() + interval '5 minutes';
          UPDATE match_results
          SET player2_id = v_spectator.user_id,
              player2_checked_in = false,
              check_in_deadline = v_new_deadline,
              replacement_count = v_match.replacement_count + 1
          WHERE id = v_match.id;

          UPDATE tournament_participants
          SET spectator_assigned = true
          WHERE id = v_spectator.participant_id;

          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (v_spectator.user_id, 'Match Assignment', 'You have been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
        ELSE
          -- No spectator, player1 advances
          UPDATE match_results
          SET status = 'confirmed',
              winner_id = v_match.player1_id,
              admin_override = true
          WHERE id = v_match.id;
        END IF;
      END IF;

    -- Case 3: Only player2 checked in
    ELSIF NOT COALESCE(v_match.player1_checked_in, false) AND COALESCE(v_match.player2_checked_in, false) THEN
      IF v_tournament.team_size > 1 THEN
        DECLARE
          v_new_team record;
        BEGIN
          SELECT tt.id, tt.captain_id INTO v_new_team
          FROM tournament_teams tt
          WHERE tt.tournament_id = v_match.tournament_id
            AND tt.id != v_match.team2_id
            AND NOT EXISTS (
              SELECT 1 FROM match_results mr2 
              WHERE mr2.tournament_id = v_match.tournament_id 
                AND (mr2.team1_id = tt.id OR mr2.team2_id = tt.id)
                AND mr2.status != 'confirmed'
            )
          LIMIT 1;

          IF v_new_team.id IS NOT NULL THEN
            v_new_deadline := now() + interval '5 minutes';
            UPDATE match_results
            SET player1_id = v_new_team.captain_id,
                team1_id = v_new_team.id,
                player1_checked_in = false,
                check_in_deadline = v_new_deadline,
                replacement_count = v_match.replacement_count + 1
            WHERE id = v_match.id;

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (v_new_team.captain_id, 'Match Assignment', 'Your team has been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
          ELSE
            UPDATE match_results
            SET status = 'confirmed',
                winner_id = v_match.player2_id,
                admin_override = true
            WHERE id = v_match.id;
          END IF;
        END;
      ELSE
        SELECT tp.user_id, tp.gamertag, tp.id as participant_id INTO v_spectator
        FROM tournament_participants tp
        WHERE tp.tournament_id = v_match.tournament_id
          AND tp.is_standby = true
          AND tp.spectator_assigned = false
        ORDER BY tp.created_at ASC
        LIMIT 1;

        IF v_spectator.user_id IS NOT NULL THEN
          v_new_deadline := now() + interval '5 minutes';
          UPDATE match_results
          SET player1_id = v_spectator.user_id,
              player1_checked_in = false,
              check_in_deadline = v_new_deadline,
              replacement_count = v_match.replacement_count + 1
          WHERE id = v_match.id;

          UPDATE tournament_participants
          SET spectator_assigned = true
          WHERE id = v_spectator.participant_id;

          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (v_spectator.user_id, 'Match Assignment', 'You have been assigned to a match in ' || v_match.tournament_name || '. Check in now!', 'tournament', '/tournaments/' || v_match.tournament_id);
        ELSE
          UPDATE match_results
          SET status = 'confirmed',
              winner_id = v_match.player2_id,
              admin_override = true
          WHERE id = v_match.id;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;
