-- The B2 buckets are arena-public-media-7k2x / arena-private-media-7k2x (names are
-- global on Backblaze). Point the trailer check at the real public bucket.
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE
  d text := pg_get_functiondef('public.guard_tournaments_write'::regproc);
BEGIN
  IF position('arena-public\.s3' in d) = 0 THEN
    RAISE EXCEPTION 'guard_tournaments_write does not have the expected trailer check';
  END IF;
  EXECUTE replace(d, 'arena-public\.s3', 'arena-public-media-7k2x\.s3');
END $$;
