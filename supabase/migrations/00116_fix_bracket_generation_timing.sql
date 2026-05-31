-- Update generate_tournament_brackets to only generate at or after start_time
CREATE OR REPLACE FUNCTION generate_tournament_brackets(p_tournament_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament          record;
  v_n                   integer;
  v_num_rounds          integer;
  v_bracket_size        integer;
  v_num_byes            integer;
  v_matches_in_round    integer;
  v_match_index         integer;
  v_match_id            text;
  v_round               integer;
  v_seed1               integer;
  v_seed2               integer;
  v_p1_id               uuid;
  v_p2_id               uuid;
  v_t1_id               uuid;
  v_t2_id               uuid;
  v_check_in_deadline   timestamptz;
  v_next_match_number   integer;
  v_next_match_id       text;
BEGIN
  FOR v_tournament IN
    SELECT * FROM tournaments
    WHERE
      (
        p_tournament_id IS NULL
        AND status = 'open'
        AND bracket_generated = false
        AND start_time <= now() -- Changed from now() + interval '15 minutes'
        AND current_players >= min_participants
      )
      OR
      (
        p_tournament_id IS NOT NULL
        AND id = p_tournament_id
        AND bracket_generated = false
      )
  LOOP

    -- ── 1. Count eligible entities ───────────────────────────────────────
    IF v_tournament.mode = 'team' THEN
      SELECT count(*) INTO v_n
      FROM tournament_teams
      WHERE tournament_id = v_tournament.id;
    ELSE
      SELECT count(*) INTO v_n
      FROM tournament_participants
      WHERE tournament_id = v_tournament.id AND is_standby = false;
    END IF;

    IF v_n < 2 THEN CONTINUE; END IF;

    -- ── 2. Bracket math ──────────────────────────────────────────────────
    v_num_rounds   := ceil(log(2, v_n::numeric))::integer;
    v_bracket_size := power(2, v_num_rounds)::integer;
    v_num_byes     := v_bracket_size - v_n;
    
    -- The ready check deadline is now() + 5 minutes. 
    -- Since we only generate the bracket at start_time, this will be start_time + 5 mins.
    v_check_in_deadline := now() + interval '5 minutes';

    -- ── 3. Mark tournament active ────────────────────────────────────────
    UPDATE tournaments
    SET bracket_generated     = true,
        bracket_generated_at  = now(),
        status                = 'active',
        num_rounds            = v_num_rounds
    WHERE id = v_tournament.id;

    -- ── 4. Assign bracket seeds ──────────────────────────────────────────
    IF v_tournament.mode != 'team' THEN
      UPDATE tournament_participants SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_participants
        WHERE tournament_id = v_tournament.id AND is_standby = false
      )
      UPDATE tournament_participants tp
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tp.id = seeded.id;

    ELSE
      UPDATE tournament_teams SET bracket_seed = NULL
      WHERE tournament_id = v_tournament.id;

      WITH seeded AS (
        SELECT id,
               row_number() OVER (ORDER BY created_at ASC) AS new_seed
        FROM tournament_teams
        WHERE tournament_id = v_tournament.id
      )
      UPDATE tournament_teams tt
      SET bracket_seed = seeded.new_seed
      FROM seeded WHERE tt.id = seeded.id;
    END IF;

    -- ── 5. Wipe any previous match data ──────────────────────────────────
    DELETE FROM match_results WHERE tournament_id = v_tournament.id;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 1: Insert ALL placeholder rows for every round upfront.
    -- ════════════════════════════════════════════════════════════════════
    FOR v_round IN 1..v_num_rounds LOOP
      v_matches_in_round := power(2, v_num_rounds - v_round)::integer;

      FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
        INSERT INTO match_results (
          tournament_id,
          match_id,
          round,
          status,
          match_duration_minutes,
          both_players_ready,
          player1_checked_in,
          player2_checked_in
        ) VALUES (
          v_tournament.id,
          'r' || v_round || '-m' || v_match_index,
          v_round,
          'pending',
          COALESCE(v_tournament.match_time_limit, 30),
          false,
          false,
          false
        );
      END LOOP;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 2: Populate round 1 matches with real player assignments.
    -- ════════════════════════════════════════════════════════════════════
    v_matches_in_round := power(2, v_num_rounds - 1)::integer;

    FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
      v_match_id := 'r1-m' || v_match_index;
      v_p1_id := NULL; v_p2_id := NULL;
      v_t1_id := NULL; v_t2_id := NULL;

      IF v_match_index < v_num_byes THEN
        -- BYE MATCH
        v_seed1 := v_match_index + 1;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;
        END IF;

        UPDATE match_results
        SET player1_id     = v_p1_id,
            team1_id       = v_t1_id,
            winner_id      = v_p1_id,
            status         = 'confirmed',
            admin_override = true
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;

        v_next_match_number := v_match_index / 2;
        v_next_match_id     := 'r2-m' || v_next_match_number;

        IF v_match_index % 2 = 0 THEN
          UPDATE match_results
          SET player1_id         = v_p1_id,
              team1_id           = v_t1_id,
              player1_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        ELSE
          UPDATE match_results
          SET player2_id         = v_p1_id,
              team2_id           = v_t1_id,
              player2_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        END IF;

      ELSE
        -- REAL MATCH
        v_seed1 := v_num_byes + (v_match_index - v_num_byes) * 2 + 1;
        v_seed2 := v_num_byes + (v_match_index - v_num_byes) * 2 + 2;

        IF v_tournament.mode = 'team' THEN
          SELECT captain_id, id INTO v_p1_id, v_t1_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;

          SELECT captain_id, id INTO v_p2_id, v_t2_id
          FROM tournament_teams
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        ELSE
          SELECT user_id INTO v_p1_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed1;

          SELECT user_id INTO v_p2_id
          FROM tournament_participants
          WHERE tournament_id = v_tournament.id AND bracket_seed = v_seed2;
        END IF;

        UPDATE match_results
        SET player1_id         = v_p1_id,
            player2_id         = v_p2_id,
            team1_id           = v_t1_id,
            team2_id           = v_t2_id,
            check_in_deadline  = v_check_in_deadline,
            player1_checked_in = false,
            player2_checked_in = false
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;
      END IF;
    END LOOP;

    -- ════════════════════════════════════════════════════════════════════
    -- PASS 3: Set deadlines for round 2 matches fully populated by byes
    -- ════════════════════════════════════════════════════════════════════
    UPDATE match_results
    SET check_in_deadline  = v_check_in_deadline,
        player1_checked_in = COALESCE(player1_checked_in, false),
        player2_checked_in = COALESCE(player2_checked_in, false)
    WHERE tournament_id    = v_tournament.id
      AND round            = 2
      AND player1_id       IS NOT NULL
      AND player2_id       IS NOT NULL
      AND check_in_deadline IS NULL
      AND status           = 'pending';

  END LOOP;
END;
$$;
