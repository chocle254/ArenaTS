
CREATE OR REPLACE FUNCTION initialize_tournament_bracket()
RETURNS trigger AS $$
DECLARE
  v_confirmed_count integer;
  v_total_needed integer;
  v_i integer;
  v_p1_id uuid;
  v_p2_id uuid;
  v_check_in_deadline timestamptz;
  v_match_id text;
BEGIN
  -- Only run when status changes to 'active'
  IF NEW.status = 'active' AND OLD.status = 'open' THEN
    -- 1. Assign seeds to confirmed players
    WITH seeded_confirmed AS (
      SELECT id, row_number() OVER (ORDER BY created_at ASC) as seed
      FROM tournament_participants
      WHERE tournament_id = NEW.id AND is_standby = false
      LIMIT NEW.max_players
    )
    UPDATE tournament_participants tp
    SET bracket_seed = sc.seed
    FROM seeded_confirmed sc
    WHERE tp.id = sc.id;

    -- 2. Count how many confirmed players we have
    SELECT count(*) INTO v_confirmed_count FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed IS NOT NULL;

    -- 3. If we have fewer than max_players, try to pull from standby
    IF v_confirmed_count < NEW.max_players THEN
      WITH seeded_standby AS (
        SELECT id, row_number() OVER (ORDER BY created_at ASC) + v_confirmed_count as seed
        FROM tournament_participants
        WHERE tournament_id = NEW.id AND is_standby = true
        LIMIT (NEW.max_players - v_confirmed_count)
      )
      UPDATE tournament_participants tp
      SET bracket_seed = ss.seed,
          is_standby = false
      FROM seeded_standby ss
      WHERE tp.id = ss.id;
    END IF;

    -- 4. Re-calculate count
    SELECT count(*) INTO v_confirmed_count FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed IS NOT NULL;

    -- 5. Create Round 1 Matches
    v_total_needed := NEW.max_players;
    v_check_in_deadline := now() + interval '5 minutes';

    FOR v_i IN 0..( (v_total_needed + 1) / 2 - 1 ) LOOP
      v_match_id := 'r1-m' || v_i;
      
      -- Get player 1 (seed v_i + 1)
      SELECT user_id INTO v_p1_id FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_i + 1;
      -- Get player 2 (seed v_total_needed - v_i)
      SELECT user_id INTO v_p2_id FROM tournament_participants WHERE tournament_id = NEW.id AND bracket_seed = v_total_needed - v_i;

      IF v_p1_id IS NOT NULL AND v_p2_id IS NOT NULL AND v_p1_id != v_p2_id THEN
        -- Normal match
        INSERT INTO match_results (
          tournament_id, match_id, round, player1_id, player2_id, check_in_deadline, status
        ) VALUES (
          NEW.id, v_match_id, 1, v_p1_id, v_p2_id, v_check_in_deadline, 'pending'
        ) ON CONFLICT (tournament_id, match_id) DO UPDATE SET
          player1_id = EXCLUDED.player1_id,
          player2_id = EXCLUDED.player2_id,
          check_in_deadline = EXCLUDED.check_in_deadline;
      ELSIF v_p1_id IS NOT NULL THEN
        -- Bye for player 1
        INSERT INTO match_results (
          tournament_id, match_id, round, player1_id, winner_id, status, admin_override
        ) VALUES (
          NEW.id, v_match_id, 1, v_p1_id, v_p1_id, 'confirmed', true
        ) ON CONFLICT (tournament_id, match_id) DO UPDATE SET
          player1_id = EXCLUDED.player1_id,
          winner_id = EXCLUDED.winner_id,
          status = EXCLUDED.status;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
