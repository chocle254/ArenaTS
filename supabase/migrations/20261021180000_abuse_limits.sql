-- ============================================================================
-- Abuse limits: email bombing, code guessing, fake emails, hostile uploads
-- ============================================================================
-- 1. take_rate_limit(key, limit, window): a small sliding-window limiter the
--    edge functions use (service role only). Sign-up code emails are limited
--    per address and per IP, so Arena's Gmail can't be used to flood inboxes
--    (which would also get the account suspended).
-- 2. check_email_otp: checks a code and counts the attempt in one locked step,
--    so parallel guesses can't each get the "5 attempts" budget.
-- 3. claim_email_send: each system email (e.g. "you won") is sent at most once.
-- 4. Upload buckets: images only for avatars and ID documents (no HTML/SVG that
--    could host a fake login page on our domain), size caps everywhere.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.rate_limit_hits (
  key text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_key_at ON private.rate_limit_hits (key, at DESC);

CREATE OR REPLACE FUNCTION public.take_rate_limit(p_key text, p_limit int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'private', 'public'
AS $$
BEGIN
  -- One caller per key at a time, so bursts are counted exactly
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key, 0));
  IF (SELECT count(*) FROM private.rate_limit_hits
      WHERE key = p_key AND at > now() - make_interval(secs => p_window_seconds)) >= p_limit THEN
    RETURN false;
  END IF;
  INSERT INTO private.rate_limit_hits (key) VALUES (p_key);
  -- Keep the table small
  IF random() < 0.02 THEN
    DELETE FROM private.rate_limit_hits WHERE at < now() - interval '2 days';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_email_otp(p_email text, p_purpose text, p_code text, p_mark_verified boolean DEFAULT true)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o email_otps%ROWTYPE;
BEGIN
  SELECT * INTO o FROM email_otps
  WHERE email = lower(btrim(p_email)) AND purpose = p_purpose AND NOT verified
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;
  IF o.expires_at < now() THEN
    RETURN 'expired';
  END IF;
  IF o.attempts >= 5 THEN
    RETURN 'too_many';
  END IF;
  UPDATE email_otps SET attempts = attempts + 1 WHERE id = o.id;
  IF o.code IS DISTINCT FROM btrim(p_code) THEN
    RETURN 'invalid';
  END IF;
  IF p_mark_verified THEN
    UPDATE email_otps SET verified = true, verified_at = now() WHERE id = o.id;
  END IF;
  RETURN 'ok';
END;
$$;

CREATE TABLE IF NOT EXISTS private.sent_emails (
  kind text NOT NULL,
  ref text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, ref)
);

CREATE OR REPLACE FUNCTION public.claim_email_send(p_kind text, p_ref text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'private', 'public'
AS $$
  WITH ins AS (
    INSERT INTO private.sent_emails (kind, ref) VALUES (p_kind, p_ref)
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT EXISTS (SELECT 1 FROM ins);
$$;

REVOKE ALL ON FUNCTION public.take_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_email_otp(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_email_send(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_rate_limit(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_email_otp(text, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_email_send(text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Upload buckets
-- ---------------------------------------------------------------------------
UPDATE storage.buckets SET file_size_limit = 2 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';
UPDATE storage.buckets SET file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'kyc-documents';
UPDATE storage.buckets SET file_size_limit = 50 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE id = 'evidence';

-- Policies for a bucket that no longer exists
DROP POLICY IF EXISTS "Anyone can view tournament screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;
