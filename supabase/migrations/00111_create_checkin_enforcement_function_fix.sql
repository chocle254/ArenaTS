-- Remove old conflicting function
DROP FUNCTION IF EXISTS enforce_check_in_deadlines();

-- ── Cron-callable wrapper ─────────────────────────────────────────────────
-- Schedule this to run every 30–60 seconds via pg_cron or a Supabase
-- Edge Function on a schedule. It finds all pending matches whose
-- check-in window has expired and processes each one.
CREATE OR REPLACE FUNCTION process_expired_check_ins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match record;
BEGIN
  FOR v_match IN
    SELECT id
    FROM match_results
    WHERE status = 'pending'
      AND check_in_deadline IS NOT NULL
      AND check_in_deadline < now()
      -- Skip matches where both players already checked in
      -- (they should transition via the both_players_ready trigger instead)
      AND NOT (
        COALESCE(player1_checked_in, false)
        AND COALESCE(player2_checked_in, false)
      )
    ORDER BY check_in_deadline ASC  -- Process oldest expired matches first
  LOOP
    -- Delegate to the canonical per-match handler (defined in 00104)
    PERFORM handle_match_check_in_timeout(v_match.id);
  END LOOP;
END;
$$;
