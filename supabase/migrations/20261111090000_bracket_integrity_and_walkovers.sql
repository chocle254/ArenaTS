-- Bracket integrity + tournaments that can't get stuck.
--
-- 1. Players can no longer create match rows. Brackets pre-create every match,
--    but confirm_match_result (and a direct INSERT) let any two participants
--    invent a match such as 'r2-m9' in the final round, both report the same
--    winner, and advance_winner then crowned them and paid the prize.
-- 2. Walkovers: when a match ends with nobody advancing (double no-show), the
--    player waiting in the next round used to wait forever. The minute sweep
--    now gives them the win, and empty matches close so the bracket finishes.
-- 3. Matches that started but never got both reports go to the dispute flow
--    10 minutes after the play timer runs out, instead of hanging.

SET LOCAL lock_timeout = '5s';

-- 1a. Report a result only on a match the bracket created
CREATE OR REPLACE FUNCTION public.confirm_match_result(p_tournament_id uuid, p_match_id text, p_round integer, p_player1_id uuid, p_player2_id uuid, p_winner_id uuid, p_reported_by uuid, p_report_field text)
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
    RAISE EXCEPTION 'This match isn''t in the bracket yet' USING ERRCODE = '42501';
  END IF;

  IF v_row.status = 'confirmed' THEN
    RAISE EXCEPTION 'This match is already decided';
  END IF;

  IF v_uid = v_row.player1_id THEN
    v_field := 'player1_reported_winner';
    v_other_report := v_row.player2_reported_winner;
  ELSIF v_uid = v_row.player2_id THEN
    v_field := 'player2_reported_winner';
    v_other_report := v_row.player1_reported_winner;
  ELSE
    RAISE EXCEPTION 'Only the players in this match can report its result' USING ERRCODE = '42501';
  END IF;

  IF v_row.player1_id IS NULL OR v_row.player2_id IS NULL THEN
    RAISE EXCEPTION 'Your opponent isn''t decided yet';
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

-- 1b. Only admins may insert match rows directly
CREATE OR REPLACE FUNCTION public.guard_match_results_write()
 RETURNS trigger
 LANGUAGE plpgsql
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
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.has_role(v_uid, 'admin') THEN
      RAISE EXCEPTION 'Matches are created by the bracket' USING ERRCODE = '42501';
    END IF;
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

-- 2 + 3. Keep brackets moving
CREATE OR REPLACE FUNCTION public._resolve_stuck_matches()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  n int := 0;
  v_pass int := 0;
  v_changed boolean := true;
BEGIN
  -- Walkovers. Both feeder matches are decided but a slot is still empty, so
  -- nobody else can ever arrive. One player waiting: they win. Nobody: the
  -- match closes empty. Repeat so a walkover can roll into the next round.
  WHILE v_changed AND v_pass < 12 LOOP
    v_changed := false;
    v_pass := v_pass + 1;
    FOR r IN
      SELECT m.id, COALESCE(m.player1_id, m.player2_id) AS lone
      FROM match_results m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE t.status = 'active'
        AND m.status = 'pending'
        AND m.round > 1
        AND (m.player1_id IS NULL OR m.player2_id IS NULL)
        AND (
          SELECT count(*) FROM match_results f
          WHERE f.tournament_id = m.tournament_id
            AND f.status = 'confirmed'
            AND f.match_id IN (
              'r' || (m.round - 1) || '-m' || (2 * substring(m.match_id FROM 'm(\d+)$')::int),
              'r' || (m.round - 1) || '-m' || (2 * substring(m.match_id FROM 'm(\d+)$')::int + 1))
        ) = 2
      FOR UPDATE OF m SKIP LOCKED
    LOOP
      UPDATE match_results
      SET winner_id = r.lone, status = 'confirmed', admin_override = true, updated_at = now()
      WHERE id = r.id AND status = 'pending';
      IF r.lone IS NOT NULL THEN
        PERFORM create_notification(r.lone, 'match', 'You advance', 'Your opponent didn''t show up, so you move on to the next round.', '/tournaments/' || (SELECT tournament_id FROM match_results WHERE id = r.id));
      END IF;
      n := n + 1;
      v_changed := true;
    END LOOP;
  END LOOP;

  -- Started but not fully reported 10 minutes after the play timer: hand it to
  -- the dispute flow (evidence, AI referee, then a human) instead of hanging.
  UPDATE match_results m
  SET status = 'disputed', updated_at = now()
  FROM tournaments t
  WHERE t.id = m.tournament_id
    AND t.status = 'active'
    AND m.status = 'pending'
    AND m.both_players_ready
    AND m.player1_id IS NOT NULL AND m.player2_id IS NOT NULL
    AND m.match_deadline IS NOT NULL
    AND m.match_deadline < now() - interval '10 minutes';
  GET DIAGNOSTICS v_pass = ROW_COUNT;

  RETURN n + v_pass;
END;
$function$;

REVOKE ALL ON FUNCTION public._resolve_stuck_matches() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_and_update_tournament_status()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM generate_tournament_brackets();

  UPDATE tournaments SET status = 'active'
  WHERE status = 'open' AND bracket_generated = true AND start_time <= now() AND current_players >= min_participants;

  PERFORM process_expired_check_ins();
  PERFORM _resolve_stuck_matches();
  PERFORM expire_stale_team_invites();

  -- Not enough sign-ups by start time: cancel (refunds below)
  UPDATE tournaments SET status = 'cancelled', updated_at = now()
  WHERE status = 'open' AND start_time <= now() AND current_players < min_participants;

  -- Active but people left before playing (count everyone registered, not just survivors)
  UPDATE tournaments t SET status = 'cancelled', updated_at = now()
  WHERE t.status = 'active'
    AND (SELECT count(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id AND tp.is_standby = false) < 2;

  UPDATE tournaments t SET status = 'completed', updated_at = now()
  WHERE t.status = 'active'
    AND EXISTS (SELECT 1 FROM match_results mr WHERE mr.tournament_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM match_results mr WHERE mr.tournament_id = t.id AND mr.status <> 'confirmed');

  PERFORM refund_tournament_entry_fees(id)
  FROM tournaments
  WHERE status = 'cancelled' AND NOT EXISTS (SELECT 1 FROM transactions WHERE tournament_id = tournaments.id AND type = 'refund');
END;
$function$;
