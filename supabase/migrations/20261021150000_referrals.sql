-- ============================================================================
-- Referrals: invite a friend, both get ticket credit after their first deposit
-- ============================================================================
-- Every player has an invite code (profiles.referral_code). A friend who signs
-- up with it (/sign-up?ref=CODE, or enters it within 7 days) is linked to the
-- inviter. When the friend's completed M-Pesa deposits reach
-- referral_min_deposit_kes, both get referral_reward_kes of entry_credit (the
-- same ticket credit as the welcome ticket: official tournaments only, can't be
-- withdrawn, never pays a creator). So a fake account costs a real deposit on
-- its own M-Pesa number (one number per account) and pays out nothing
-- withdrawable.
--
-- No reward when the two accounts share a payment network (IP on deposits or
-- withdrawals), the inviter is suspended or flagged, or the inviter already has
-- referral_monthly_cap rewards in the last 30 days.
-- ============================================================================

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS referral_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS referral_reward_kes numeric NOT NULL DEFAULT 50 CHECK (referral_reward_kes >= 0),
  ADD COLUMN IF NOT EXISTS referral_min_deposit_kes numeric NOT NULL DEFAULT 50 CHECK (referral_min_deposit_kes >= 0),
  ADD COLUMN IF NOT EXISTS referral_monthly_cap int NOT NULL DEFAULT 20 CHECK (referral_monthly_cap >= 0);

-- Short codes without look-alike characters (no 0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public._new_referral_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
BEGIN
  LOOP
    SELECT string_agg(substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1), '') INTO v_code FROM generate_series(1, 6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.profiles SET referral_code = public._new_referral_code() WHERE referral_code IS NULL;
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT public._new_referral_code();
ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by) WHERE referred_by IS NOT NULL;

-- Users can't edit their own code or who invited them
DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.protect_profile_sensitive_columns()'::regprocedure);
  IF position('''referral_code''' in d) = 0 THEN
    EXECUTE replace(d, $q$'organizer_name', 'entry_credit'$q$, $q$'organizer_name', 'entry_credit', 'referral_code', 'referred_by'$q$);
  END IF;
END $do$;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'blocked')),
  reason text,
  reward numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  CHECK (referrer_id <> referred_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id, created_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "See your own referrals" ON public.referrals;
CREATE POLICY "See your own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() IN (referrer_id, referred_id) OR has_role(auth.uid(), 'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.referrals FROM anon, authenticated;
GRANT SELECT ON public.referrals TO authenticated;

-- Link p_user to the owner of p_code. Returns NULL on success, else why not.
CREATE OR REPLACE FUNCTION public._apply_referral(p_user uuid, p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer uuid;
BEGIN
  p_code := upper(btrim(COALESCE(p_code, '')));
  IF p_code = '' THEN
    RETURN 'Enter an invite code';
  END IF;
  IF NOT COALESCE((SELECT referral_enabled FROM platform_settings LIMIT 1), true) THEN
    RETURN 'Invites are paused right now';
  END IF;
  SELECT id INTO v_referrer FROM profiles WHERE referral_code = p_code;
  IF v_referrer IS NULL THEN
    RETURN 'That invite code doesn''t exist';
  END IF;
  IF v_referrer = p_user THEN
    RETURN 'You can''t use your own invite code';
  END IF;
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_user) OR EXISTS (SELECT 1 FROM profiles WHERE id = p_user AND referred_by IS NOT NULL) THEN
    RETURN 'You''ve already used an invite code';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_referrer AND referred_by = p_user) THEN
    RETURN 'You invited this player, so you can''t use their code';
  END IF;
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET referred_by = v_referrer WHERE id = p_user;
  INSERT INTO referrals (referrer_id, referred_id) VALUES (v_referrer, p_user);
  RETURN NULL;
END;
$$;

-- For players who signed up with Google/Discord/Twitch or forgot the code:
-- they can add it within 7 days, before their first completed deposit.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_err text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND created_at < now() - interval '7 days') THEN
    RAISE EXCEPTION 'Invite codes can only be added in your first 7 days';
  END IF;
  IF EXISTS (SELECT 1 FROM mpesa_deposits WHERE user_id = v_uid AND status = 'completed') THEN
    RAISE EXCEPTION 'Invite codes have to be added before your first deposit';
  END IF;
  v_err := _apply_referral(v_uid, p_code);
  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION '%', v_err;
  END IF;
END;
$$;

-- Email sign-up passes the code in the user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NULLIF(btrim(NEW.raw_user_meta_data->>'referral_code'), '') IS NOT NULL
     AND EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    PERFORM _apply_referral(NEW.id, NEW.raw_user_meta_data->>'referral_code');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A bad code must never block sign-up
  RAISE WARNING 'referral on sign-up failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Named to run after on_auth_user_created (triggers fire in name order)
DROP TRIGGER IF EXISTS zz_on_auth_user_referral ON auth.users;
CREATE TRIGGER zz_on_auth_user_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_referral();

-- Pay both sides once the friend's deposits reach the minimum
CREATE OR REPLACE FUNCTION public._reward_referral(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.handle_deposit_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    BEGIN
      PERFORM _reward_referral(NEW.user_id);
    EXCEPTION WHEN OTHERS THEN
      -- Never let a referral problem undo a deposit
      RAISE WARNING 'referral reward failed for %: %', NEW.user_id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_deposit_referral ON public.mpesa_deposits;
CREATE TRIGGER on_deposit_referral
  AFTER UPDATE OF status ON public.mpesa_deposits
  FOR EACH ROW EXECUTE FUNCTION public.handle_deposit_referral();

-- What the invite page shows
CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'code', p.referral_code,
    'enabled', COALESCE(s.referral_enabled, true),
    'reward', COALESCE(s.referral_reward_kes, 50),
    'min_deposit', COALESCE(s.referral_min_deposit_kes, 50),
    'monthly_cap', COALESCE(s.referral_monthly_cap, 20),
    'can_add_code', p.referred_by IS NULL AND p.created_at > now() - interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM mpesa_deposits d WHERE d.user_id = p.id AND d.status = 'completed'),
    'invited_by', (SELECT gamertag FROM profiles x WHERE x.id = p.referred_by),
    'earned', (SELECT COALESCE(sum(reward), 0) FROM referrals WHERE referrer_id = p.id AND status = 'rewarded'),
    'friends', COALESCE((
      SELECT json_agg(json_build_object('gamertag', f.gamertag, 'avatar_url', f.avatar_url, 'status', r.status,
                                        'reason', r.reason, 'reward', r.reward, 'joined_at', r.created_at) ORDER BY r.created_at DESC)
      FROM referrals r JOIN profiles f ON f.id = r.referred_id WHERE r.referrer_id = p.id), '[]'::json)
  )
  FROM profiles p LEFT JOIN platform_settings s ON true
  WHERE p.id = auth.uid();
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN ('_apply_referral', '_reward_referral', 'handle_new_user_referral',
                               'handle_deposit_referral', 'apply_referral_code', 'get_my_referrals')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname IN ('apply_referral_code', 'get_my_referrals') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
