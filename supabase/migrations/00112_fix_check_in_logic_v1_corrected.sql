-- migration: fix_check_in_logic_v1_corrected

-- ── Per-match check-in timeout handler ───────────────────────────────────
CREATE OR REPLACE FUNCTION handle_match_check_in_timeout(p_match_result_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match  match_results%ROWTYPE;
  v_winner uuid;
  v_loser  uuid;
BEGIN
  -- Lock the row so concurrent cron calls don't double-process
  SELECT * INTO v_match
  FROM match_results
  WHERE id = p_match_result_id
  FOR UPDATE SKIP LOCKED;

  -- Row locked by another call or not found — skip
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Guards ─────────────────────────────────────────────────────────────
  -- Already resolved
  IF v_match.status = 'confirmed' THEN RETURN; END IF;

  -- Both already checked in — the ready trigger should have handled this
  IF COALESCE(v_match.player1_checked_in, false)
     AND COALESCE(v_match.player2_checked_in, false) THEN
    RETURN;
  END IF;

  -- Deadline hasn't arrived yet (safe to call early)
  IF v_match.check_in_deadline IS NULL
     OR v_match.check_in_deadline > now() THEN
    RETURN;
  END IF;

  -- ── Determine winner by check-in state ────────────────────────────────
  IF COALESCE(v_match.player1_checked_in, false)
     AND NOT COALESCE(v_match.player2_checked_in, false) THEN
    -- Player 1 showed up; Player 2 no-showed
    v_winner := v_match.player1_id;
    v_loser  := v_match.player2_id;
  ELSIF NOT COALESCE(v_match.player1_checked_in, false)
        AND COALESCE(v_match.player2_checked_in, false) THEN
    -- Player 2 showed up; Player 1 no-showed
    v_winner := v_match.player2_id;
    v_loser  := v_match.player1_id;
  ELSE
    -- Neither showed up — both eliminated, no winner propagates
    v_winner := NULL;
    v_loser  := NULL;
  END IF;

  -- ── Confirm the match ─────────────────────────────────────────────────
  -- Setting status = 'confirmed' fires the advance_winner trigger (00107)
  -- which places the winner into the next round automatically.
  UPDATE match_results
  SET status        = 'confirmed',
      winner_id     = v_winner,
      admin_override = true,
      updated_at    = now()
  WHERE id = p_match_result_id;

  -- ── Eliminate losers from tournament_participants ─────────────────────
  IF v_winner IS NOT NULL THEN
    -- Single no-show: eliminate the loser
    UPDATE tournament_participants
    SET eliminated = true
    WHERE tournament_id = v_match.tournament_id
      AND user_id = v_loser;
  ELSE
    -- Double no-show: eliminate both
    UPDATE tournament_participants
    SET eliminated = true
    WHERE tournament_id = v_match.tournament_id
      AND user_id IN (v_match.player1_id, v_match.player2_id);
  END IF;
END;
$$;

-- ── Match-start trigger: fires when both players are ready ────────────────
CREATE OR REPLACE FUNCTION handle_both_players_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when transitioning from not-ready to both-ready
  IF COALESCE(NEW.player1_checked_in, false)
     AND COALESCE(NEW.player2_checked_in, false)
     AND NOT COALESCE(OLD.both_players_ready, false) THEN
    NEW.both_players_ready := true;
    NEW.match_started_at   := now();
    -- Grace period: match must be reported within match_duration_minutes
    NEW.match_deadline     := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
  END IF;
  RETURN NEW;
END;
$$;

-- Re-create trigger WITHOUT a WHEN clause
DROP TRIGGER IF EXISTS trg_both_players_ready ON match_results;
CREATE TRIGGER trg_both_players_ready
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION handle_both_players_ready();
