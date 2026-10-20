-- ============================================================================
-- EMERGENCY: lock down internal functions
-- ============================================================================
-- Every SECURITY DEFINER function in public was executable by anon and
-- authenticated (Postgres grants EXECUTE to PUBLIC by default). That meant
-- anyone, without signing in, could call for example:
--   update_user_balance(<any user>, 1000000, 'available')  -> free withdrawable money
--   increment_arena_currency(<any user>, 1000000)
--   distribute_challenge_prizes / refund_tournament_entry_fees / generate_tournament_brackets
--   withdraw_platform_revenue, flag_fraud, risk scans, cleanups
-- These are only ever called by edge functions (service role) or by other
-- database functions, so they are revoked from PUBLIC, anon and authenticated
-- and granted to service_role only.
--
-- Functions the app calls directly stay available to signed-in users only.
-- Functions used inside row level security policies keep their grants.
-- create_notification is restricted to signed-in users and in-app links.
-- ============================================================================

DO $$
DECLARE
  r record;
  internal text[] := ARRAY[
    'increment_arena_currency', 'update_user_balance', 'withdraw_arena_currency',
    'withdraw_available_balance', 'transfer_pending_to_available', 'distribute_arena_prizes',
    'distribute_challenge_prizes', 'refund_tournament_entry_fees', 'generate_tournament_brackets',
    'flag_fraud', 'withdraw_platform_revenue', '_run_risk_scan_internal', 'run_risk_scan',
    'detect_collusion_patterns', 'detect_deposit_and_run', 'check_dispute_fraud_patterns',
    'check_report_fraud_patterns', 'check_transaction_fraud_patterns', 'cleanup_expired_otps',
    'cleanup_old_rate_limits', 'send_tournament_reminders', 'process_expired_check_ins',
    'expire_stale_team_invites', 'rls_auto_enable', 'calculate_prize_pool'
  ];
  app_called text[] := ARRAY[
    'accept_challenge', 'accept_team_invite', 'decline_team_invite', 'admin_override_match',
    'confirm_match_result', 'create_challenge', 'check_and_cancel_insufficient_tournaments',
    'check_and_update_tournament_status', 'expire_old_challenges', 'get_due_reminders',
    'handle_match_check_in_timeout', 'mark_all_notifications_read', 'mark_notification_read',
    'mark_reminder_sent', 'transfer_cash_to_arena_currency', 'get_unread_notification_count',
    'get_tournament_status', 'create_notification', '_is_match_official'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND (p.proname = ANY (internal) OR p.proname = ANY (app_called))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = ANY (app_called) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

-- Notifications: signed-in senders only, short text, links inside the app only
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_link IS NOT NULL AND (left(p_link, 1) <> '/' OR left(p_link, 2) = '//') THEN
    p_link := NULL;
  END IF;
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, left(coalesce(p_type, 'system'), 40), left(coalesce(p_title, ''), 120), left(coalesce(p_message, ''), 500), p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) TO authenticated, service_role;
