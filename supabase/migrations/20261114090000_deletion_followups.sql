-- Account deletion follow-ups
--
-- 1. One welcome ticket per person. When an account is deleted we keep a salted
--    fingerprint (HMAC, not the value) of its email and M-Pesa number. A new
--    account whose email matches, or that later links a matching M-Pesa number,
--    gets no welcome ticket and no invite reward. Gmail dots and +aliases count
--    as the same address.
-- 2. ID photos are kept for 7 years after deletion (privacy policy 3.4, AML
--    record keeping) in an admin-only record, then the nightly media cleanup
--    deletes the files from B2.

SET LOCAL lock_timeout = '5s';

-- Secret salt for fingerprints (stays in the private schema)
INSERT INTO private.app_secrets (name, value)
SELECT 'identity_pepper', encode(extensions.gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM private.app_secrets WHERE name = 'identity_pepper');

CREATE TABLE IF NOT EXISTS public.deleted_identities (
  fingerprint text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('email', 'phone')),
  deleted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deleted_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deleted_identities FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.retained_kyc_records (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  object_keys text[] NOT NULL,
  kyc_status text,
  extracted_dob text,
  kyc_submitted_at timestamptz,
  kyc_reviewed_at timestamptz,
  kyc_reviewed_by uuid,
  account_deleted_at timestamptz NOT NULL DEFAULT now(),
  delete_after timestamptz NOT NULL DEFAULT now() + interval '7 years',
  files_deleted_at timestamptz
);
ALTER TABLE public.retained_kyc_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retained_kyc_records FROM anon, authenticated;
GRANT SELECT ON public.retained_kyc_records TO authenticated;
DROP POLICY IF EXISTS retained_kyc_admin_read ON public.retained_kyc_records;
CREATE POLICY retained_kyc_admin_read ON public.retained_kyc_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_blocked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public._identity_fingerprint(p_kind text, p_value text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v text;
  v_local text;
  v_domain text;
  v_pepper text;
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;
  IF p_kind = 'email' THEN
    v := lower(btrim(p_value));
    IF v LIKE '%@deleted.invalid' OR position('@' IN v) = 0 THEN
      RETURN NULL;
    END IF;
    v_local := split_part(v, '@', 1);
    v_domain := split_part(v, '@', 2);
    v_local := split_part(v_local, '+', 1);
    IF v_domain IN ('gmail.com', 'googlemail.com') THEN
      v_local := replace(v_local, '.', '');
      v_domain := 'gmail.com';
    END IF;
    v := v_local || '@' || v_domain;
  ELSIF p_kind = 'phone' THEN
    v := right(regexp_replace(p_value, '\D', '', 'g'), 9);
    IF length(v) < 9 THEN
      RETURN NULL;
    END IF;
  ELSE
    RETURN NULL;
  END IF;
  SELECT value INTO v_pepper FROM private.app_secrets WHERE name = 'identity_pepper';
  RETURN encode(extensions.hmac(p_kind || ':' || v, v_pepper, 'sha256'), 'hex');
END;
$function$;
REVOKE ALL ON FUNCTION public._identity_fingerprint(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._is_returning_identity(p_email text, p_phone text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM deleted_identities
    WHERE fingerprint IN (public._identity_fingerprint('email', p_email), public._identity_fingerprint('phone', p_phone))
  );
$function$;
REVOKE ALL ON FUNCTION public._is_returning_identity(text, text) FROM PUBLIC, anon, authenticated;

-- New profile, or a newly linked M-Pesa number, that belonged to a deleted account: no welcome ticket
CREATE OR REPLACE FUNCTION public.welcome_ticket_once()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.welcome_blocked OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF public._is_returning_identity(NEW.email, NEW.mpesa_phone) THEN
      NEW.entry_credit := 0;
      NEW.welcome_blocked := true;
    END IF;
  ELSIF NEW.mpesa_phone IS NOT NULL AND NEW.mpesa_phone IS DISTINCT FROM OLD.mpesa_phone
        AND public._is_returning_identity(NULL, NEW.mpesa_phone) THEN
    NEW.entry_credit := 0;
    NEW.welcome_blocked := true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Named to run after the other BEFORE triggers on profiles
DROP TRIGGER IF EXISTS zz_welcome_ticket_once ON public.profiles;
CREATE TRIGGER zz_welcome_ticket_once BEFORE INSERT OR UPDATE OF mpesa_phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.welcome_ticket_once();

-- Invite rewards: none for a returning (previously deleted) person
CREATE OR REPLACE FUNCTION public._reward_referral(p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r referrals%ROWTYPE;
  s record;
  v_deposited numeric;
  v_link text;
  v_recent int;
  v_tag text;
BEGIN
  SELECT * INTO r FROM referrals WHERE referred_id = p_user AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user AND welcome_blocked) THEN
    UPDATE referrals SET status = 'blocked', reason = 'Returning player (account deleted before)' WHERE id = r.id;
    RETURN;
  END IF;
  SELECT COALESCE(referral_enabled, true) AS enabled, COALESCE(referral_reward_kes, 50) AS reward,
         COALESCE(referral_min_deposit_kes, 50) AS min_dep, COALESCE(referral_monthly_cap, 20) AS cap
  INTO s FROM platform_settings LIMIT 1;
  IF NOT COALESCE(s.enabled, true) THEN
    RETURN;
  END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_deposited FROM mpesa_deposits WHERE user_id = p_user AND status = 'completed';
  IF v_deposited < COALESCE(s.min_dep, 50) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = r.referrer_id AND (COALESCE(is_suspended, false) OR COALESCE(is_flagged_fraud, false))) THEN
    UPDATE referrals SET status = 'blocked', reason = 'Inviter account under review' WHERE id = r.id;
    RETURN;
  END IF;
  v_link := _linked_players(r.referrer_id, p_user);
  IF v_link = 'same payment network' THEN
    UPDATE referrals SET status = 'blocked', reason = 'Same payment network as the inviter' WHERE id = r.id;
    PERFORM _flag(r.referrer_id, 'referral_same_network', jsonb_build_object('referred', p_user), 'info');
    RETURN;
  END IF;
  SELECT count(*) INTO v_recent FROM referrals WHERE referrer_id = r.referrer_id AND status = 'rewarded' AND rewarded_at > now() - interval '30 days';
  IF v_recent >= COALESCE(s.cap, 20) THEN
    UPDATE referrals SET status = 'blocked', reason = 'Inviter reached the monthly invite limit' WHERE id = r.id;
    RETURN;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET entry_credit = COALESCE(entry_credit, 0) + s.reward WHERE id IN (r.referrer_id, p_user);
  UPDATE referrals SET status = 'rewarded', reward = s.reward, rewarded_at = now() WHERE id = r.id;

  SELECT gamertag INTO v_tag FROM profiles WHERE id = p_user;
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (r.referrer_id, 'system', 'Invite reward: KES ' || s.reward || ' ticket',
          COALESCE(v_tag, 'Your friend') || ' made their first deposit. You both got KES ' || s.reward || ' of tournament ticket credit.', '/invite'),
         (p_user, 'system', 'Invite reward: KES ' || s.reward || ' ticket',
          'Thanks for joining with an invite. You got KES ' || s.reward || ' of tournament ticket credit.', '/wallet');
END;
$function$;

-- Account deletion now records fingerprints and keeps ID photos for 7 years
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
  v_auth_email text;
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

  -- Fingerprints only (salted hashes), so the same person can't claim a second welcome ticket
  SELECT email INTO v_auth_email FROM auth.users WHERE id = p_uid;
  INSERT INTO deleted_identities (fingerprint, kind)
  SELECT f, k FROM (VALUES
      (public._identity_fingerprint('email', v_auth_email), 'email'),
      (public._identity_fingerprint('email', p.email), 'email'),
      (public._identity_fingerprint('phone', p.mpesa_phone), 'phone'),
      (public._identity_fingerprint('phone', p.phone), 'phone')) AS x(f, k)
  WHERE f IS NOT NULL
  ON CONFLICT (fingerprint) DO NOTHING;

  -- ID photos and the verification record are kept for 7 years (AML), admin-only
  v_keys := ARRAY(SELECT 'kyc/' || k FROM unnest(ARRAY[p.kyc_id_front_path, p.kyc_id_back_path, p.kyc_selfie_path]) k WHERE k IS NOT NULL);
  IF cardinality(v_keys) > 0 OR p.kyc_status IS DISTINCT FROM 'unverified' THEN
    INSERT INTO retained_kyc_records (user_id, object_keys, kyc_status, extracted_dob, kyc_submitted_at, kyc_reviewed_at, kyc_reviewed_by)
    VALUES (p_uid, v_keys, p.kyc_status, p.extracted_dob, p.kyc_submitted_at, p.kyc_reviewed_at, p.kyc_reviewed_by);
  END IF;

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

  -- Nothing for the caller to delete now: the photos are retained
  RETURN jsonb_build_object('media_keys', '[]'::jsonb);
END;
$function$;
REVOKE ALL ON FUNCTION public._delete_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._delete_account(uuid) TO service_role;

-- For the nightly media cleanup: retained ID photos past their 7 years
CREATE OR REPLACE FUNCTION public.retained_kyc_to_delete()
 RETURNS TABLE (id bigint, object_keys text[])
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, object_keys FROM retained_kyc_records
  WHERE files_deleted_at IS NULL AND delete_after <= now()
  ORDER BY delete_after
  LIMIT 200;
$function$;
REVOKE ALL ON FUNCTION public.retained_kyc_to_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retained_kyc_to_delete() TO service_role;
