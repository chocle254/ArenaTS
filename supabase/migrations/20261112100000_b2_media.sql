-- Media on Backblaze B2 (see supabase/functions/media). Needs the 'media_cron'
-- value in private.app_secrets (set separately, never committed).

SET LOCAL lock_timeout = '5s';

-- Trailer library. Only the media function (service role) reads or writes it.
CREATE TABLE IF NOT EXISTS public.media_trailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  url text NOT NULL UNIQUE,
  poster_key text,
  poster_url text,
  title text,
  reusable boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.media_trailers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_trailers FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS media_trailers_uploaded_by_idx ON public.media_trailers (uploaded_by);
CREATE INDEX IF NOT EXISTS tournaments_trailer_url_idx ON public.tournaments (trailer_url) WHERE trailer_url IS NOT NULL;

-- Trailers to delete: not kept for reuse, over a day old, and no tournament
-- using them is still open/active or ended less than a day ago.
CREATE OR REPLACE FUNCTION public.media_trailers_to_delete()
RETURNS TABLE (id uuid, key text, poster_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT m.id, m.key, m.poster_key
  FROM media_trailers m
  WHERE m.deleted_at IS NULL
    AND NOT m.reusable
    AND m.created_at < now() - interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.trailer_url = m.url
        AND (t.status IN ('open', 'active') OR COALESCE(t.completed_at, t.updated_at) > now() - interval '1 day')
    )
  LIMIT 200
$$;

-- Lists files in a Supabase Storage bucket (used once to copy them to B2)
CREATE OR REPLACE FUNCTION public.media_storage_objects(p_bucket text)
RETURNS TABLE (name text, mimetype text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT o.name, o.metadata ->> 'mimetype' FROM storage.objects o WHERE o.bucket_id = p_bucket
$$;

REVOKE ALL ON FUNCTION public.media_trailers_to_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.media_storage_objects(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.media_trailers_to_delete() TO service_role;
GRANT EXECUTE ON FUNCTION public.media_storage_objects(text) TO service_role;

-- Daily trailer cleanup (03:00 UTC = 06:00 Nairobi)
CREATE OR REPLACE FUNCTION public._kick_media_cleanup()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zzanvdihageyedfnrdcx.supabase.co/functions/v1/media',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', public._app_secret('media_cron')),
    body := '{"action":"cleanup"}'::jsonb,
    timeout_milliseconds := 55000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'could not start media cleanup: %', SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public._kick_media_cleanup() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('media-trailer-cleanup', '0 3 * * *', 'SELECT public._kick_media_cleanup();');
