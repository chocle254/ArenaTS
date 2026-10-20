-- ============================================================================
-- KES wallet, M-Pesa (UpesiPay) payments, anti-money-laundering controls
-- ============================================================================
-- Money model (all amounts in Kenyan shillings from here on)
--   profiles.arena_currency     Play balance. Deposits land here. Spent on
--                               entries and stakes. NOT withdrawable.
--   profiles.pending_balance    Winnings on hold (24h by default) while
--                               anti-laundering checks run.
--   profiles.available_balance  Winnings. The only withdrawable balance.
--                               Can also be moved into the play balance.
--   Withdrawals only go to the account's own M-Pesa number (the number that
--   deposits came from). One number per account.
--
-- Fixes included
--   * handle_challenge_refund credited refunds to BOTH play and withdrawable
--     balances: free money, and a way to turn deposits into cash-out.
--   * Users could set their own kyc_status to 'verified' and clear fraud flags.
--   * Anyone could insert rows into transactions.
--   * Prize/fee functions mixed AC, cents and dollars.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Settings and new columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS currency_migrated_kes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kes_per_usd numeric NOT NULL DEFAULT 129.90,
  ADD COLUMN IF NOT EXISTS deposit_fee_bps integer NOT NULL DEFAULT 450,
  ADD COLUMN IF NOT EXISTS winnings_hold_hours integer NOT NULL DEFAULT 24;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mpesa_phone text,
  ADD COLUMN IF NOT EXISTS mpesa_phone_locked_until timestamptz,
  -- Companies, brands and event hosts approved by an admin: no prize caps
  ADD COLUMN IF NOT EXISTS organizer_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS organizer_name text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_mpesa_phone_key ON public.profiles (mpesa_phone) WHERE mpesa_phone IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. One-time switch to KES (runs once): wallets reset, records converted
--    100 AC = $1, $1 = KES 129.90 (Trading Economics, 19 Oct 2026)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_rate numeric;
  v_done boolean;
BEGIN
  SELECT currency_migrated_kes, kes_per_usd INTO v_done, v_rate FROM platform_settings LIMIT 1;
  IF v_done IS DISTINCT FROM false THEN
    RETURN;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  -- Launch reset (owner's decision): pre-launch wallets held only test money,
  -- so every wallet starts at KES 0. Lifetime earnings convert for leaderboards.
  UPDATE profiles SET
    arena_currency    = 0,
    available_balance = 0,
    pending_balance   = 0,
    total_earnings    = round(COALESCE(total_earnings, 0) * v_rate, 2),
    currency          = 'KES';

  UPDATE tournaments SET
    entry_fee            = round(COALESCE(entry_fee, 0) / 100.0 * v_rate, 2),
    prize_pool           = round(COALESCE(prize_pool, 0) / 100.0 * v_rate, 2),
    creator_contribution = round(COALESCE(creator_contribution, 0) / 100.0 * v_rate, 2);

  UPDATE tournament_participants SET amount_paid = round(COALESCE(amount_paid, 0) / 100.0 * v_rate, 2);

  UPDATE challenges SET
    stake_amount = round(stake_amount / 100.0 * v_rate, 2),
    prize_pool   = round(COALESCE(prize_pool, 0) / 100.0 * v_rate, 2),
    platform_fee = round(COALESCE(platform_fee, 0) / 100.0 * v_rate, 2);

  UPDATE transactions SET
    amount   = round(CASE WHEN currency = 'AC' THEN amount / 100.0 * v_rate ELSE amount * v_rate END, 2),
    currency = 'KES';

  UPDATE withdrawals SET amount = round(amount * v_rate, 2), currency = 'KES' WHERE COALESCE(currency, 'USD') <> 'KES';

  UPDATE platform_settings SET
    maintenance_balance = 0,
    currency_migrated_kes = true;

  PERFORM set_config('app.bypass_profile_protection', 'false', true);
END $$;

-- ---------------------------------------------------------------------------
-- 3. Ledger tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mpesa_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  fee numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  purpose text NOT NULL DEFAULT 'wallet',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'timeout')),
  checkout_request_id text UNIQUE,
  merchant_request_id text,
  reference_id text,
  provider_payload jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS mpesa_deposits_user_idx ON public.mpesa_deposits (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mpesa_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  charge numeric,
  status text NOT NULL CHECK (status IN ('review', 'queued', 'processing', 'completed', 'failed', 'rejected')),
  flags text[] NOT NULL DEFAULT '{}',
  provider_id text,
  mpesa_receipt text,
  failure_reason text,
  ip text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mpesa_withdrawals_user_idx ON public.mpesa_withdrawals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mpesa_withdrawals_status_idx ON public.mpesa_withdrawals (status) WHERE status IN ('review', 'queued', 'processing');

CREATE TABLE IF NOT EXISTS public.held_winnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  source text NOT NULL,
  source_id uuid,
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'frozen', 'reversed')),
  reason text,
  release_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);
CREATE INDEX IF NOT EXISTS held_winnings_due_idx ON public.held_winnings (release_at) WHERE status = 'held';
CREATE INDEX IF NOT EXISTS held_winnings_user_idx ON public.held_winnings (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.aml_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'review' CHECK (severity IN ('info', 'review', 'block')),
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  resolution text
);
CREATE INDEX IF NOT EXISTS aml_flags_open_idx ON public.aml_flags (user_id) WHERE resolved_at IS NULL;

ALTER TABLE public.mpesa_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.held_winnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_flags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mpesa_deposits' AND policyname = 'Own deposits') THEN
    CREATE POLICY "Own deposits" ON public.mpesa_deposits FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mpesa_withdrawals' AND policyname = 'Own withdrawals') THEN
    CREATE POLICY "Own withdrawals" ON public.mpesa_withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'held_winnings' AND policyname = 'Own holds') THEN
    CREATE POLICY "Own holds" ON public.held_winnings FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'aml_flags' AND policyname = 'Admins read flags') THEN
    CREATE POLICY "Admins read flags" ON public.aml_flags FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Transactions: only server code writes history
ALTER POLICY "System can insert transactions" ON public.transactions TO service_role;

-- Legacy mismatches from the conversion become review flags
INSERT INTO public.aml_flags (user_id, kind, detail)
SELECT p.id, 'legacy_balance_mismatch', jsonb_build_object('note', 'Withdrawable balance larger than recorded earnings before the KES switch')
FROM public.profiles p
WHERE COALESCE(p.available_balance, 0) > COALESCE(p.total_earnings, 0) + 1
  AND NOT EXISTS (SELECT 1 FROM public.aml_flags f WHERE f.user_id = p.id AND f.kind = 'legacy_balance_mismatch');

-- ---------------------------------------------------------------------------
-- 4. Profile protection: money, KYC, fraud and payout number are server-only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_role text;
  v_old jsonb;
  v_new jsonb;
  v_col text;
  v_protected text[] := ARRAY[
    'role', 'total_earnings', 'arena_currency', 'available_balance', 'pending_balance',
    'wins', 'losses', 'win_rate', 'current_streak', 'longest_streak', 'global_rank',
    'tournaments_won', 'tournaments_played', 'is_suspended', 'suspension_until', 'banned_until', 'ban_reason', 'rating',
    'is_flagged_fraud', 'fraud_flag_reason', 'fraud_flagged_at', 'fraud_resolved_at', 'fraud_resolved_by',
    'kyc_reviewed_at', 'kyc_reviewed_by', 'kyc_rejection_reason', 'mpesa_phone', 'mpesa_phone_locked_until',
    'stripe_customer_id', 'stripe_connect_account_id', 'disputes_filed', 'disputes_won', 'currency',
    'organizer_verified', 'organizer_name'
  ];
BEGIN
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT p.role::text INTO v_user_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_user_role = 'admin' THEN
    RETURN NEW;
  END IF;
  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);
  FOREACH v_col IN ARRAY v_protected LOOP
    IF (v_new -> v_col) IS DISTINCT FROM (v_old -> v_col) THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify sensitive account fields (%).', v_col
        USING ERRCODE = '42501';
    END IF;
  END LOOP;
  -- Users may only submit KYC for review, never approve it
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     AND NOT (NEW.kyc_status = 'pending' AND COALESCE(OLD.kyc_status, 'unverified') IN ('unverified', 'rejected')) THEN
    RAISE EXCEPTION 'Unauthorized attempt to modify sensitive account fields (kyc_status).' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Internal helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._normalize_ke_phone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN d ~ '^254(7|1)[0-9]{8}$' THEN d
    WHEN d ~ '^0(7|1)[0-9]{8}$' THEN '254' || substr(d, 2)
    WHEN d ~ '^(7|1)[0-9]{8}$' THEN '254' || d
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') AS d) x;
$$;

CREATE OR REPLACE FUNCTION public._flag(p_user uuid, p_kind text, p_detail jsonb, p_severity text DEFAULT 'review')
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO aml_flags (user_id, kind, severity, detail) VALUES (p_user, p_kind, p_severity, COALESCE(p_detail, '{}'));
$$;

-- Credit winnings on hold. They move to available_balance once released.
CREATE OR REPLACE FUNCTION public._credit_held(p_user uuid, p_amount numeric, p_source text, p_source_id uuid, p_status text DEFAULT 'held', p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_hours int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(winnings_hold_hours, 24) INTO v_hours FROM platform_settings LIMIT 1;
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  -- Everyday wins under KES 1,000 are withdrawable straight away (unless frozen
  -- for review or the account has an open flag)
  IF p_status = 'held' AND p_amount < 1000
     AND NOT EXISTS (SELECT 1 FROM aml_flags f WHERE f.user_id = p_user AND f.resolved_at IS NULL AND f.severity <> 'info')
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user AND COALESCE(is_flagged_fraud, false)) THEN
    UPDATE profiles SET available_balance = COALESCE(available_balance, 0) + p_amount WHERE id = p_user;
    INSERT INTO held_winnings (user_id, amount, source, source_id, status, reason, release_at, released_at)
    VALUES (p_user, p_amount, p_source, p_source_id, 'released', 'Under KES 1,000: paid instantly', now(), now())
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
  UPDATE profiles SET pending_balance = COALESCE(pending_balance, 0) + p_amount WHERE id = p_user;
  INSERT INTO held_winnings (user_id, amount, source, source_id, status, reason, release_at)
  VALUES (p_user, p_amount, p_source, p_source_id, p_status, p_reason, now() + make_interval(hours => COALESCE(v_hours, 24)))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Release holds that are due, unless the account has open flags
CREATE OR REPLACE FUNCTION public.release_held_winnings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  FOR r IN
    SELECT h.* FROM held_winnings h
    JOIN profiles p ON p.id = h.user_id
    WHERE h.status = 'held' AND h.release_at <= now()
      AND NOT COALESCE(p.is_flagged_fraud, false)
      AND NOT EXISTS (SELECT 1 FROM aml_flags f WHERE f.user_id = h.user_id AND f.resolved_at IS NULL AND f.severity <> 'info')
    FOR UPDATE OF h SKIP LOCKED
  LOOP
    UPDATE profiles
    SET pending_balance = GREATEST(COALESCE(pending_balance, 0) - r.amount, 0),
        available_balance = COALESCE(available_balance, 0) + r.amount
    WHERE id = r.user_id;
    UPDATE held_winnings SET status = 'released', released_at = now() WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Admin: release or reverse a hold, resolve a flag
CREATE OR REPLACE FUNCTION public.admin_resolve_hold(p_hold_id uuid, p_release boolean, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  h held_winnings%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO h FROM held_winnings WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND OR h.status NOT IN ('held', 'frozen') THEN
    RAISE EXCEPTION 'This hold is already settled';
  END IF;
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  IF p_release THEN
    UPDATE profiles SET pending_balance = GREATEST(COALESCE(pending_balance, 0) - h.amount, 0), available_balance = COALESCE(available_balance, 0) + h.amount WHERE id = h.user_id;
    UPDATE held_winnings SET status = 'released', released_at = now(), reason = COALESCE(p_note, reason) WHERE id = h.id;
  ELSE
    UPDATE profiles SET pending_balance = GREATEST(COALESCE(pending_balance, 0) - h.amount, 0) WHERE id = h.user_id;
    UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + h.amount WHERE id = (SELECT id FROM platform_settings LIMIT 1);
    UPDATE held_winnings SET status = 'reversed', released_at = now(), reason = COALESCE(p_note, 'Reversed by admin') WHERE id = h.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_flag(p_flag_id uuid, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  UPDATE aml_flags SET resolved_at = now(), resolved_by = auth.uid(), resolution = left(p_note, 500) WHERE id = p_flag_id AND resolved_at IS NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Quick matches: limits, payouts on hold, refunds to play balance only
-- ---------------------------------------------------------------------------
-- Limits (KES)
--   stake 50 to 2,000 per player
--   same two players: at most 3 matches per 24h and KES 6,000 staked per 7 days
CREATE OR REPLACE FUNCTION public._check_pair_limits(p_a uuid, p_b uuid, p_stake numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_kyc text;
  v_day int;
  v_week numeric;
BEGIN
  IF p_stake IS NULL OR p_stake < 50 OR p_stake > 2000 THEN
    RAISE EXCEPTION 'Stake must be between KES 50 and KES 2,000';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id IN (p_a, p_b) AND (COALESCE(is_flagged_fraud, false) OR COALESCE(is_suspended, false))) THEN
    RAISE EXCEPTION 'This match can''t be played for money right now. Try another opponent.';
  END IF;
  SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours'), COALESCE(sum(stake_amount), 0)
  INTO v_day, v_week
  FROM challenges
  WHERE ((challenger_id = p_a AND opponent_id = p_b) OR (challenger_id = p_b AND opponent_id = p_a))
    AND status NOT IN ('declined', 'expired', 'cancelled')
    AND created_at > now() - interval '7 days';
  IF v_day >= 3 THEN
    RAISE EXCEPTION 'You''ve played this opponent for money 3 times today. Play someone new, or rematch tomorrow.';
  END IF;
  IF v_week + p_stake > 6000 THEN
    RAISE EXCEPTION 'You''ve hit this week''s money-match limit with this opponent. Play someone new for now.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_challenge(p_opponent_id uuid, p_game text, p_stake numeric, p_opponent_team_id uuid DEFAULT NULL, p_challenger_team_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_balance numeric;
  v_opponent_tag text;
  v_total numeric;
  v_fee numeric;
  v_challenge_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_opponent_id IS NULL OR p_opponent_id = v_uid THEN
    RAISE EXCEPTION 'Choose another player to challenge';
  END IF;
  p_stake := round(p_stake);
  SELECT gamertag INTO v_opponent_tag FROM profiles WHERE id = p_opponent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That player no longer exists';
  END IF;
  PERFORM _check_pair_limits(v_uid, p_opponent_id, p_stake);

  SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < p_stake THEN
    RAISE EXCEPTION 'Not enough in your play balance. Top up with M-Pesa first.';
  END IF;

  v_total := p_stake * 2;
  v_fee := round(v_total * 0.10, 2);

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) - p_stake WHERE id = v_uid;

  INSERT INTO challenges (challenger_id, opponent_id, game, stake_amount, prize_pool, platform_fee, expires_at, status, challenger_team_id, opponent_team_id)
  VALUES (v_uid, p_opponent_id, p_game, p_stake, v_total - v_fee, v_fee, now() + interval '5 minutes', 'pending', p_challenger_team_id, p_opponent_team_id)
  RETURNING id INTO v_challenge_id;

  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
  VALUES (v_uid, 'challenge_fee', -p_stake, 'Stake for challenge to: ' || COALESCE(v_opponent_tag, 'player'), 'completed', v_challenge_id, 'KES');

  RETURN v_challenge_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_challenge(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_challenge record;
  v_balance numeric;
  v_kyc text;
  v_challenger_tag text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF v_challenge.opponent_id <> v_uid THEN
    RAISE EXCEPTION 'This challenge was not sent to you' USING ERRCODE = '42501';
  END IF;
  IF v_challenge.status <> 'pending' THEN
    RAISE EXCEPTION 'This challenge is no longer open';
  END IF;
  IF v_challenge.expires_at IS NOT NULL AND v_challenge.expires_at <= now() THEN
    RAISE EXCEPTION 'Challenge expired';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND (COALESCE(is_flagged_fraud, false) OR COALESCE(is_suspended, false))) THEN
    RAISE EXCEPTION 'Your account is under review. Try again later.';
  END IF;

  SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < v_challenge.stake_amount THEN
    RAISE EXCEPTION 'Not enough in your play balance. Top up with M-Pesa first.';
  END IF;

  SELECT gamertag INTO v_challenger_tag FROM profiles WHERE id = v_challenge.challenger_id;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) - v_challenge.stake_amount WHERE id = v_uid;

  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
  VALUES (v_uid, 'challenge_fee', -v_challenge.stake_amount, 'Stake for challenge from: ' || COALESCE(v_challenger_tag, 'player'), 'completed', p_challenge_id, 'KES');

  UPDATE challenges SET status = 'accepted', accepted_at = now() WHERE id = p_challenge_id;
END;
$function$;

-- Refunds go back to the play balance only
CREATE OR REPLACE FUNCTION public.handle_challenge_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reason text;
BEGIN
  IF OLD.status = NEW.status OR NEW.status NOT IN ('declined', 'expired', 'cancelled') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = OLD.id AND type = 'refund') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' AND COALESCE(NEW.dispute_count, 0) >= 1 THEN
    UPDATE profiles SET rating = GREATEST(COALESCE(rating, 0) - 0.5, 0.0) WHERE id IN (NEW.challenger_id, NEW.opponent_id);
  END IF;

  v_reason := CASE
    WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
    WHEN NEW.status = 'expired' THEN 'Challenge expired without response'
    WHEN COALESCE(NEW.dispute_count, 0) >= 1 THEN 'Match cancelled due to dispute'
    ELSE 'Match cancelled'
  END;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  IF OLD.stake_amount > 0 AND OLD.status IN ('pending', 'accepted', 'disputed', 'disputed_warning') THEN
    UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) + OLD.stake_amount WHERE id = OLD.challenger_id;
    INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
    VALUES (OLD.challenger_id, 'refund', OLD.stake_amount, v_reason, 'completed', OLD.id, 'KES');
  END IF;

  IF OLD.stake_amount > 0 AND OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
    UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) + OLD.stake_amount WHERE id = OLD.opponent_id;
    INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
    VALUES (OLD.opponent_id, 'refund', OLD.stake_amount, v_reason, 'completed', OLD.id, 'KES');
  END IF;

  RETURN NEW;
END;
$function$;

-- Winner's pot goes on hold. Suspicious patterns freeze it for review.
CREATE OR REPLACE FUNCTION public.distribute_challenge_prizes(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  v_loser uuid;
  v_games int;
  v_winner_wins int;
  v_pot_total numeric;
  v_status text := 'held';
  v_reason text;
  v_recent_deposit numeric;
BEGIN
  SELECT * INTO c FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND OR c.status <> 'completed' OR c.winner_id IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'challenge_win') THEN
    RETURN;
  END IF;
  v_loser := CASE WHEN c.winner_id = c.challenger_id THEN c.opponent_id ELSE c.challenger_id END;

  -- Pattern 1: one player keeps beating the same opponent for money
  SELECT count(*), count(*) FILTER (WHERE winner_id = c.winner_id), COALESCE(sum(prize_pool), 0)
  INTO v_games, v_winner_wins, v_pot_total
  FROM challenges
  WHERE status = 'completed'
    AND ((challenger_id = c.challenger_id AND opponent_id = c.opponent_id) OR (challenger_id = c.opponent_id AND opponent_id = c.challenger_id))
    AND completed_at > now() - interval '30 days';
  IF v_games >= 3 AND v_winner_wins = v_games AND v_pot_total >= 1500 THEN
    v_status := 'frozen';
    v_reason := 'Same opponent lost every money match in 30 days';
    PERFORM _flag(c.winner_id, 'one_sided_pair', jsonb_build_object('opponent', v_loser, 'matches', v_games, 'pot_total', v_pot_total));
  END IF;

  -- Pattern 2: the loser deposited shortly before and lost most of it to this player
  SELECT COALESCE(sum(credit), 0) INTO v_recent_deposit FROM mpesa_deposits
  WHERE user_id = v_loser AND status = 'completed' AND completed_at > now() - interval '2 hours';
  IF v_recent_deposit > 0 AND c.stake_amount >= 0.8 * v_recent_deposit AND c.stake_amount >= 1000 THEN
    v_status := 'frozen';
    v_reason := COALESCE(v_reason || '; ', '') || 'Loser deposited and lost it straight away';
    PERFORM _flag(c.winner_id, 'deposit_and_lose', jsonb_build_object('loser', v_loser, 'deposit', v_recent_deposit, 'stake', c.stake_amount));
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET total_earnings = COALESCE(total_earnings, 0) + c.prize_pool, wins = COALESCE(wins, 0) + 1 WHERE id = c.winner_id;
  UPDATE profiles SET losses = COALESCE(losses, 0) + 1 WHERE id = v_loser;
  PERFORM _credit_held(c.winner_id, c.prize_pool, 'challenge', c.id, v_status, v_reason);

  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
  VALUES (c.winner_id, 'challenge_win', c.prize_pool, 'Quick match win: ' || c.game || CASE WHEN v_status = 'frozen' THEN ' (under review)' ELSE ' (on hold 24h)' END, 'completed', c.id, 'KES');

  UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + c.platform_fee WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Tournaments: KES prizes on hold, creators can't play their own events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.distribute_arena_prizes(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t record;
  v_fee numeric;
  v_net numeric;
  v_entries numeric;
  v_winner uuid;
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(t.prizes_distributed, false) THEN
    RETURN;
  END IF;

  v_fee := round(COALESCE(t.prize_pool, 0) * COALESCE(t.platform_fee_percentage, 10) / 100.0, 2);
  v_net := COALESCE(t.prize_pool, 0) - v_fee;

  SELECT winner_id INTO v_winner FROM match_results
  WHERE tournament_id = p_tournament_id AND status = 'confirmed' AND winner_id IS NOT NULL
  ORDER BY round DESC, updated_at DESC LIMIT 1;
  v_winner := COALESCE(v_winner, t.winner_id);

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  IF v_winner IS NOT NULL AND v_net > 0 THEN
    UPDATE profiles SET total_earnings = COALESCE(total_earnings, 0) + v_net WHERE id = v_winner;
    PERFORM _credit_held(v_winner, v_net, 'tournament_prize', t.id);
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (v_winner, 'tournament_win', v_net, 'Tournament prize: ' || t.name || ' (on hold 24h)', 'completed', t.id, 'KES');
  END IF;

  -- Entry fees go to the creator, minus the platform fee, on hold
  SELECT COALESCE(sum(amount_paid), 0) INTO v_entries FROM tournament_participants WHERE tournament_id = p_tournament_id;
  IF v_entries > 0 AND t.created_by IS NOT NULL THEN
    v_fee := v_fee + round(v_entries * 0.10, 2);
    PERFORM _credit_held(t.created_by, v_entries - round(v_entries * 0.10, 2), 'entry_fees', t.id);
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (t.created_by, 'payout', v_entries - round(v_entries * 0.10, 2), 'Entry fees for ' || t.name || ' (on hold 24h)', 'completed', t.id, 'KES');
  END IF;

  IF v_fee > 0 THEN
    UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_fee WHERE id = (SELECT id FROM platform_settings LIMIT 1);
  END IF;

  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  t record;
  v_fee numeric;
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  FOR r IN
    SELECT user_id, amount_paid FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id AND tp.amount_paid > 0
      AND NOT EXISTS (SELECT 1 FROM transactions x WHERE x.user_id = tp.user_id AND x.tournament_id = p_tournament_id AND x.type = 'refund' AND x.description NOT LIKE 'Creator refund%')
  LOOP
    UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) + r.amount_paid WHERE id = r.user_id;
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (r.user_id, 'refund', r.amount_paid, 'Refund for cancelled tournament: ' || t.name, 'completed', p_tournament_id, 'KES');
  END LOOP;

  IF COALESCE(t.prize_pool, 0) > 0 AND NOT EXISTS (
    SELECT 1 FROM transactions WHERE user_id = t.created_by AND tournament_id = p_tournament_id AND type = 'refund' AND description LIKE 'Creator refund%'
  ) THEN
    v_fee := round(t.prize_pool * 0.10, 2);
    UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) + (t.prize_pool - v_fee) WHERE id = t.created_by;
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (t.created_by, 'refund', t.prize_pool - v_fee, 'Creator refund for cancelled tournament: ' || t.name || ' (10% cancellation fee)', 'completed', p_tournament_id, 'KES');
    UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_fee WHERE id = (SELECT id FROM platform_settings LIMIT 1);
  END IF;
END;
$function$;

-- Entry fee is worked out on the server (the app's amount_paid is ignored).
-- Solo: entry_fee. Team captain: entry_fee x team_size (covers the team).
-- Invited teammate (joins via accept_team_invite): 0.
-- Players can only add themselves; teammates join through their invite.
CREATE OR REPLACE FUNCTION public.handle_tournament_join_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t record;
  v_fee numeric := 0;
  v_balance numeric;
BEGIN
  SELECT id, entry_fee, name, created_by, COALESCE(team_size, 1) AS team_size INTO t FROM tournaments WHERE id = NEW.tournament_id;
  IF NEW.user_id = t.created_by THEN
    RAISE EXCEPTION 'You can''t play in a tournament you created';
  END IF;

  IF EXISTS (SELECT 1 FROM tournament_teams tt WHERE tt.tournament_id = NEW.tournament_id AND tt.captain_id = NEW.user_id) THEN
    v_fee := COALESCE(t.entry_fee, 0) * t.team_size;
  ELSIF EXISTS (
    SELECT 1 FROM tournament_team_members m JOIN tournament_teams tt ON tt.id = m.team_id
    WHERE tt.tournament_id = NEW.tournament_id AND m.user_id = NEW.user_id AND m.status = 'accepted' AND tt.captain_id <> NEW.user_id
  ) THEN
    v_fee := 0;
  ELSE
    v_fee := COALESCE(t.entry_fee, 0);
  END IF;

  NEW.amount_paid := v_fee;
  IF v_fee > 0 THEN
    SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = NEW.user_id FOR UPDATE;
    IF v_balance < v_fee THEN
      RAISE EXCEPTION 'Not enough in your play balance (KES % needed). Top up with M-Pesa first.', v_fee;
    END IF;
    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE profiles SET arena_currency = arena_currency - v_fee WHERE id = NEW.user_id;
    PERFORM set_config('app.bypass_profile_protection', 'false', true);
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (NEW.user_id, 'tournament_fee', -v_fee, 'Entry fee: ' || t.name, 'completed', NEW.tournament_id, 'KES');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER tr_tournament_join_fee
  BEFORE INSERT ON public.tournament_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_tournament_join_fee();

-- From the app, players can only add themselves (teammates join via their invite)
CREATE OR REPLACE FUNCTION public.guard_participant_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NEW.user_id IS DISTINCT FROM auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Players join tournaments themselves. Teammates accept their invite.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER a_guard_participant_insert
  BEFORE INSERT ON public.tournament_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_participant_insert();

-- amount_paid can't be edited afterwards from the app
CREATE OR REPLACE FUNCTION public.guard_participant_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT has_role(auth.uid(), 'admin')
     AND (NEW.amount_paid IS DISTINCT FROM OLD.amount_paid OR NEW.user_id IS DISTINCT FROM OLD.user_id
          OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id OR NEW.prize_won IS DISTINCT FROM OLD.prize_won) THEN
    RAISE EXCEPTION 'Not allowed to change this entry' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER a_guard_participant_update
  BEFORE UPDATE ON public.tournament_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_participant_update();

-- Winnings can be moved into the play balance (one way, 1:1)
CREATE OR REPLACE FUNCTION public.transfer_cash_to_arena_currency(p_amount_usd numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Enter an amount';
  END IF;
  SELECT COALESCE(available_balance, 0) INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < p_amount_usd THEN
    RAISE EXCEPTION 'Not enough winnings';
  END IF;
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET available_balance = available_balance - p_amount_usd, arena_currency = COALESCE(arena_currency, 0) + p_amount_usd WHERE id = v_uid;
  INSERT INTO transactions (user_id, type, amount, description, status, currency)
  VALUES (v_uid, 'debit', -p_amount_usd, 'Moved winnings to play balance', 'completed', 'KES'),
         (v_uid, 'credit', p_amount_usd, 'Play balance from winnings', 'completed', 'KES');
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. M-Pesa deposits (called by edge functions with the service key)
-- ---------------------------------------------------------------------------
-- Registers the payout number on first use and creates the pending deposit
CREATE OR REPLACE FUNCTION public.start_mpesa_deposit(p_user uuid, p_phone text, p_amount numeric, p_purpose text, p_ip text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text := _normalize_ke_phone(p_phone);
  v_current text;
  v_bps int;
  v_fee numeric;
  v_today numeric;
  v_id uuid;
BEGIN
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Enter a Safaricom or Airtel number like 0712 345 678';
  END IF;
  p_amount := round(p_amount);
  IF p_amount < 50 OR p_amount > 70000 THEN
    RAISE EXCEPTION 'Deposits are between KES 50 and KES 70,000';
  END IF;
  SELECT mpesa_phone INTO v_current FROM profiles WHERE id = p_user FOR UPDATE;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user AND (COALESCE(is_suspended, false) OR banned_until > now())) THEN
    RAISE EXCEPTION 'This account can''t make payments right now';
  END IF;
  IF v_current IS NULL THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE mpesa_phone = v_phone AND id <> p_user) THEN
      RAISE EXCEPTION 'That M-Pesa number is linked to another Arena account';
    END IF;
    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE profiles SET mpesa_phone = v_phone WHERE id = p_user;
  ELSIF v_current <> v_phone THEN
    RAISE EXCEPTION 'Use your linked M-Pesa number ending %. Contact support to change it.', right(v_current, 3);
  END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_today FROM mpesa_deposits
  WHERE user_id = p_user AND status IN ('pending', 'completed') AND created_at > now() - interval '24 hours';
  IF v_today + p_amount > 150000 THEN
    RAISE EXCEPTION 'Daily deposit limit is KES 150,000';
  END IF;
  IF (SELECT count(*) FROM mpesa_deposits WHERE user_id = p_user AND status = 'pending' AND created_at > now() - interval '2 minutes') >= 2 THEN
    RAISE EXCEPTION 'Finish the M-Pesa prompt on your phone first';
  END IF;

  SELECT COALESCE(deposit_fee_bps, 450) INTO v_bps FROM platform_settings LIMIT 1;
  v_fee := round(p_amount * v_bps / 10000.0, 2);
  INSERT INTO mpesa_deposits (user_id, phone, amount, fee, credit, purpose, ip)
  VALUES (p_user, v_phone, p_amount, v_fee, p_amount - v_fee, COALESCE(p_purpose, 'wallet'), p_ip)
  RETURNING id INTO v_id;
  RETURN json_build_object('id', v_id, 'phone', v_phone, 'amount', p_amount, 'fee', v_fee, 'credit', p_amount - v_fee);
END;
$$;

-- Marks a verified deposit complete and credits the play balance (idempotent)
CREATE OR REPLACE FUNCTION public.complete_mpesa_deposit(p_deposit_id uuid, p_status text, p_reference text, p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d mpesa_deposits%ROWTYPE;
BEGIN
  SELECT * INTO d FROM mpesa_deposits WHERE id = p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;
  IF d.status <> 'pending' THEN
    RETURN d.status;
  END IF;
  IF p_status = 'completed' THEN
    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) + d.credit WHERE id = d.user_id;
    UPDATE mpesa_deposits SET status = 'completed', reference_id = p_reference, provider_payload = p_payload, completed_at = now() WHERE id = d.id;
    INSERT INTO transactions (user_id, type, amount, description, status, currency, metadata)
    VALUES (d.user_id, 'deposit', d.credit, 'M-Pesa deposit' || CASE WHEN d.fee > 0 THEN ' (KES ' || d.fee || ' fee)' ELSE '' END, 'completed', 'KES',
            jsonb_build_object('deposit_id', d.id, 'reference', p_reference, 'gross', d.amount, 'fee', d.fee));
    RETURN 'completed';
  ELSIF p_status IN ('failed', 'cancelled', 'timeout') THEN
    UPDATE mpesa_deposits SET status = p_status, reference_id = COALESCE(p_reference, reference_id), provider_payload = p_payload, completed_at = now() WHERE id = d.id;
    RETURN p_status;
  END IF;
  RETURN d.status;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. M-Pesa withdrawals
-- ---------------------------------------------------------------------------
-- Rules (KES)
--   only from winnings (available_balance), only to the linked number
--   50 to 70,000 per withdrawal; 150,000 per day
--   without verified KYC: up to 5,000 per withdrawal, 20,000 per 30 days
--   number changed by support: locked until mpesa_phone_locked_until
--   goes to manual review when: >= 20,000; account < 3 days old; open flags;
--   flagged for fraud; most of the amount was won from one opponent this week;
--   that opponent used the same IP for payments
CREATE OR REPLACE FUNCTION public.request_mpesa_withdrawal(p_user uuid, p_amount numeric, p_ip text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p profiles%ROWTYPE;
  v_count numeric;
  v_today numeric;
  v_flags text[] := '{}';
  v_top_opponent uuid;
  v_top_amount numeric;
  v_id uuid;
  v_status text;
BEGIN
  SELECT * INTO p FROM profiles WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
  p_amount := round(p_amount);
  IF p.mpesa_phone IS NULL THEN
    RAISE EXCEPTION 'Make a deposit first to link your M-Pesa number';
  END IF;
  IF p.mpesa_phone_locked_until IS NOT NULL AND p.mpesa_phone_locked_until > now() THEN
    RAISE EXCEPTION 'Your M-Pesa number was changed recently. Withdrawals open again on %', to_char(p.mpesa_phone_locked_until AT TIME ZONE 'Africa/Nairobi', 'DD Mon HH24:MI');
  END IF;
  IF COALESCE(p.is_suspended, false) OR p.banned_until > now() THEN
    RAISE EXCEPTION 'This account can''t withdraw right now';
  END IF;
  IF p_amount < 50 OR p_amount > 70000 THEN
    RAISE EXCEPTION 'Withdrawals are between KES 50 and KES 70,000';
  END IF;
  IF COALESCE(p.available_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'You can withdraw up to KES % (winnings only)', COALESCE(p.available_balance, 0);
  END IF;

  -- No ID needed for everyday amounts: up to KES 5,000 per withdrawal and
  -- KES 20,000 per 30 days. ID unlocks the full limits.
  IF COALESCE(p.kyc_status, '') <> 'verified' THEN
    IF p_amount > 5000 THEN
      RAISE EXCEPTION 'Without ID verification you can withdraw up to KES 5,000 at a time. Verify your ID for bigger withdrawals.';
    END IF;
    SELECT COALESCE(sum(amount), 0) INTO v_count FROM mpesa_withdrawals
    WHERE user_id = p_user AND status NOT IN ('rejected', 'failed') AND created_at > now() - interval '30 days';
    IF v_count + p_amount > 20000 THEN
      RAISE EXCEPTION 'Without ID verification you can withdraw up to KES 20,000 a month (KES % left). Verify your ID to withdraw more.', GREATEST(20000 - v_count, 0);
    END IF;
  END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_today FROM mpesa_withdrawals
  WHERE user_id = p_user AND status NOT IN ('rejected', 'failed') AND created_at > now() - interval '24 hours';
  IF v_today + p_amount > 150000 THEN
    RAISE EXCEPTION 'Daily withdrawal limit is KES 150,000';
  END IF;

  -- Review triggers
  IF p_amount >= 20000 THEN v_flags := array_append(v_flags, 'large_amount'); END IF;
  IF p.created_at > now() - interval '3 days' THEN v_flags := array_append(v_flags, 'new_account'); END IF;
  IF COALESCE(p.is_flagged_fraud, false) THEN v_flags := array_append(v_flags, 'fraud_flag'); END IF;
  IF EXISTS (SELECT 1 FROM aml_flags WHERE user_id = p_user AND resolved_at IS NULL AND severity <> 'info') THEN v_flags := array_append(v_flags, 'open_aml_flag'); END IF;

  SELECT CASE WHEN c.winner_id = c.challenger_id THEN c.opponent_id ELSE c.challenger_id END, sum(c.prize_pool)
  INTO v_top_opponent, v_top_amount
  FROM challenges c
  WHERE c.winner_id = p_user AND c.status = 'completed' AND c.completed_at > now() - interval '7 days'
  GROUP BY 1 ORDER BY 2 DESC LIMIT 1;
  IF v_top_amount IS NOT NULL AND v_top_amount >= 1000 AND v_top_amount >= 0.5 * p_amount THEN
    v_flags := array_append(v_flags, 'single_opponent_source');
    IF p_ip IS NOT NULL AND EXISTS (
      SELECT 1 FROM mpesa_deposits WHERE user_id = v_top_opponent AND ip = p_ip
      UNION ALL SELECT 1 FROM mpesa_withdrawals WHERE user_id = v_top_opponent AND ip = p_ip
    ) THEN
      v_flags := array_append(v_flags, 'shared_ip_with_opponent');
      PERFORM _flag(p_user, 'shared_ip_with_opponent', jsonb_build_object('opponent', v_top_opponent, 'ip', p_ip), 'block');
    END IF;
  END IF;

  v_status := CASE WHEN cardinality(v_flags) > 0 THEN 'review' ELSE 'queued' END;

  -- Reserve the money now so it can't be spent twice
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET available_balance = available_balance - p_amount WHERE id = p_user;
  INSERT INTO mpesa_withdrawals (user_id, phone, amount, status, flags, ip)
  VALUES (p_user, p.mpesa_phone, p_amount, v_status, v_flags, p_ip)
  RETURNING id INTO v_id;
  INSERT INTO transactions (user_id, type, amount, description, status, currency, metadata)
  VALUES (p_user, 'withdrawal', -p_amount, 'M-Pesa withdrawal to ' || overlay(p.mpesa_phone placing '****' from 6 for 4), CASE WHEN v_status = 'review' THEN 'pending' ELSE 'processing' END, 'KES', jsonb_build_object('withdrawal_id', v_id));

  RETURN json_build_object('id', v_id, 'status', v_status, 'phone', p.mpesa_phone, 'amount', p_amount, 'flags', v_flags);
END;
$$;

-- Final state from the payout provider (service only). Failures are refunded.
CREATE OR REPLACE FUNCTION public.finish_mpesa_withdrawal(p_id uuid, p_status text, p_provider_id text, p_receipt text, p_reason text, p_charge numeric DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w mpesa_withdrawals%ROWTYPE;
BEGIN
  SELECT * INTO w FROM mpesa_withdrawals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;
  IF w.status IN ('completed', 'failed', 'rejected') THEN
    RETURN w.status;
  END IF;
  IF p_status = 'processing' THEN
    UPDATE mpesa_withdrawals SET status = 'processing', provider_id = COALESCE(p_provider_id, provider_id), charge = COALESCE(p_charge, charge), updated_at = now() WHERE id = p_id;
  ELSIF p_status = 'completed' THEN
    UPDATE mpesa_withdrawals SET status = 'completed', provider_id = COALESCE(p_provider_id, provider_id), mpesa_receipt = p_receipt, updated_at = now() WHERE id = p_id;
    UPDATE transactions SET status = 'completed', updated_at = now(), metadata = metadata || jsonb_build_object('receipt', p_receipt) WHERE (metadata->>'withdrawal_id')::uuid = p_id;
  ELSIF p_status IN ('failed', 'rejected') THEN
    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE profiles SET available_balance = COALESCE(available_balance, 0) + w.amount WHERE id = w.user_id;
    UPDATE mpesa_withdrawals SET status = p_status, failure_reason = left(p_reason, 300), updated_at = now() WHERE id = p_id;
    UPDATE transactions SET status = 'failed', updated_at = now() WHERE (metadata->>'withdrawal_id')::uuid = p_id;
    INSERT INTO transactions (user_id, type, amount, description, status, currency, metadata)
    VALUES (w.user_id, 'refund', w.amount, 'Withdrawal ' || CASE WHEN p_status = 'rejected' THEN 'declined' ELSE 'failed' END || ', money returned to winnings', 'completed', 'KES', jsonb_build_object('withdrawal_id', p_id));
  END IF;
  RETURN p_status;
END;
$$;

-- Admin decision on a withdrawal in review
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(p_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w mpesa_withdrawals%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO w FROM mpesa_withdrawals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR w.status <> 'review' THEN
    RAISE EXCEPTION 'This withdrawal is not waiting for review';
  END IF;
  IF w.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Another admin has to review your own withdrawal' USING ERRCODE = '42501';
  END IF;
  UPDATE mpesa_withdrawals SET reviewed_by = auth.uid(), reviewed_at = now() WHERE id = p_id;
  IF p_approve THEN
    UPDATE mpesa_withdrawals SET status = 'queued', updated_at = now() WHERE id = p_id;
    RETURN 'queued';
  END IF;
  PERFORM finish_mpesa_withdrawal(p_id, 'rejected', NULL, NULL, COALESCE(p_reason, 'Declined after review'));
  RETURN 'rejected';
END;
$$;

-- Support: change a user's payout number (locks withdrawals for 72h)
CREATE OR REPLACE FUNCTION public.admin_set_mpesa_phone(p_user uuid, p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text := _normalize_ke_phone(p_phone);
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE mpesa_phone = v_phone AND id <> p_user) THEN
    RAISE EXCEPTION 'That number is linked to another account';
  END IF;
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET mpesa_phone = v_phone, mpesa_phone_locked_until = now() + interval '72 hours' WHERE id = p_user;
  PERFORM _flag(p_user, 'payout_number_changed', jsonb_build_object('by', auth.uid()), 'info');
END;
$$;

-- Stale prompts never paid become timeouts
CREATE OR REPLACE FUNCTION public.expire_stale_deposits()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH x AS (
    UPDATE mpesa_deposits SET status = 'timeout', completed_at = now()
    WHERE status = 'pending' AND created_at < now() - interval '30 minutes'
    RETURNING 1
  ) SELECT count(*)::int FROM x;
$$;

-- ---------------------------------------------------------------------------
-- 10. Grants
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  internal text[] := ARRAY['_flag', '_credit_held', 'release_held_winnings', '_check_pair_limits', 'start_mpesa_deposit',
                           'complete_mpesa_deposit', 'request_mpesa_withdrawal', 'finish_mpesa_withdrawal', 'expire_stale_deposits',
                           'distribute_challenge_prizes', 'distribute_arena_prizes', 'refund_tournament_entry_fees'];
  user_facing text[] := ARRAY['create_challenge', 'accept_challenge', 'transfer_cash_to_arena_currency',
                              'admin_resolve_hold', 'admin_resolve_flag', 'admin_review_withdrawal', 'admin_set_mpesa_phone'];
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace AND (p.proname = ANY (internal) OR p.proname = ANY (user_facing))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = ANY (user_facing) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 11. Scheduled jobs
-- ---------------------------------------------------------------------------
SELECT cron.schedule('release-held-winnings', '*/10 * * * *', 'SELECT public.release_held_winnings();');
SELECT cron.schedule('expire-stale-deposits', '*/10 * * * *', 'SELECT public.expire_stale_deposits();');
