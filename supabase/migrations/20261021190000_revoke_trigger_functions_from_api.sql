-- Trigger functions can't be called usefully over the API, but they shouldn't be
-- listed there either. Triggers keep firing: Postgres doesn't check EXECUTE when a
-- trigger fires. Role helpers stay available to signed-in users (RLS policies use
-- them) but not to logged-out callers.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN ('has_role', 'get_user_role', 'get_auth_user_role', 'is_referee', 'can_access_dm', '_new_referral_code')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;
