-- Database backups from the admin dashboard ("Back up now").
--
-- The db-backup edge function copies every public table plus the auth user
-- tables into one compressed JSON file in the private B2 bucket
-- (backups/arena-<time>.json.gz) and records it here. Admins can list the
-- backups and download them; only the service role can add or remove rows.
-- Private messages stay encrypted in the file: the Vault key is not included.

SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.db_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_key text NOT NULL UNIQUE,
  size_bytes bigint NOT NULL,
  table_count int NOT NULL,
  row_count bigint NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.db_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.db_backups FROM anon, authenticated;
GRANT SELECT ON public.db_backups TO authenticated;

DROP POLICY IF EXISTS db_backups_admin_read ON public.db_backups;
CREATE POLICY db_backups_admin_read ON public.db_backups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Tables included in a backup
CREATE OR REPLACE FUNCTION public._backup_tables()
 RETURNS SETOF text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  SELECT 'public.' || tablename FROM pg_tables WHERE schemaname = 'public'
  UNION ALL SELECT 'auth.users'
  UNION ALL SELECT 'auth.identities'
  ORDER BY 1;
$function$;

-- One table's rows as a JSON array (bytea comes out as \x hex text)
CREATE OR REPLACE FUNCTION public._backup_table_json(p_table text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  s text := split_part(p_table, '.', 1);
  t text := split_part(p_table, '.', 2);
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public._backup_tables() n WHERE n = p_table) THEN
    RAISE EXCEPTION 'Not a backup table: %', p_table;
  END IF;
  EXECUTE format('SELECT coalesce(json_agg(x), ''[]''::json) FROM %I.%I x', s, t) INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public._backup_tables() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._backup_table_json(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._backup_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public._backup_table_json(text) TO service_role;
