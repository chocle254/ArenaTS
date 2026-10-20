-- ============================================================================
-- Secure match reporting and official overrides
-- ============================================================================
-- Why
--   * admin_override_match() ran as the database owner with no checks: any
--     signed-in player could call it and award any match to anyone, passing
--     whatever "admin id" they liked.
--   * confirm_match_result() trusted the caller's player ids and report slot,
--     so one person could file both reports and confirm any winner.
--   * A referee (or admin) who is also playing in a match could use the
--     official override on their own match, which corrupted brackets.
--
-- What this does (same function signatures, so the app keeps working)
--   confirm_match_result: the caller must be one of the two players in the
--     match. Their report slot is worked out from who they are, the winner
--     must be one of the two players, and confirmed matches can't be changed.
--   admin_override_match: the caller must be an admin or a referee for the
--     tournament's game, must NOT be one of the players, and the winner must
--     be one of the players. The caller is recorded as the official.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_match_result(
  p_tournament_id uuid, p_match_id text, p_round integer,
  p_player1_id uuid, p_player2_id uuid, p_winner_id uuid,
  p_reported_by uuid, p_report_field text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row match_results%ROWTYPE;
  v_field text;
  v_other_report uuid;
  v_new_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_row FROM match_results
  WHERE tournament_id = p_tournament_id AND match_id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Older brackets may not have pre-created rows. Only the two named players,
    -- both registered in this tournament, may create one.
    IF v_uid NOT IN (p_player1_id, p_player2_id) OR p_player1_id IS NULL OR p_player2_id IS NULL OR p_player1_id = p_player2_id THEN
      RAISE EXCEPTION 'Only the players in this match can report its result' USING ERRCODE = '42501';
    END IF;
    IF (SELECT count(DISTINCT user_id) FROM tournament_participants
        WHERE tournament_id = p_tournament_id AND user_id IN (p_player1_id, p_player2_id)) < 2 THEN
      RAISE EXCEPTION 'Both players must be registered in this tournament' USING ERRCODE = '42501';
    END IF;
    INSERT INTO match_results (tournament_id, match_id, round, player1_id, player2_id, submitted_by, status)
    VALUES (p_tournament_id, p_match_id, p_round, p_player1_id, p_player2_id, v_uid, 'pending')
    RETURNING * INTO v_row;
  END IF;

  IF v_row.status = 'confirmed' THEN
    RAISE EXCEPTION 'This match is already decided';
  END IF;

  -- The report slot comes from who you are, never from the request
  IF v_uid = v_row.player1_id THEN
    v_field := 'player1_reported_winner';
    v_other_report := v_row.player2_reported_winner;
  ELSIF v_uid = v_row.player2_id THEN
    v_field := 'player2_reported_winner';
    v_other_report := v_row.player1_reported_winner;
  ELSE
    RAISE EXCEPTION 'Only the players in this match can report its result' USING ERRCODE = '42501';
  END IF;

  IF p_winner_id IS NULL OR p_winner_id NOT IN (v_row.player1_id, v_row.player2_id) THEN
    RAISE EXCEPTION 'The winner must be one of the two players';
  END IF;

  IF v_other_report IS NOT NULL THEN
    v_new_status := CASE WHEN v_other_report = p_winner_id THEN 'confirmed' ELSE 'disputed' END;
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE match_results
  SET player1_reported_winner = CASE WHEN v_field = 'player1_reported_winner' THEN p_winner_id ELSE player1_reported_winner END,
      player2_reported_winner = CASE WHEN v_field = 'player2_reported_winner' THEN p_winner_id ELSE player2_reported_winner END,
      submitted_by = v_uid,
      winner_id    = CASE WHEN v_new_status = 'confirmed' THEN p_winner_id ELSE winner_id END,
      status       = v_new_status,
      updated_at   = now()
  WHERE id = v_row.id;

  RETURN json_build_object(
    'status', v_new_status,
    'message', CASE
      WHEN v_new_status = 'confirmed' THEN 'Match confirmed. Winner advancing.'
      WHEN v_new_status = 'disputed'  THEN 'Results conflict. Dispute raised.'
      ELSE 'Result submitted. Waiting for opponent.'
    END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_override_match(
  p_tournament_id uuid, p_match_id text, p_round integer,
  p_player1_id uuid, p_player2_id uuid, p_winner_id uuid, p_admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_game game_type;
  v_status text;
  v_row match_results%ROWTYPE;
  v_p1 uuid;
  v_p2 uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT game, status::text INTO v_game, v_status FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  IF v_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This tournament is already finished';
  END IF;
  IF NOT public.is_referee(v_uid, v_game) THEN
    RAISE EXCEPTION 'Only admins and referees for this game can override results' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM match_results
  WHERE tournament_id = p_tournament_id AND match_id = p_match_id
  FOR UPDATE;

  -- Players come from the stored match when it exists
  v_p1 := COALESCE(v_row.player1_id, p_player1_id);
  v_p2 := COALESCE(v_row.player2_id, p_player2_id);

  IF v_uid IN (v_p1, v_p2) THEN
    RAISE EXCEPTION 'You are playing in this match, so another official has to decide it' USING ERRCODE = '42501';
  END IF;
  IF p_winner_id IS NULL OR p_winner_id NOT IN (v_p1, v_p2) THEN
    RAISE EXCEPTION 'The winner must be one of the two players';
  END IF;
  IF v_row.id IS NOT NULL AND v_row.status = 'confirmed' THEN
    RAISE EXCEPTION 'This match is already decided';
  END IF;

  IF v_row.id IS NULL THEN
    INSERT INTO match_results (tournament_id, match_id, round, player1_id, player2_id, winner_id, status, admin_override, submitted_by)
    VALUES (p_tournament_id, p_match_id, p_round, v_p1, v_p2, p_winner_id, 'pending', true, v_uid)
    RETURNING * INTO v_row;
  END IF;

  -- Confirm through an UPDATE so the advance_winner trigger fires
  UPDATE match_results
  SET winner_id = p_winner_id,
      status = 'confirmed',
      admin_override = true,
      submitted_by = v_uid,
      updated_at = now()
  WHERE id = v_row.id;

  RETURN json_build_object('status', 'confirmed', 'message', 'Official decision applied.');
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_match_result(uuid, text, integer, uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_override_match(uuid, text, integer, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_match_result(uuid, text, integer, uuid, uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_match(uuid, text, integer, uuid, uuid, uuid, uuid) TO authenticated;

-- ============================================================================
-- Guard direct writes to match_results
-- ============================================================================
-- The table's row rules let players (and referees) update a match row straight
-- from the app, which meant anyone could set status='confirmed' and make
-- themselves the winner without either function above. This trigger runs
-- first on every insert/update made by a signed-in user directly (calls from
-- the functions above, other server functions and cron run as the owner and
-- are not affected) and allows only what the app legitimately does:
--   players   : upload a screenshot, check in / mark ready for THEIR slot
--   officials : extend match time, reset a disputed match so players can
--               re-report, but never on a match they are playing in
-- Deciding a result always goes through confirm_match_result or
-- admin_override_match.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._is_match_official(p_uid uuid, p_tournament_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = p_tournament_id AND public.is_referee(p_uid, t.game)
  );
$$;
REVOKE ALL ON FUNCTION public._is_match_official(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._is_match_official(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_match_results_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_changed text[];
  v_allowed text[];
  v_is_player boolean;
  v_slot int;
  v_dispute_reset boolean := false;
BEGIN
  -- Only direct API writes are checked. Server functions run as the owner.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending'
       OR NEW.winner_id IS NOT NULL
       OR NEW.player1_reported_winner IS NOT NULL
       OR NEW.player2_reported_winner IS NOT NULL
       OR COALESCE(NEW.admin_override, false) THEN
      RAISE EXCEPTION 'Match results can only be reported through the match room' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(array_agg(n.key), '{}') INTO v_changed
  FROM jsonb_each(to_jsonb(NEW)) n
  WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
    AND n.key <> 'updated_at';

  IF cardinality(v_changed) = 0 THEN
    RETURN NEW;
  END IF;

  v_is_player := v_uid IN (OLD.player1_id, OLD.player2_id);
  v_slot := CASE WHEN v_uid = OLD.player1_id THEN 1 WHEN v_uid = OLD.player2_id THEN 2 END;

  IF v_is_player THEN
    -- A player acting on their own match, even if they are also a referee
    v_allowed := ARRAY['screenshot_url', 'submitted_by',
                       'player' || v_slot || '_checked_in',
                       'player' || v_slot || '_ready_at'];
    IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by AND NEW.submitted_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'You can only act as yourself' USING ERRCODE = '42501';
    END IF;
  ELSIF public._is_match_official(v_uid, OLD.tournament_id) THEN
    v_allowed := ARRAY['screenshot_url', 'submitted_by', 'match_deadline', 'time_extended_by_admin',
                       'check_in_deadline', 'match_duration_minutes'];
    v_dispute_reset := OLD.status = 'disputed' AND NEW.status = 'pending'
      AND NEW.winner_id IS NULL AND NEW.player1_reported_winner IS NULL
      AND NEW.player2_reported_winner IS NULL AND NOT COALESCE(NEW.admin_override, false);
    IF v_dispute_reset THEN
      v_allowed := v_allowed || ARRAY['status', 'winner_id', 'player1_reported_winner', 'player2_reported_winner', 'admin_override'];
    END IF;
  ELSE
    RAISE EXCEPTION 'You are not part of this match' USING ERRCODE = '42501';
  END IF;

  IF NOT (v_changed <@ v_allowed) THEN
    RAISE EXCEPTION 'Not allowed to change % on this match', array_to_string(ARRAY(SELECT unnest(v_changed) EXCEPT SELECT unnest(v_allowed)), ', ')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- "a_" so it runs before the other BEFORE triggers and sees only the caller's changes
CREATE OR REPLACE TRIGGER a_guard_match_results_write
  BEFORE INSERT OR UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.guard_match_results_write();

-- ============================================================================
-- Guard direct writes to challenges (quick matches)
-- ============================================================================
-- "Participants can update live challenges" let either player set
-- status='completed' and winner_id to themselves, which pays out the pot.
-- Allowed direct writes now:
--   challenger : cancel while pending
--   opponent   : accept or decline while pending
--   players    : check in, upload a screenshot, report their own result
--                (winner must be one of the two), cancel during a dispute
--   admins not playing in the match : settle (winner must be a player) or cancel
-- Completion still happens through the existing result trigger when both
-- reports agree, and payouts through the existing prize trigger.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_challenges_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_changed text[];
  v_allowed text[] := ARRAY[]::text[];
  v_is_challenger boolean;
  v_is_opponent boolean;
  v_is_admin boolean;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending' OR NEW.winner_id IS NOT NULL
       OR NEW.challenger_reported_winner IS NOT NULL OR NEW.opponent_reported_winner IS NOT NULL THEN
      RAISE EXCEPTION 'New challenges start as pending' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(array_agg(n.key), '{}') INTO v_changed
  FROM jsonb_each(to_jsonb(NEW)) n
  WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
    AND n.key <> 'updated_at';
  IF cardinality(v_changed) = 0 THEN
    RETURN NEW;
  END IF;

  v_is_challenger := v_uid = OLD.challenger_id;
  v_is_opponent := v_uid = OLD.opponent_id;
  v_is_admin := EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin');

  IF v_is_challenger OR v_is_opponent THEN
    IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by AND NEW.submitted_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'You can only act as yourself' USING ERRCODE = '42501';
    END IF;

    IF OLD.status = 'pending' THEN
      IF v_is_challenger AND NEW.status = 'cancelled' THEN
        v_allowed := ARRAY['status', 'submitted_by'];
      ELSIF v_is_opponent AND NEW.status IN ('accepted', 'declined') THEN
        v_allowed := ARRAY['status', 'accepted_at', 'submitted_by'];
      END IF;
    ELSIF OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
      v_allowed := ARRAY['submitted_by', 'screenshot_url',
                         CASE WHEN v_is_challenger THEN 'challenger_checked_in' ELSE 'opponent_checked_in' END,
                         CASE WHEN v_is_challenger THEN 'challenger_reported_winner' ELSE 'opponent_reported_winner' END];
      IF OLD.status IN ('disputed', 'disputed_warning') AND NEW.status = 'cancelled' THEN
        v_allowed := v_allowed || ARRAY['status', 'dispute_count'];
      END IF;
      IF (v_is_challenger AND NEW.challenger_reported_winner IS DISTINCT FROM OLD.challenger_reported_winner
            AND NEW.challenger_reported_winner IS NOT NULL AND NEW.challenger_reported_winner NOT IN (OLD.challenger_id, OLD.opponent_id))
         OR (v_is_opponent AND NEW.opponent_reported_winner IS DISTINCT FROM OLD.opponent_reported_winner
            AND NEW.opponent_reported_winner IS NOT NULL AND NEW.opponent_reported_winner NOT IN (OLD.challenger_id, OLD.opponent_id)) THEN
        RAISE EXCEPTION 'The winner must be one of the two players';
      END IF;
    END IF;
  ELSIF v_is_admin THEN
    IF OLD.status IN ('completed', 'cancelled', 'declined', 'expired') THEN
      RAISE EXCEPTION 'This match is already closed';
    END IF;
    IF NEW.status = 'completed' THEN
      IF NEW.winner_id IS NULL OR NEW.winner_id NOT IN (OLD.challenger_id, OLD.opponent_id) THEN
        RAISE EXCEPTION 'The winner must be one of the two players';
      END IF;
      v_allowed := ARRAY['status', 'winner_id', 'challenger_reported_winner', 'opponent_reported_winner', 'completed_at', 'submitted_by'];
    ELSIF NEW.status = 'cancelled' THEN
      v_allowed := ARRAY['status', 'submitted_by'];
    END IF;
  ELSE
    RAISE EXCEPTION 'You are not part of this match' USING ERRCODE = '42501';
  END IF;

  IF NOT (v_changed <@ v_allowed) THEN
    RAISE EXCEPTION 'Not allowed to change % on this match', array_to_string(ARRAY(SELECT unnest(v_changed) EXCEPT SELECT unnest(v_allowed)), ', ')
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER a_guard_challenges_write
  BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.guard_challenges_write();

-- ============================================================================
-- Guard direct writes to tournaments
-- ============================================================================
-- "Creators can update their tournaments" had no column limits: a creator
-- could raise prize_pool after paying the creation fee, feature their own
-- event, or set status='completed' with a winner, which triggers prize payout.
-- Creators may now only edit the wording (name, description, rules, banned
-- items, tie-break) while registration is open. Status, money, winners and
-- featuring are handled by server functions or by admins.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_tournaments_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_changed text[];
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'You can only create tournaments as yourself' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM 'open' OR COALESCE(NEW.featured, false) OR NEW.winner_id IS NOT NULL
       OR COALESCE(NEW.current_players, 0) <> 0 OR COALESCE(NEW.prizes_distributed, false)
       OR COALESCE(NEW.bracket_generated, false) OR NEW.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'New tournaments start open with no players' USING ERRCODE = '42501';
    END IF;
    IF COALESCE(NEW.platform_fee_percentage, 10) < 10 THEN
      RAISE EXCEPTION 'Platform fee cannot be lowered' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(array_agg(n.key), '{}') INTO v_changed
  FROM jsonb_each(to_jsonb(NEW)) n
  WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
    AND n.key <> 'updated_at';
  IF cardinality(v_changed) = 0 THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'This tournament can no longer be edited' USING ERRCODE = '42501';
  END IF;
  IF NOT (v_changed <@ ARRAY['name', 'description', 'rules', 'banned_items', 'tie_break_rules']) THEN
    RAISE EXCEPTION 'Not allowed to change % on this tournament', array_to_string(ARRAY(SELECT unnest(v_changed) EXCEPT SELECT unnest(ARRAY['name', 'description', 'rules', 'banned_items', 'tie_break_rules'])), ', ')
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER a_guard_tournaments_write
  BEFORE INSERT OR UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.guard_tournaments_write();
