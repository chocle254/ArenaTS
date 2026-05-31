-- ============================================================================
-- BRACKET GENERATION + ADVANCE WINNER (CORRECTED)
--
-- Root causes fixed here:
--
--   BUG A — Bye advancement before round 2 rows exist
--     The old code generated rounds sequentially: round 1 first, then
--     round 2, etc. Bye matches were inserted as status='confirmed'
--     immediately. If advance_winner fires on INSERT (or on the first
--     UPDATE), it tries to UPDATE a round 2 row that doesn't exist yet.
--     The UPDATE silently touches zero rows. The bye winner is NEVER
--     placed in round 2.
--     FIX: Two-pass generation. Pass 1 creates ALL placeholder rows
--     across ALL rounds. Pass 2 populates round 1 player slots and
--     manually advances bye winners — no trigger dependency needed
--     for the initial placement.
--
--   BUG B — check_in_deadline stays NULL for round 2+ matches
--     advance_winner used CASE WHEN player2_id IS NOT NULL inside the
--     same UPDATE that was SETTING player1_id. The CASE reads the OLD
--     value of player2_id before the SET takes effect, which is correct
--     — but the real issue is the first winner to arrive (e.g. bye winner
--     placed in Pass 2) leaves deadline=NULL because the other slot is
--     empty. When the second winner arrives, the CASE fires correctly IF
--     it can see player1_id — but this only works if the function reads
--     the current DB state before writing. FIX: SELECT the next match row
--     first, check the other slot, then UPDATE. This is unambiguous.
--
--   BUG C — advance_winner didn't fire for bye matches at all
--     Bye matches were INSERTed directly with status='confirmed'. The
--     advance_winner trigger is AFTER UPDATE, not AFTER INSERT, so it
--     never fired for byes. FIX: Pass 2 explicitly runs the advancement
--     logic inline for each bye — no trigger needed.
--
--   BUG D — Tournament completion was silently ignored
--     When the final match confirmed, advance_winner tried to go to
--     round num_rounds+1, found no rows, and did nothing. The tournament
--     stayed in status='active' forever.
--     FIX: advance_winner now detects the final round and updates the
--     tournaments row to status='completed' with winner_id.
--
-- NOTE: Your tournaments table must have these columns for completion:
--   winner_id   uuid  REFERENCES profiles(id)
--   completed_at timestamptz
-- Add them with:
--   ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES profiles(id);
--   ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completed_at timestamptz;
-- ============================================================================

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES profiles(id);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DROP FUNCTION IF EXISTS generate_tournament_bracket(uuid);

-- ── Bracket generation ────────────────────────────────────────────────────
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
        AND start_time <= now() + interval '15 minutes'
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
    -- All real round-1 matches share the same deadline (set at generation time)
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
    --
    -- Why: advance_winner is AFTER UPDATE — it never fires on INSERT.
    -- If round 2 rows don't exist when round 1 completes, the UPDATE
    -- inside advance_winner silently touches zero rows and the winner
    -- is lost. Creating all rows first guarantees the target always exists.
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
    --
    -- Bye matches (match_index < v_num_byes):
    --   - Immediately confirmed with the bye player as winner
    --   - Winner is placed directly into the round 2 slot (no trigger)
    --
    -- Real matches (match_index >= v_num_byes):
    --   - Both player IDs assigned
    --   - check_in_deadline set so the frontend shows the check-in UI
    -- ════════════════════════════════════════════════════════════════════
    v_matches_in_round := power(2, v_num_rounds - 1)::integer;

    FOR v_match_index IN 0..(v_matches_in_round - 1) LOOP
      v_match_id := 'r1-m' || v_match_index;
      v_p1_id := NULL; v_p2_id := NULL;
      v_t1_id := NULL; v_t2_id := NULL;

      IF v_match_index < v_num_byes THEN
        -- ────────────────────────────────────────────────────────────────
        -- BYE MATCH
        -- ────────────────────────────────────────────────────────────────
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

        -- Mark the bye match as confirmed with the bye player as winner
        UPDATE match_results
        SET player1_id     = v_p1_id,
            team1_id       = v_t1_id,
            winner_id      = v_p1_id,
            status         = 'confirmed',
            admin_override = true
        WHERE tournament_id = v_tournament.id AND match_id = v_match_id;

        -- Advance bye winner directly into round 2 (bypass trigger)
        v_next_match_number := v_match_index / 2;
        v_next_match_id     := 'r2-m' || v_next_match_number;

        IF v_match_index % 2 = 0 THEN
          -- Even index → player1 slot in next match
          UPDATE match_results
          SET player1_id         = v_p1_id,
              team1_id           = v_t1_id,
              player1_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        ELSE
          -- Odd index → player2 slot in next match
          UPDATE match_results
          SET player2_id         = v_p1_id,
              team2_id           = v_t1_id,
              player2_checked_in = false
          WHERE tournament_id = v_tournament.id AND match_id = v_next_match_id;
        END IF;

      ELSE
        -- ────────────────────────────────────────────────────────────────
        -- REAL MATCH
        -- Seeding: after all bye slots, pair remaining players sequentially.
        -- match_index=num_byes   → seeds (num_byes+1) vs (num_byes+2)
        -- match_index=num_byes+1 → seeds (num_byes+3) vs (num_byes+4)
        -- etc.
        -- ────────────────────────────────────────────────────────────────
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
    -- PASS 3: Set deadlines for round 2 matches that are fully populated
    --         by byes (e.g. 5 players → seeds 1 & 2 both get byes and
    --         both land in r2-m0 — that match can start immediately).
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


-- ── Advance winner trigger ────────────────────────────────────────────────
--
-- Fires AFTER a match transitions to status='confirmed' with a winner.
-- Places the winner into the correct slot of the next round match and,
-- if the other slot is already filled, sets the check-in deadline so
-- the frontend immediately shows the check-in UI to both players.
--
-- FIX: We SELECT the next match row BEFORE updating it. This lets us
-- read the current value of the other player's slot without any
-- ambiguity from the CASE expression reading stale data.
--
CREATE OR REPLACE FUNCTION advance_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_number      integer;
  v_next_round        integer;
  v_next_match_number integer;
  v_next_match_id     text;
  v_num_rounds        integer;
  v_tournament_mode   text;
  v_winner_team_id    uuid;
  v_next_match        match_results%ROWTYPE;
  v_other_player_id   uuid;
BEGIN
  -- Only act when a match transitions to confirmed WITH a winner
  -- (double no-show produces winner_id=NULL — handled separately)
  IF NEW.status != 'confirmed'
     OR OLD.status = 'confirmed'
     OR NEW.winner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Parse match number from 'r{round}-m{number}'
  v_match_number      := SUBSTRING(NEW.match_id FROM 'm(\d+)$')::integer;
  v_next_round        := NEW.round + 1;
  v_next_match_number := v_match_number / 2;
  v_next_match_id     := 'r' || v_next_round || '-m' || v_next_match_number;

  SELECT num_rounds, mode
  INTO v_num_rounds, v_tournament_mode
  FROM tournaments
  WHERE id = NEW.tournament_id;

  -- ── Tournament complete ──────────────────────────────────────────────────
  IF v_next_round > v_num_rounds THEN
    -- This was the grand final — crown the winner
    UPDATE tournaments
    SET status       = 'completed',
        winner_id    = NEW.winner_id,
        completed_at = now()
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  END IF;

  -- ── Resolve winner's team (team mode only) ───────────────────────────────
  IF v_tournament_mode = 'team' THEN
    SELECT team_id INTO v_winner_team_id
    FROM tournament_participants
    WHERE tournament_id = NEW.tournament_id
      AND user_id = NEW.winner_id
    LIMIT 1;
  END IF;

  -- ── Read current state of the next match ────────────────────────────────
  -- We do this BEFORE the UPDATE so we can see whether the other slot
  -- already has a player. This is the fix for the deadline-stays-NULL bug.
  SELECT * INTO v_next_match
  FROM match_results
  WHERE tournament_id = NEW.tournament_id
    AND match_id      = v_next_match_id;

  IF NOT FOUND THEN
    -- Should never happen after the two-pass generation, but guard anyway
    RAISE WARNING 'advance_winner: target match % not found for tournament %',
      v_next_match_id, NEW.tournament_id;
    RETURN NEW;
  END IF;

  -- ── Place winner and conditionally activate check-in ─────────────────────
  IF v_match_number % 2 = 0 THEN
    -- Even match → winner fills player1 slot
    -- Deadline activates if player2 is already waiting
    v_other_player_id := v_next_match.player2_id;

    UPDATE match_results
    SET player1_id         = NEW.winner_id,
        team1_id           = v_winner_team_id,
        player1_checked_in = false,
        both_players_ready = false,
        check_in_deadline  = CASE
                               WHEN v_other_player_id IS NOT NULL
                               THEN now() + interval '5 minutes'
                               ELSE check_in_deadline   -- keep NULL until both slots filled
                             END
    WHERE tournament_id = NEW.tournament_id
      AND match_id      = v_next_match_id;

  ELSE
    -- Odd match → winner fills player2 slot
    -- Deadline activates if player1 is already waiting
    v_other_player_id := v_next_match.player1_id;

    UPDATE match_results
    SET player2_id         = NEW.winner_id,
        team2_id           = v_winner_team_id,
        player2_checked_in = false,
        both_players_ready = false,
        check_in_deadline  = CASE
                               WHEN v_other_player_id IS NOT NULL
                               THEN now() + interval '5 minutes'
                               ELSE check_in_deadline
                             END
    WHERE tournament_id = NEW.tournament_id
      AND match_id      = v_next_match_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (AFTER UPDATE only — byes are handled
-- inline in generate_tournament_brackets, not via this trigger)
DROP TRIGGER IF EXISTS trg_advance_winner ON match_results;
CREATE TRIGGER trg_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner();
