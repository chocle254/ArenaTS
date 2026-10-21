-- ============================================================================
-- Withdrawal fee is paid by the player, shown before confirming
-- ============================================================================
-- UpesiPay charges a tiered fee on every B2C payout, taken from the
-- Disbursement Wallet on top of the amount sent. Arena must never cover it,
-- so a withdrawal of A from winnings sends S to M-Pesa where S is the largest
-- amount with S + fee(S) <= A, and deducts exactly S + fee(S). Any shillings
-- left over at a tier boundary stay in the player's winnings.
-- Minimums are low for launch testing and live in platform_settings, so they
-- can be raised without a deploy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payout_fee_tiers (
  amount_from numeric PRIMARY KEY,
  amount_to numeric NOT NULL,
  price numeric NOT NULL
);
ALTER TABLE public.payout_fee_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read payout fees" ON public.payout_fee_tiers;
CREATE POLICY "Anyone can read payout fees" ON public.payout_fee_tiers FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.payout_fee_tiers TO anon, authenticated;

-- UpesiPay disbursement pricing (docs: get-transaction-fees)
INSERT INTO public.payout_fee_tiers (amount_from, amount_to, price) VALUES
  (10, 49, 3), (50, 99, 8), (100, 499, 14), (500, 999, 20), (1000, 1499, 26),
  (1500, 2499, 37), (2500, 3499, 41), (3500, 4999, 52), (5000, 7499, 61),
  (7500, 9999, 70), (10000, 14999, 81), (15000, 19999, 85), (20000, 24999, 94),
  (25000, 29999, 99), (30000, 34999, 110), (35000, 39999, 129), (40000, 44999, 133),
  (45000, 49999, 139), (50000, 69999, 144), (70000, 149999, 157), (150000, 250000, 161)
ON CONFLICT (amount_from) DO UPDATE SET amount_to = EXCLUDED.amount_to, price = EXCLUDED.price;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS min_deposit_kes numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS min_withdrawal_kes numeric NOT NULL DEFAULT 20;

ALTER TABLE public.mpesa_withdrawals
  ADD COLUMN IF NOT EXISTS send_amount numeric,
  ADD COLUMN IF NOT EXISTS fee numeric;

-- For a withdrawal of p_amount from winnings: what reaches M-Pesa, the fee,
-- and the total actually taken (send + fee <= p_amount).
CREATE OR REPLACE FUNCTION public.withdrawal_quote(p_amount numeric)
RETURNS TABLE (send numeric, fee numeric, total numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT q.s, q.p, q.s + q.p
  FROM (
    SELECT LEAST(t.amount_to, floor(p_amount) - t.price) AS s, t.price AS p
    FROM payout_fee_tiers t
  ) q
  JOIN payout_fee_tiers t2 ON q.s BETWEEN t2.amount_from AND t2.amount_to AND t2.price = q.p
  ORDER BY q.s DESC
  LIMIT 1;
$$;

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
  v_min numeric;
BEGIN
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Enter a Safaricom or Airtel number like 0712 345 678';
  END IF;
  p_amount := round(p_amount);
  SELECT COALESCE(min_deposit_kes, 10), COALESCE(deposit_fee_bps, 500) INTO v_min, v_bps FROM platform_settings LIMIT 1;
  v_min := COALESCE(v_min, 10); v_bps := COALESCE(v_bps, 500);
  IF p_amount < v_min OR p_amount > 70000 THEN
    RAISE EXCEPTION 'Deposits are between KES % and KES 70,000', v_min;
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

  v_fee := round(p_amount * v_bps / 10000.0, 2);
  INSERT INTO mpesa_deposits (user_id, phone, amount, fee, credit, purpose, ip)
  VALUES (p_user, v_phone, p_amount, v_fee, p_amount - v_fee, COALESCE(p_purpose, 'wallet'), p_ip)
  RETURNING id INTO v_id;
  RETURN json_build_object('id', v_id, 'phone', v_phone, 'amount', p_amount, 'fee', v_fee, 'credit', p_amount - v_fee);
END;
$$;

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
  v_min numeric;
  q record;
BEGIN
  SELECT * INTO p FROM profiles WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
  p_amount := floor(p_amount);
  IF p.mpesa_phone IS NULL THEN
    RAISE EXCEPTION 'Make a deposit first to link your M-Pesa number';
  END IF;
  IF p.mpesa_phone_locked_until IS NOT NULL AND p.mpesa_phone_locked_until > now() THEN
    RAISE EXCEPTION 'Your M-Pesa number was changed recently. Withdrawals open again on %', to_char(p.mpesa_phone_locked_until AT TIME ZONE 'Africa/Nairobi', 'DD Mon HH24:MI');
  END IF;
  IF COALESCE(p.is_suspended, false) OR p.banned_until > now() THEN
    RAISE EXCEPTION 'This account can''t withdraw right now';
  END IF;
  SELECT COALESCE(min_withdrawal_kes, 20) INTO v_min FROM platform_settings LIMIT 1;
  v_min := GREATEST(COALESCE(v_min, 20), 13); -- UpesiPay's smallest payout is KES 10 (+ KES 3 fee)
  IF p_amount < v_min OR p_amount > 70000 THEN
    RAISE EXCEPTION 'Withdrawals are between KES % and KES 70,000', v_min;
  END IF;
  IF COALESCE(p.available_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'You can withdraw up to KES % (winnings only)', COALESCE(p.available_balance, 0);
  END IF;

  -- The player pays the payout fee: send + fee fits inside what they withdraw
  SELECT * INTO q FROM withdrawal_quote(p_amount);
  IF q.send IS NULL OR q.send < 10 THEN
    RAISE EXCEPTION 'That amount is too small to send after the M-Pesa fee';
  END IF;

  IF COALESCE(p.kyc_status, '') <> 'verified' THEN
    IF q.total > 5000 THEN
      RAISE EXCEPTION 'Without ID verification you can withdraw up to KES 5,000 at a time. Verify your ID for bigger withdrawals.';
    END IF;
    SELECT COALESCE(sum(amount), 0) INTO v_count FROM mpesa_withdrawals
    WHERE user_id = p_user AND status NOT IN ('rejected', 'failed') AND created_at > now() - interval '30 days';
    IF v_count + q.total > 20000 THEN
      RAISE EXCEPTION 'Without ID verification you can withdraw up to KES 20,000 a month (KES % left). Verify your ID to withdraw more.', GREATEST(20000 - v_count, 0);
    END IF;
  END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_today FROM mpesa_withdrawals
  WHERE user_id = p_user AND status NOT IN ('rejected', 'failed') AND created_at > now() - interval '24 hours';
  IF v_today + q.total > 150000 THEN
    RAISE EXCEPTION 'Daily withdrawal limit is KES 150,000';
  END IF;

  -- Review triggers
  IF q.total >= 20000 THEN v_flags := array_append(v_flags, 'large_amount'); END IF;
  IF p.created_at > now() - interval '3 days' THEN v_flags := array_append(v_flags, 'new_account'); END IF;
  IF COALESCE(p.is_flagged_fraud, false) THEN v_flags := array_append(v_flags, 'fraud_flag'); END IF;
  IF EXISTS (SELECT 1 FROM aml_flags WHERE user_id = p_user AND resolved_at IS NULL AND severity <> 'info') THEN v_flags := array_append(v_flags, 'open_aml_flag'); END IF;

  SELECT CASE WHEN c.winner_id = c.challenger_id THEN c.opponent_id ELSE c.challenger_id END, sum(c.prize_pool)
  INTO v_top_opponent, v_top_amount
  FROM challenges c
  WHERE c.winner_id = p_user AND c.status = 'completed' AND c.completed_at > now() - interval '7 days' AND c.stake_amount > 0
  GROUP BY 1 ORDER BY 2 DESC LIMIT 1;
  IF v_top_amount IS NOT NULL AND v_top_amount >= 1000 AND v_top_amount >= 0.5 * q.total THEN
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

  -- Reserve send + fee now so it can't be spent twice
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET available_balance = available_balance - q.total WHERE id = p_user;
  INSERT INTO mpesa_withdrawals (user_id, phone, amount, send_amount, fee, status, flags, ip)
  VALUES (p_user, p.mpesa_phone, q.total, q.send, q.fee, v_status, v_flags, p_ip)
  RETURNING id INTO v_id;
  INSERT INTO transactions (user_id, type, amount, description, status, currency, metadata)
  VALUES (p_user, 'withdrawal', -q.total,
          'M-Pesa withdrawal to ' || overlay(p.mpesa_phone placing '****' from 6 for 4) || ' (KES ' || q.send || ' sent, KES ' || q.fee || ' M-Pesa fee)',
          CASE WHEN v_status = 'review' THEN 'pending' ELSE 'processing' END, 'KES',
          jsonb_build_object('withdrawal_id', v_id, 'sent', q.send, 'fee', q.fee));

  RETURN json_build_object('id', v_id, 'status', v_status, 'phone', p.mpesa_phone, 'amount', q.total, 'send', q.send, 'fee', q.fee, 'flags', v_flags);
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('withdrawal_quote', 'start_mpesa_deposit', 'request_mpesa_withdrawal')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = 'withdrawal_quote' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
