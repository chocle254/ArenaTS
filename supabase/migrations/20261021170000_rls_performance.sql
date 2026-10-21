-- ============================================================================
-- Faster row-level security under load
-- ============================================================================
-- 117 policies called auth.uid() / has_role(auth.uid(), ...) once per row.
-- Wrapping them in (SELECT ...) makes Postgres evaluate them once per query
-- (an InitPlan), which matters when many players are online at once.
-- Policies keep their exact meaning; only the evaluation changes.
-- ============================================================================
DO $$
DECLARE
  p record;
  v_qual text;
  v_check text;
  v_sql text;
  n int := 0;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (COALESCE(qual, '') || COALESCE(with_check, '')) ~ 'auth\.(uid|role|jwt)\(\)'
  LOOP
    v_qual := p.qual;
    v_check := p.with_check;
    -- auth.uid() -> (SELECT auth.uid()), skipping ones already wrapped
    v_qual := regexp_replace(v_qual, '(?<!SELECT )auth\.(uid|role|jwt)\(\)', '(SELECT auth.\1())', 'g');
    v_check := regexp_replace(v_check, '(?<!SELECT )auth\.(uid|role|jwt)\(\)', '(SELECT auth.\1())', 'g');
    -- role checks that don't depend on the row: evaluate once
    v_qual := regexp_replace(v_qual, '(?<!SELECT )(has_role|get_user_role)\(\(SELECT auth\.uid\(\)\)(, ''[a-z_]+''::text)?\)', '(SELECT \1((SELECT auth.uid())\2))', 'g');
    v_check := regexp_replace(v_check, '(?<!SELECT )(has_role|get_user_role)\(\(SELECT auth\.uid\(\)\)(, ''[a-z_]+''::text)?\)', '(SELECT \1((SELECT auth.uid())\2))', 'g');

    IF v_qual IS NOT DISTINCT FROM p.qual AND v_check IS NOT DISTINCT FROM p.with_check THEN
      CONTINUE;
    END IF;
    v_sql := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF v_qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_qual);
    END IF;
    IF v_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;
    EXECUTE v_sql;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'rewrote % policies', n;
END $$;
