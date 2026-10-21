-- A cancelled tournament (not enough players by start time, or cancelled by
-- an admin) now returns the creator's guaranteed prize in full. The 10%
-- cancellation fee made creators afraid to try again after one didn't fill.
-- The refund goes back to the play balance, which can't be withdrawn, so
-- this doesn't open a laundering route. Entry fees are refunded in full as before.
CREATE OR REPLACE FUNCTION public.refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  t record;
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
    UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) + t.prize_pool WHERE id = t.created_by;
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (t.created_by, 'refund', t.prize_pool, 'Creator refund for cancelled tournament: ' || t.name, 'completed', p_tournament_id, 'KES');
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.refund_tournament_entry_fees(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_tournament_entry_fees(uuid) TO service_role;
