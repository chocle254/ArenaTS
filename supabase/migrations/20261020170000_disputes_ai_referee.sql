-- ============================================================================
-- Disputes: evidence, AI referee, per-match human referees
-- ============================================================================
-- Flow (tournament matches and quick matches)
--   1. Reports conflict -> a dispute opens in 'collecting'. Both players have
--      15 minutes to upload photos or short videos of the result.
--   2. When both have uploaded (or time is up) the AI referee reviews the
--      evidence ('ai_review').
--   3. Confident verdict -> 'proposed'. Either player can appeal within
--      10 minutes; otherwise the decision is applied ('decided', by 'ai').
--      Low confidence, no evidence, or an appeal -> a human referee is
--      assigned for THIS match only ('human_review').
--   4. The referee (or an admin) decides. Their access to the match ends the
--      moment it's decided.
-- Referees are no longer officials for a whole game. referee_assignments is
-- now the pool of approved referees per game; power comes only from an
-- active assignment to a specific dispute. Admins can always decide, except
-- on matches they play in.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.app_secrets (name text PRIMARY KEY, value text NOT NULL);
INSERT INTO private.app_secrets (name, value)
VALUES ('ai_referee_cron', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (name) DO NOTHING;

-- Service role reads the cron key to verify scheduled calls
CREATE OR REPLACE FUNCTION public._app_secret(p_name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'private', 'public'
AS $$ SELECT value FROM private.app_secrets WHERE name = p_name $$;

CREATE TABLE IF NOT EXISTS public.match_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_kind text NOT NULL CHECK (match_kind IN ('tournament', 'quick')),
  match_result_id uuid UNIQUE REFERENCES public.match_results(id) ON DELETE CASCADE,
  challenge_id uuid UNIQUE REFERENCES public.challenges(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  game text,
  player1_id uuid NOT NULL REFERENCES public.profiles(id),
  player2_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'collecting' CHECK (status IN ('collecting', 'ai_review', 'proposed', 'human_review', 'decided', 'void')),
  evidence_deadline timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  ai_verdict jsonb,
  ai_winner uuid REFERENCES public.profiles(id),
  ai_confidence numeric,
  appeal_deadline timestamptz,
  appealed_by uuid REFERENCES public.profiles(id),
  appeal_reason text,
  referee_id uuid REFERENCES public.profiles(id),
  referee_assigned_at timestamptz,
  decided_winner uuid REFERENCES public.profiles(id),
  decided_by text CHECK (decided_by IN ('ai', 'referee', 'admin', 'players', 'system')),
  decided_by_user uuid REFERENCES public.profiles(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK ((match_result_id IS NOT NULL) <> (challenge_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS match_disputes_open_idx ON public.match_disputes (status) WHERE status NOT IN ('decided', 'void');
CREATE INDEX IF NOT EXISTS match_disputes_referee_idx ON public.match_disputes (referee_id) WHERE status = 'human_review';

CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.match_disputes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  kind text NOT NULL CHECK (kind IN ('image', 'video')),
  path text NOT NULL,
  frames text[] NOT NULL DEFAULT '{}',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispute_evidence_dispute_idx ON public.dispute_evidence (dispute_id);

ALTER TABLE public.match_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_dispute(p_uid uuid, p_dispute uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM match_disputes d
    WHERE d.id = p_dispute
      AND (p_uid IN (d.player1_id, d.player2_id)
           OR (d.referee_id = p_uid AND d.status = 'human_review')
           OR has_role(p_uid, 'admin'))
  );
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'match_disputes' AND policyname = 'Players, referee and admins read disputes') THEN
    CREATE POLICY "Players, referee and admins read disputes" ON public.match_disputes FOR SELECT TO authenticated USING (can_view_dispute(auth.uid(), id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dispute_evidence' AND policyname = 'Players, referee and admins read evidence') THEN
    CREATE POLICY "Players, referee and admins read evidence" ON public.dispute_evidence FOR SELECT TO authenticated USING (can_view_dispute(auth.uid(), dispute_id));
  END IF;
END $$;

-- Private bucket: <dispute id>/<user id>/<file>
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('match-evidence', 'match-evidence', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Players upload their dispute evidence') THEN
    CREATE POLICY "Players upload their dispute evidence" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'match-evidence'
      AND (storage.foldername(name))[2] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM public.match_disputes d
        WHERE d.id::text = (storage.foldername(name))[1]
          AND auth.uid() IN (d.player1_id, d.player2_id)
          AND d.status IN ('collecting', 'proposed')
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Dispute parties read evidence') THEN
    CREATE POLICY "Dispute parties read evidence" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'match-evidence' AND public.can_view_dispute(auth.uid(), ((storage.foldername(name))[1])::uuid));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Opening disputes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._open_dispute_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_game text;
BEGIN
  IF NEW.status = 'disputed' AND OLD.status IS DISTINCT FROM 'disputed' AND NEW.player1_id IS NOT NULL AND NEW.player2_id IS NOT NULL THEN
    SELECT game::text INTO v_game FROM tournaments WHERE id = NEW.tournament_id;
    INSERT INTO match_disputes (match_kind, match_result_id, tournament_id, game, player1_id, player2_id)
    VALUES ('tournament', NEW.id, NEW.tournament_id, v_game, NEW.player1_id, NEW.player2_id)
    ON CONFLICT (match_result_id) DO UPDATE SET status = 'collecting', evidence_deadline = now() + interval '15 minutes',
      ai_verdict = NULL, ai_winner = NULL, ai_confidence = NULL, appeal_deadline = NULL, appealed_by = NULL, appeal_reason = NULL,
      referee_id = NULL, referee_assigned_at = NULL, decided_winner = NULL, decided_by = NULL, decided_by_user = NULL, decided_at = NULL
      WHERE match_disputes.status IN ('decided', 'void');
    PERFORM create_notification(u, 'match', 'Result disputed', 'Upload a photo or short video of the final score within 15 minutes. The AI referee reviews it next.', '/tournaments/' || NEW.tournament_id || '?match=' || NEW.match_id)
    FROM unnest(ARRAY[NEW.player1_id, NEW.player2_id]) u;
  ELSIF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    -- Settled some other way (players agreed, no-show): close any open dispute
    UPDATE match_disputes SET status = CASE WHEN status = 'decided' THEN status ELSE 'void' END, decided_at = COALESCE(decided_at, now())
    WHERE match_result_id = NEW.id AND status NOT IN ('decided', 'void');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_open_dispute_tournament
  AFTER UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public._open_dispute_tournament();

CREATE OR REPLACE FUNCTION public._open_dispute_quick()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('disputed', 'disputed_warning') AND OLD.status NOT IN ('disputed', 'disputed_warning') THEN
    INSERT INTO match_disputes (match_kind, challenge_id, game, player1_id, player2_id)
    VALUES ('quick', NEW.id, NEW.game, NEW.challenger_id, NEW.opponent_id)
    ON CONFLICT (challenge_id) DO NOTHING;
    PERFORM create_notification(u, 'match', 'Result disputed', 'Upload a photo or short video of the final score within 15 minutes. The AI referee reviews it next.', '/quick-match')
    FROM unnest(ARRAY[NEW.challenger_id, NEW.opponent_id]) u;
  ELSIF NEW.status IN ('completed', 'cancelled', 'expired', 'declined') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE match_disputes SET status = CASE WHEN status = 'decided' THEN status ELSE 'void' END, decided_at = COALESCE(decided_at, now())
    WHERE challenge_id = NEW.id AND status NOT IN ('decided', 'void');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_open_dispute_quick
  AFTER UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public._open_dispute_quick();

-- ---------------------------------------------------------------------------
-- Applying a decision (internal)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._apply_dispute_decision(p_dispute uuid, p_winner uuid, p_by text, p_user uuid, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d match_disputes%ROWTYPE;
BEGIN
  SELECT * INTO d FROM match_disputes WHERE id = p_dispute FOR UPDATE;
  IF NOT FOUND OR d.status IN ('decided', 'void') THEN
    RAISE EXCEPTION 'This dispute is already closed';
  END IF;
  IF p_winner IS NOT NULL AND p_winner NOT IN (d.player1_id, d.player2_id) THEN
    RAISE EXCEPTION 'The winner must be one of the two players';
  END IF;

  -- Close the dispute first so the match triggers don't void it
  UPDATE match_disputes SET status = 'decided', decided_winner = p_winner, decided_by = p_by, decided_by_user = p_user,
    decision_note = left(p_note, 1000), decided_at = now()
  WHERE id = p_dispute;

  IF d.match_kind = 'tournament' THEN
    IF p_winner IS NULL THEN
      RAISE EXCEPTION 'Tournament matches need a winner';
    END IF;
    UPDATE match_results SET winner_id = p_winner, status = 'confirmed', admin_override = true, submitted_by = p_user, updated_at = now()
    WHERE id = d.match_result_id AND status <> 'confirmed';
  ELSE
    IF p_winner IS NULL THEN
      UPDATE challenges SET status = 'cancelled', submitted_by = p_user WHERE id = d.challenge_id AND status IN ('accepted', 'disputed', 'disputed_warning');
    ELSE
      UPDATE challenges SET status = 'completed', winner_id = p_winner, challenger_reported_winner = p_winner, opponent_reported_winner = p_winner,
        completed_at = now(), submitted_by = p_user
      WHERE id = d.challenge_id AND status IN ('accepted', 'disputed', 'disputed_warning');
    END IF;
  END IF;

  PERFORM create_notification(u, 'match', 'Dispute decided',
    CASE WHEN p_winner IS NULL THEN 'The match was cancelled and stakes returned.'
         ELSE (SELECT gamertag FROM profiles WHERE id = p_winner) || ' was confirmed as the winner.' END,
    CASE WHEN d.match_kind = 'tournament' THEN '/tournaments/' || d.tournament_id ELSE '/quick-match' END)
  FROM unnest(ARRAY[d.player1_id, d.player2_id]) u;
END;
$$;

-- Pick an approved referee for the game who has nothing to do with this match
CREATE OR REPLACE FUNCTION public._assign_referee(p_dispute uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d match_disputes%ROWTYPE;
  v_ref uuid;
BEGIN
  SELECT * INTO d FROM match_disputes WHERE id = p_dispute FOR UPDATE;
  SELECT ra.user_id INTO v_ref
  FROM referee_assignments ra
  JOIN profiles p ON p.id = ra.user_id
  WHERE ra.game::text = d.game
    AND ra.user_id NOT IN (d.player1_id, d.player2_id)
    AND NOT COALESCE(p.is_suspended, false)
    AND NOT COALESCE(p.is_flagged_fraud, false)
    -- not playing in the same tournament
    AND (d.tournament_id IS NULL OR NOT EXISTS (SELECT 1 FROM tournament_participants tp WHERE tp.tournament_id = d.tournament_id AND tp.user_id = ra.user_id))
    -- not a frequent opponent or friend of either player
    AND NOT EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = ra.user_id AND f.friend_id IN (d.player1_id, d.player2_id))
    AND NOT EXISTS (SELECT 1 FROM challenges c WHERE c.created_at > now() - interval '30 days'
                    AND ((c.challenger_id = ra.user_id AND c.opponent_id IN (d.player1_id, d.player2_id))
                      OR (c.opponent_id = ra.user_id AND c.challenger_id IN (d.player1_id, d.player2_id))))
  ORDER BY (SELECT count(*) FROM match_disputes x WHERE x.referee_id = ra.user_id AND x.status = 'human_review'),
           p.last_seen_at DESC NULLS LAST, random()
  LIMIT 1;

  UPDATE match_disputes SET status = 'human_review', referee_id = v_ref, referee_assigned_at = CASE WHEN v_ref IS NULL THEN NULL ELSE now() END WHERE id = p_dispute;
  IF v_ref IS NOT NULL THEN
    PERFORM create_notification(v_ref, 'referee', 'You''ve been assigned a dispute', 'Review the evidence and decide who won. Your access ends once it''s decided.', '/referee');
  END IF;
  RETURN v_ref;
END;
$$;

-- ---------------------------------------------------------------------------
-- Player actions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_dispute_evidence(p_dispute uuid, p_kind text, p_path text, p_frames text[] DEFAULT '{}', p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d match_disputes%ROWTYPE;
  v_uid uuid := auth.uid();
  v_prefix text;
BEGIN
  SELECT * INTO d FROM match_disputes WHERE id = p_dispute FOR UPDATE;
  IF NOT FOUND OR v_uid NOT IN (d.player1_id, d.player2_id) THEN
    RAISE EXCEPTION 'Only the players in this match can add evidence' USING ERRCODE = '42501';
  END IF;
  IF d.status <> 'collecting' THEN
    RAISE EXCEPTION 'Evidence is closed for this dispute';
  END IF;
  IF p_kind NOT IN ('image', 'video') THEN
    RAISE EXCEPTION 'Upload a photo or a video';
  END IF;
  v_prefix := d.id::text || '/' || v_uid::text || '/';
  IF left(p_path, length(v_prefix)) <> v_prefix OR EXISTS (SELECT 1 FROM unnest(p_frames) f WHERE left(f, length(v_prefix)) <> v_prefix) THEN
    RAISE EXCEPTION 'Invalid file' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM dispute_evidence WHERE dispute_id = d.id AND user_id = v_uid) >= 6 THEN
    RAISE EXCEPTION 'You can add up to 6 files';
  END IF;
  INSERT INTO dispute_evidence (dispute_id, user_id, kind, path, frames, note)
  VALUES (d.id, v_uid, p_kind, p_path, COALESCE(p_frames[1:8], '{}'), left(p_note, 500));
  -- Both players have something in: no need to wait for the full window
  IF (SELECT count(DISTINCT user_id) FROM dispute_evidence WHERE dispute_id = d.id) = 2 THEN
    UPDATE match_disputes SET evidence_deadline = LEAST(evidence_deadline, now() + interval '2 minutes') WHERE id = d.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.appeal_dispute(p_dispute uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d match_disputes%ROWTYPE;
BEGIN
  SELECT * INTO d FROM match_disputes WHERE id = p_dispute FOR UPDATE;
  IF NOT FOUND OR auth.uid() NOT IN (d.player1_id, d.player2_id) THEN
    RAISE EXCEPTION 'Only the players in this match can appeal' USING ERRCODE = '42501';
  END IF;
  IF d.status <> 'proposed' OR d.appeal_deadline < now() THEN
    RAISE EXCEPTION 'The appeal window has closed';
  END IF;
  IF length(coalesce(trim(p_reason), '')) < 10 THEN
    RAISE EXCEPTION 'Tell the referee what the AI got wrong (at least 10 characters)';
  END IF;
  UPDATE match_disputes SET appealed_by = auth.uid(), appeal_reason = left(p_reason, 1000) WHERE id = d.id;
  PERFORM _assign_referee(d.id);
END;
$$;

-- Referee (assigned to this dispute) or admin (not playing) decides.
-- p_winner NULL = cancel and refund (quick matches only).
CREATE OR REPLACE FUNCTION public.referee_decide(p_dispute uuid, p_winner uuid, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d match_disputes%ROWTYPE;
  v_uid uuid := auth.uid();
  v_admin boolean := has_role(auth.uid(), 'admin');
BEGIN
  SELECT * INTO d FROM match_disputes WHERE id = p_dispute;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  IF v_uid IN (d.player1_id, d.player2_id) THEN
    RAISE EXCEPTION 'You are playing in this match, so someone else has to decide it' USING ERRCODE = '42501';
  END IF;
  IF NOT (v_admin OR (d.referee_id = v_uid AND d.status = 'human_review')) THEN
    RAISE EXCEPTION 'Only the referee assigned to this dispute can decide it' USING ERRCODE = '42501';
  END IF;
  IF length(coalesce(trim(p_note), '')) < 5 THEN
    RAISE EXCEPTION 'Add a short reason for your decision';
  END IF;
  PERFORM _apply_dispute_decision(d.id, p_winner, CASE WHEN d.referee_id = v_uid THEN 'referee' ELSE 'admin' END, v_uid, p_note);
END;
$$;

-- ---------------------------------------------------------------------------
-- AI referee (service only, called by the ai-referee edge function)
-- ---------------------------------------------------------------------------
-- Claims disputes ready for review: evidence window over (or both uploaded)
CREATE OR REPLACE FUNCTION public.ai_claim_disputes(p_limit int DEFAULT 5)
RETURNS SETOF public.match_disputes
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE match_disputes SET status = 'ai_review'
  WHERE id IN (
    SELECT id FROM match_disputes
    WHERE (status = 'collecting' AND evidence_deadline <= now())
       OR (status = 'ai_review' AND created_at < now() - interval '1 hour') -- retry stuck reviews
    ORDER BY evidence_deadline
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

-- Records the verdict. Confident -> proposed (10 min appeal), else a human.
CREATE OR REPLACE FUNCTION public.ai_record_verdict(p_dispute uuid, p_winner uuid, p_confidence numeric, p_verdict jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d match_disputes%ROWTYPE;
  v_flags int := COALESCE(jsonb_array_length(p_verdict -> 'red_flags'), 0);
BEGIN
  SELECT * INTO d FROM match_disputes WHERE id = p_dispute FOR UPDATE;
  IF NOT FOUND OR d.status <> 'ai_review' THEN
    RETURN 'skipped';
  END IF;
  IF p_winner IS NOT NULL AND p_winner NOT IN (d.player1_id, d.player2_id) THEN
    p_winner := NULL;
  END IF;
  UPDATE match_disputes SET ai_verdict = p_verdict, ai_winner = p_winner, ai_confidence = p_confidence WHERE id = d.id;

  IF p_winner IS NOT NULL AND p_confidence >= 0.85 AND v_flags = 0 THEN
    UPDATE match_disputes SET status = 'proposed', appeal_deadline = now() + interval '10 minutes' WHERE id = d.id;
    PERFORM create_notification(u, 'match', 'AI referee decision',
      (SELECT gamertag FROM profiles WHERE id = p_winner) || ' won, based on the evidence. You have 10 minutes to appeal.',
      CASE WHEN d.match_kind = 'tournament' THEN '/tournaments/' || d.tournament_id ELSE '/quick-match' END)
    FROM unnest(ARRAY[d.player1_id, d.player2_id]) u;
    RETURN 'proposed';
  END IF;

  -- No evidence at all from either side on a quick match: cancel and refund
  IF d.match_kind = 'quick' AND NOT EXISTS (SELECT 1 FROM dispute_evidence WHERE dispute_id = d.id) THEN
    PERFORM _apply_dispute_decision(d.id, NULL, 'system', NULL, 'No evidence from either player');
    RETURN 'void';
  END IF;
  -- Only one player sent evidence and the AI backs them: still give the other a chance via a human
  PERFORM _assign_referee(d.id);
  RETURN 'human_review';
END;
$$;

-- Applies proposals whose appeal window passed
CREATE OR REPLACE FUNCTION public.finalize_proposed_disputes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN SELECT id, ai_winner, ai_verdict FROM match_disputes WHERE status = 'proposed' AND appeal_deadline <= now() FOR UPDATE SKIP LOCKED LOOP
    PERFORM _apply_dispute_decision(r.id, r.ai_winner, 'ai', NULL, r.ai_verdict ->> 'reasoning');
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- Officials: power only through an active assignment (or admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_referee(uid uuid, p_game game_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Game-wide referee powers are gone. Kept for older callers: admins only.
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public._is_match_official(p_uid uuid, p_tournament_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(p_uid, 'admin')
      OR EXISTS (SELECT 1 FROM match_disputes d WHERE d.tournament_id = p_tournament_id AND d.referee_id = p_uid AND d.status = 'human_review');
$$;

-- Old override path: admins (not playing) or the referee assigned to this match's dispute
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
  v_row match_results%ROWTYPE;
  v_d match_disputes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO v_row FROM match_results WHERE tournament_id = p_tournament_id AND match_id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  SELECT * INTO v_d FROM match_disputes WHERE match_result_id = v_row.id;
  IF v_d.id IS NOT NULL AND v_d.status NOT IN ('decided', 'void') THEN
    PERFORM referee_decide(v_d.id, p_winner_id, 'Decided from the match room');
    RETURN json_build_object('status', 'confirmed', 'message', 'Decision applied.');
  END IF;
  IF NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Only admins or the assigned referee can decide this match' USING ERRCODE = '42501';
  END IF;
  IF v_uid IN (v_row.player1_id, v_row.player2_id) THEN
    RAISE EXCEPTION 'You are playing in this match, so another official has to decide it' USING ERRCODE = '42501';
  END IF;
  IF p_winner_id IS NULL OR p_winner_id NOT IN (v_row.player1_id, v_row.player2_id) THEN
    RAISE EXCEPTION 'The winner must be one of the two players';
  END IF;
  IF v_row.status = 'confirmed' THEN
    RAISE EXCEPTION 'This match is already decided';
  END IF;
  UPDATE match_results SET winner_id = p_winner_id, status = 'confirmed', admin_override = true, submitted_by = v_uid, updated_at = now() WHERE id = v_row.id;
  RETURN json_build_object('status', 'confirmed', 'message', 'Official decision applied.');
END;
$function$;

-- ---------------------------------------------------------------------------
-- Grants and schedule
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  internal text[] := ARRAY['_app_secret', '_open_dispute_tournament', '_open_dispute_quick', '_apply_dispute_decision',
                           '_assign_referee', 'ai_claim_disputes', 'ai_record_verdict', 'finalize_proposed_disputes'];
  user_facing text[] := ARRAY['submit_dispute_evidence', 'appeal_dispute', 'referee_decide', 'admin_override_match', 'can_view_dispute'];
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace AND (p.proname = ANY (internal) OR p.proname = ANY (user_facing))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = ANY (user_facing) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

SELECT cron.schedule('finalize-proposed-disputes', '* * * * *', 'SELECT public.finalize_proposed_disputes();');
SELECT cron.schedule('ai-referee-sweep', '*/2 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://zzanvdihageyedfnrdcx.supabase.co/functions/v1/ai-referee',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', public._app_secret('ai_referee_cron')),
    body := '{"action":"sweep"}'::jsonb,
    timeout_milliseconds := 55000
  );
$cron$);
