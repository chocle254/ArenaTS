-- Home and away (two-legged) knockout ties for eFootball and FIFA.
--
-- Each bracket match is a tie of two legs: player 1 hosts leg 1, player 2
-- hosts leg 2. Both players report both leg scores (from player 1 / player 2's
-- side, leg 2 including extra time). Most total goals goes through; if the
-- total is level, the shootout winner they report goes through. Extra time and
-- penalties happen in the game; Arena only records the result.
--
-- The bracket, check-in, walkovers, disputes and payouts are unchanged: a tie
-- still ends with one winner_id. Reports also fill playerN_reported_winner so
-- the dispute flow and the AI referee keep working.

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS two_legged boolean NOT NULL DEFAULT false;
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_two_legged_football;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_two_legged_football
  CHECK (NOT two_legged OR game::text IN ('fifa', 'efootball'));

ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS player1_reported_score jsonb,
  ADD COLUMN IF NOT EXISTS player2_reported_score jsonb,
  -- The agreed result: {"leg1":[p1,p2],"leg2":[p1,p2],"pens":uuid|null}
  ADD COLUMN IF NOT EXISTS score jsonb;

-- Report both legs of a home-and-away tie
CREATE OR REPLACE FUNCTION public.report_two_leg_result(
  p_tournament_id uuid, p_match_id text,
  p_leg1_p1 integer, p_leg1_p2 integer, p_leg2_p1 integer, p_leg2_p2 integer,
  p_pens_winner uuid DEFAULT NULL)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row match_results%ROWTYPE;
  v_two boolean;
  v_agg1 int;
  v_agg2 int;
  v_winner uuid;
  v_report jsonb;
  v_other jsonb;
  v_other_winner uuid;
  v_slot int;
  v_status text;
  v_score jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT two_legged INTO v_two FROM tournaments WHERE id = p_tournament_id;
  IF NOT COALESCE(v_two, false) THEN
    RAISE EXCEPTION 'This tournament is played as single matches';
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
  IF v_row.status = 'disputed' THEN
    RAISE EXCEPTION 'This match is in a dispute. Upload your evidence in the dispute panel.';
  END IF;

  IF v_uid = v_row.player1_id THEN
    v_slot := 1; v_other := v_row.player2_reported_score; v_other_winner := v_row.player2_reported_winner;
  ELSIF v_uid = v_row.player2_id THEN
    v_slot := 2; v_other := v_row.player1_reported_score; v_other_winner := v_row.player1_reported_winner;
  ELSE
    RAISE EXCEPTION 'Only the players in this match can report its result' USING ERRCODE = '42501';
  END IF;
  IF v_row.player1_id IS NULL OR v_row.player2_id IS NULL THEN
    RAISE EXCEPTION 'Your opponent isn''t decided yet';
  END IF;

  IF p_leg1_p1 IS NULL OR p_leg1_p2 IS NULL OR p_leg2_p1 IS NULL OR p_leg2_p2 IS NULL THEN
    RAISE EXCEPTION 'Enter the score of both legs';
  END IF;
  IF LEAST(p_leg1_p1, p_leg1_p2, p_leg2_p1, p_leg2_p2) < 0 OR GREATEST(p_leg1_p1, p_leg1_p2, p_leg2_p1, p_leg2_p2) > 50 THEN
    RAISE EXCEPTION 'Scores must be between 0 and 50';
  END IF;

  v_agg1 := p_leg1_p1 + p_leg2_p1;
  v_agg2 := p_leg1_p2 + p_leg2_p2;
  IF v_agg1 > v_agg2 THEN
    v_winner := v_row.player1_id;
    p_pens_winner := NULL;
  ELSIF v_agg2 > v_agg1 THEN
    v_winner := v_row.player2_id;
    p_pens_winner := NULL;
  ELSE
    IF p_pens_winner IS NULL OR p_pens_winner NOT IN (v_row.player1_id, v_row.player2_id) THEN
      RAISE EXCEPTION 'The total is level. Pick who won on penalties.';
    END IF;
    v_winner := p_pens_winner;
  END IF;

  v_report := jsonb_build_object(
    'leg1', jsonb_build_array(p_leg1_p1, p_leg1_p2),
    'leg2', jsonb_build_array(p_leg2_p1, p_leg2_p2),
    'pens', p_pens_winner);

  IF v_other IS NULL AND v_other_winner IS NULL THEN
    v_status := 'pending';
  ELSIF v_other_winner = v_winner THEN
    -- Same team goes through: confirmed. Keep the score only if both agree on it.
    v_status := 'confirmed';
    v_score := CASE WHEN v_other = v_report THEN v_report END;
  ELSE
    v_status := 'disputed';
  END IF;

  UPDATE match_results
  SET player1_reported_score  = CASE WHEN v_slot = 1 THEN v_report ELSE player1_reported_score END,
      player2_reported_score  = CASE WHEN v_slot = 2 THEN v_report ELSE player2_reported_score END,
      player1_reported_winner = CASE WHEN v_slot = 1 THEN v_winner ELSE player1_reported_winner END,
      player2_reported_winner = CASE WHEN v_slot = 2 THEN v_winner ELSE player2_reported_winner END,
      submitted_by = v_uid,
      score        = COALESCE(v_score, score),
      winner_id    = CASE WHEN v_status = 'confirmed' THEN v_winner ELSE winner_id END,
      status       = v_status,
      updated_at   = now()
  WHERE id = v_row.id;

  RETURN json_build_object(
    'status', v_status,
    'winner_id', v_winner,
    'message', CASE
      WHEN v_status = 'confirmed' THEN 'Tie confirmed. Winner advancing.'
      WHEN v_status = 'disputed'  THEN 'Results conflict. Dispute raised.'
      ELSE 'Result submitted. Waiting for opponent.'
    END);
END;
$function$;

REVOKE ALL ON FUNCTION public.report_two_leg_result(uuid, text, integer, integer, integer, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_two_leg_result(uuid, text, integer, integer, integer, integer, uuid) TO authenticated;

-- Winner-only reports aren't allowed in two-legged tournaments (they'd skip the scores)
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

  IF EXISTS (SELECT 1 FROM tournaments WHERE id = p_tournament_id AND two_legged) THEN
    RAISE EXCEPTION 'This is a home and away tournament. Report the score of both legs.';
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

-- Officials resetting a dispute also clear the score reports
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
       OR NEW.player1_reported_score IS NOT NULL
       OR NEW.player2_reported_score IS NOT NULL
       OR NEW.score IS NOT NULL
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
      AND NEW.player2_reported_winner IS NULL AND NOT COALESCE(NEW.admin_override, false)
      AND NEW.player1_reported_score IS NULL AND NEW.player2_reported_score IS NULL;
    IF v_dispute_reset THEN
      v_allowed := v_allowed || ARRAY['status', 'winner_id', 'player1_reported_winner', 'player2_reported_winner', 'admin_override',
                                      'player1_reported_score', 'player2_reported_score'];
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
