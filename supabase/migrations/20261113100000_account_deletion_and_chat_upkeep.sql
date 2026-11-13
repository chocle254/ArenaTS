-- 1. Players can delete their account.
--    Money records (transactions, deposits, withdrawals, AML flags) must be kept,
--    and they cascade from profiles, so the account is anonymised rather than
--    deleted: personal data and private content go, the login is closed, and
--    the records stay attached to a nameless "Deleted player".
--    Blocked while the player still has withdrawable or held winnings, or
--    anything in progress (tournaments, challenges, disputes, withdrawals).
-- 2. World Chat upkeep: messages older than 7 days are removed nightly (pg_cron,
--    inside the database), and slow mode allows one message per 5 seconds.

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ID photo files the edge function couldn't remove from B2 (admins retry these)
CREATE TABLE IF NOT EXISTS public.media_delete_failures (
  id bigserial PRIMARY KEY,
  object_key text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.media_delete_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_delete_failures FROM anon, authenticated;

-- What stops this player deleting their account right now (empty = nothing)
CREATE OR REPLACE FUNCTION public._account_deletion_blockers(p_uid uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p profiles%ROWTYPE;
  r text[] := '{}';
BEGIN
  SELECT * INTO p FROM profiles WHERE id = p_uid;
  IF NOT FOUND OR p.deleted_at IS NOT NULL THEN
    RETURN ARRAY['This account is already deleted.'];
  END IF;
  IF p.role = 'admin' THEN
    r := array_append(r, 'Admin accounts can''t be deleted here. Ask another admin to remove your admin role first.');
  END IF;
  IF COALESCE(p.available_balance, 0) >= 10 THEN
    r := array_append(r, format('Withdraw your winnings first (KES %s).', to_char(p.available_balance, 'FM999,999,990.00')));
  END IF;
  IF COALESCE(p.pending_balance, 0) > 0
     OR EXISTS (SELECT 1 FROM held_winnings WHERE user_id = p_uid AND status IN ('held', 'frozen')) THEN
    r := array_append(r, 'You have winnings on hold. Wait for them to clear, then withdraw them.');
  END IF;
  IF EXISTS (SELECT 1 FROM mpesa_withdrawals WHERE user_id = p_uid AND status IN ('review', 'queued', 'processing')) THEN
    r := array_append(r, 'A withdrawal is still on its way. Wait until it completes.');
  END IF;
  IF EXISTS (SELECT 1 FROM mpesa_deposits WHERE user_id = p_uid AND status NOT IN ('completed', 'failed', 'cancelled')) THEN
    r := array_append(r, 'A deposit is still being processed. Wait a few minutes.');
  END IF;
  IF EXISTS (SELECT 1 FROM tournament_participants tp JOIN tournaments t ON t.id = tp.tournament_id
             WHERE tp.user_id = p_uid AND t.status IN ('open', 'active')) THEN
    r := array_append(r, 'You''re in a tournament that hasn''t finished. Leave it or play it out first.');
  END IF;
  IF EXISTS (SELECT 1 FROM tournaments WHERE created_by = p_uid AND status IN ('open', 'active')) THEN
    r := array_append(r, 'A tournament you host hasn''t finished yet.');
  END IF;
  IF EXISTS (SELECT 1 FROM challenges WHERE p_uid IN (challenger_id, opponent_id)
             AND status NOT IN ('cancelled', 'completed', 'declined', 'expired')) THEN
    r := array_append(r, 'You have a challenge in progress. Finish or cancel it first.');
  END IF;
  IF EXISTS (SELECT 1 FROM match_disputes WHERE p_uid IN (player1_id, player2_id) AND status NOT IN ('decided', 'void')) THEN
    r := array_append(r, 'You have a dispute that hasn''t been decided yet.');
  END IF;
  RETURN r;
END;
$function$;
REVOKE ALL ON FUNCTION public._account_deletion_blockers(uuid) FROM PUBLIC, anon, authenticated;

-- For the Settings page
CREATE OR REPLACE FUNCTION public.account_deletion_blockers()
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN auth.uid() IS NULL THEN ARRAY['Sign in first.'] ELSE public._account_deletion_blockers(auth.uid()) END;
$function$;
REVOKE ALL ON FUNCTION public.account_deletion_blockers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_deletion_blockers() TO authenticated;

-- Anonymise the account. Called by the delete-account edge function (service
-- role) after it has checked who is asking. Returns the ID photo keys on B2 so
-- the function can remove the files.
CREATE OR REPLACE FUNCTION public._delete_account(p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p profiles%ROWTYPE;
  v_blockers text[];
  v_keys text[];
  v_tag text := 'deleted-' || substr(replace(p_uid::text, '-', ''), 1, 10);
BEGIN
  SELECT * INTO p FROM profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
  v_blockers := public._account_deletion_blockers(p_uid);
  IF cardinality(v_blockers) > 0 THEN
    RAISE EXCEPTION '%', array_to_string(v_blockers, ' ');
  END IF;

  -- Run as the server from here on, so player-facing guards (e.g. locked in-game IDs) let the cleanup through
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  v_keys := ARRAY(SELECT 'kyc/' || k FROM unnest(ARRAY[p.kyc_id_front_path, p.kyc_id_back_path, p.kyc_selfie_path]) k WHERE k IS NOT NULL);

  -- Private content and social links
  DELETE FROM world_chat_messages WHERE user_id = p_uid;
  DELETE FROM direct_messages WHERE p_uid IN (sender_id, receiver_id);
  DELETE FROM friendships WHERE p_uid IN (user_id, friend_id);
  DELETE FROM friend_requests WHERE p_uid IN (sender_id, receiver_id);
  DELETE FROM notifications WHERE user_id = p_uid;
  UPDATE notifications SET sender_id = NULL WHERE sender_id = p_uid;
  DELETE FROM gamertags WHERE user_id = p_uid;
  DELETE FROM game_accounts WHERE user_id = p_uid;
  DELETE FROM tournament_reminders WHERE user_id = p_uid;
  DELETE FROM match_streams WHERE user_id = p_uid;
  DELETE FROM community_messages WHERE user_id = p_uid;
  DELETE FROM user_feedback WHERE user_id = p_uid;
  UPDATE tournament_participants SET gamertag = 'Deleted player' WHERE user_id = p_uid;

  -- The profile keeps its id (money records point at it) and nothing personal
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET
    email = NULL, phone = NULL, full_name = NULL, username = v_tag, gamertag = v_tag,
    avatar_url = NULL, bio = NULL, location = NULL, timezone = NULL, favorite_games = '{}',
    twitch_handle = NULL, efootball_id = NULL, pubg_id = NULL,
    mpesa_phone = NULL, mpesa_phone_locked_until = NULL,
    kyc_status = 'unverified', kyc_rejection_reason = NULL, extracted_dob = NULL,
    kyc_id_front_path = NULL, kyc_id_back_path = NULL, kyc_selfie_path = NULL,
    organizer_name = NULL, referral_code = v_tag, email_notifications_opt_in = false,
    stripe_customer_id = NULL, stripe_connect_account_id = NULL,
    last_seen_at = NULL, banned_until = '2999-01-01', ban_reason = 'Account deleted by the player',
    deleted_at = now(), updated_at = now()
  WHERE id = p_uid;

  -- Close the login: no email, password, phone or Google link; signed out everywhere
  DELETE FROM auth.identities WHERE user_id = p_uid;
  DELETE FROM auth.sessions WHERE user_id = p_uid;
  DELETE FROM auth.mfa_factors WHERE user_id = p_uid;
  UPDATE auth.users SET
    email = v_tag || '@deleted.invalid', phone = NULL, encrypted_password = '',
    raw_user_meta_data = '{}'::jsonb, banned_until = '2999-01-01', updated_at = now()
  WHERE id = p_uid;

  RETURN jsonb_build_object('media_keys', to_jsonb(v_keys));
END;
$function$;
REVOKE ALL ON FUNCTION public._delete_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._delete_account(uuid) TO service_role;

-- World Chat slow mode: one message every 5 seconds per player
CREATE OR REPLACE FUNCTION public.world_chat_slow_mode()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT max(created_at) INTO v_last FROM world_chat_messages
  WHERE user_id = NEW.user_id AND created_at > now() - interval '5 seconds';
  IF v_last IS NOT NULL THEN
    RAISE EXCEPTION 'Slow mode: wait % more second(s) before sending again.',
      GREATEST(1, ceil(extract(epoch FROM (v_last + interval '5 seconds' - now()))))::int;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS b_world_chat_slow_mode ON public.world_chat_messages;
CREATE TRIGGER b_world_chat_slow_mode BEFORE INSERT ON public.world_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.world_chat_slow_mode();

-- Nightly: drop World Chat messages older than 7 days (runs in the database, 03:30 UTC)
SELECT cron.unschedule('world-chat-7-day-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'world-chat-7-day-cleanup');
SELECT cron.schedule('world-chat-7-day-cleanup', '30 3 * * *',
  $$DELETE FROM public.world_chat_messages WHERE created_at < now() - interval '7 days'$$);
