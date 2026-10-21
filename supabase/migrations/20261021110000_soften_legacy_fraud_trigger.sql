-- The legacy trigger flagged anyone with 5+ transaction rows in 10 minutes as
-- fraud (one tournament or a few top-ups is enough), which blocks challenges
-- and sends every withdrawal to review. Its deposit-then-withdraw check never
-- fired (withdrawal amounts are negative). The KES anti-laundering rules
-- (held winnings, pair limits, creator links, review triggers) cover this now.
-- Keep a soft signal: very high volume leaves an info note for admins and
-- blocks nothing.
CREATE OR REPLACE FUNCTION public.check_transaction_fraud_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT count(*) INTO recent_count FROM public.transactions
  WHERE user_id = NEW.user_id AND created_at > now() - interval '10 minutes';
  IF recent_count >= 20 AND NOT EXISTS (
    SELECT 1 FROM public.aml_flags WHERE user_id = NEW.user_id AND kind = 'high_volume' AND created_at > now() - interval '1 hour'
  ) THEN
    INSERT INTO public.aml_flags (user_id, kind, severity, detail)
    VALUES (NEW.user_id, 'high_volume', 'info', jsonb_build_object('transactions_10min', recent_count));
  END IF;
  RETURN NEW;
END;
$$;

-- Clear flags this rule raised
UPDATE public.profiles
SET is_flagged_fraud = false, fraud_resolved_at = now()
WHERE is_flagged_fraud AND fraud_resolved_at IS NULL AND fraud_flag_reason = 'Rapid transaction volume (5+ in 10 minutes)';
