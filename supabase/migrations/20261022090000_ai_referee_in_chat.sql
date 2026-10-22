-- ============================================================================
-- AI referee runs the dispute from the match chat
-- ============================================================================
-- * The moment a dispute opens, the AI referee asks both players (by name) in
--   the match chat to say what happened and upload proof.
-- * Each upload is acknowledged ("got X's evidence, waiting for Y").
-- * As soon as both players have uploaded, the AI reviews straight away
--   (no waiting for the 2-minute sweep or the rest of the window). If one
--   player never uploads, the 15-minute deadline still applies.
-- ============================================================================

-- Post a system message as the AI referee in a dispute's match chat
CREATE OR REPLACE FUNCTION public._ai_say(p_dispute uuid, p_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d match_disputes%ROWTYPE;
  v_match text;
BEGIN
  SELECT * INTO d FROM match_disputes WHERE id = p_dispute;
  IF NOT FOUND THEN RETURN; END IF;
  IF d.match_kind = 'tournament' THEN
    SELECT match_id INTO v_match FROM match_results WHERE id = d.match_result_id;
    IF v_match IS NULL THEN RETURN; END IF;
    INSERT INTO match_messages (tournament_id, match_id, user_id, is_system_message, message)
    VALUES (d.tournament_id, v_match, NULL, true, left('🤖 AI referee: ' || p_text, 1000));
  ELSIF d.challenge_id IS NOT NULL THEN
    INSERT INTO match_messages (challenge_id, user_id, is_system_message, message)
    VALUES (d.challenge_id, NULL, true, left('🤖 AI referee: ' || p_text, 1000));
  END IF;
END;
$$;

-- Ask the AI referee to review now (same call the 2-minute cron makes)
CREATE OR REPLACE FUNCTION public._kick_ai_referee()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zzanvdihageyedfnrdcx.supabase.co/functions/v1/ai-referee',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', public._app_secret('ai_referee_cron')),
    body := '{"action":"sweep"}'::jsonb,
    timeout_milliseconds := 55000
  );
EXCEPTION WHEN OTHERS THEN
  -- The cron sweep picks it up within 2 minutes anyway
  RAISE WARNING 'could not start AI referee: %', SQLERRM;
END;
$$;

-- Opening message the moment a dispute is created
CREATE OR REPLACE FUNCTION public._ai_open_dispute_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_a text;
  v_b text;
BEGIN
  SELECT gamertag INTO v_a FROM profiles WHERE id = NEW.player1_id;
  SELECT gamertag INTO v_b FROM profiles WHERE id = NEW.player2_id;
  PERFORM _ai_say(NEW.id, format(
    'Your reports don''t match, so I''ll help settle this. %s and %s: each tell me here what happened (final score, any disconnect or someone leaving), then tap "Upload photo or video" and send the final score screen or a short recording. I decide as soon as you''ve both sent proof. If only one of you does, I decide at %s.',
    COALESCE(v_a, 'Player 1'), COALESCE(v_b, 'Player 2'),
    to_char(NEW.evidence_deadline AT TIME ZONE 'Africa/Nairobi', 'HH24:MI')));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'AI opening message failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ai_open_dispute_message ON public.match_disputes;
CREATE TRIGGER ai_open_dispute_message AFTER INSERT ON public.match_disputes
  FOR EACH ROW EXECUTE FUNCTION public._ai_open_dispute_message();

-- Evidence: acknowledge in chat; review immediately once both players sent proof
CREATE OR REPLACE FUNCTION public.submit_dispute_evidence(p_dispute uuid, p_kind text, p_path text, p_frames text[] DEFAULT '{}'::text[], p_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  d match_disputes%ROWTYPE;
  v_uid uuid := auth.uid();
  v_prefix text;
  v_first boolean;
  v_me text;
  v_other text;
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
  v_first := NOT EXISTS (SELECT 1 FROM dispute_evidence WHERE dispute_id = d.id AND user_id = v_uid);
  INSERT INTO dispute_evidence (dispute_id, user_id, kind, path, frames, note)
  VALUES (d.id, v_uid, p_kind, p_path, COALESCE(p_frames[1:8], '{}'), left(p_note, 500));

  SELECT gamertag INTO v_me FROM profiles WHERE id = v_uid;
  SELECT gamertag INTO v_other FROM profiles WHERE id = CASE WHEN v_uid = d.player1_id THEN d.player2_id ELSE d.player1_id END;

  IF (SELECT count(DISTINCT user_id) FROM dispute_evidence WHERE dispute_id = d.id) = 2 THEN
    -- Both sent proof: review now
    UPDATE match_disputes SET evidence_deadline = now() WHERE id = d.id;
    PERFORM _ai_say(d.id, format('Got proof from both of you. Reviewing it now together with what you each said here.'));
    PERFORM _kick_ai_referee();
  ELSIF v_first THEN
    PERFORM _ai_say(d.id, format('Got %s''s %s. Waiting for %s to send theirs (until %s).',
      COALESCE(v_me, 'a player'), CASE WHEN p_kind = 'video' THEN 'recording' ELSE 'screenshot' END,
      COALESCE(v_other, 'the other player'), to_char(d.evidence_deadline AT TIME ZONE 'Africa/Nairobi', 'HH24:MI')));
  END IF;
END;
$function$;

-- One-player deadline: also run the AI straight away when it passes (the
-- cron already sweeps every 2 minutes; this keeps it to under a minute)
SELECT cron.unschedule('ai-referee-sweep') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-referee-sweep');
SELECT cron.schedule('ai-referee-sweep', '* * * * *', $$SELECT public._kick_ai_referee();$$);

REVOKE ALL ON FUNCTION public._ai_say(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._kick_ai_referee() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._ai_open_dispute_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._ai_say(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public._kick_ai_referee() TO service_role;
