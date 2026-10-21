-- ============================================================================
-- Sponsors on tournaments + KES 100 welcome ticket
-- ============================================================================
-- Sponsors: tournaments carry sponsor_name / logo / link / message. Only
-- "official" tournaments (created by an admin or a verified organizer) can
-- show a sponsor; official is set by the server. Deal details (who paid, how,
-- invoice ref) live in admin-only sponsor_deals.
--
-- Welcome ticket: every account gets KES 100 of entry credit
-- (profiles.entry_credit). It only pays entry fees on official tournaments,
-- can't be withdrawn or moved, goes back to the ticket if the tournament is
-- cancelled, never pays the creator and never grows a sliding prize. Prizes
-- in official tournaments are funded upfront, so tickets cost Arena no cash
-- and farming them with fake accounts pays nobody.
-- ============================================================================

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS sponsor_logo_url text,
  ADD COLUMN IF NOT EXISTS sponsor_url text,
  ADD COLUMN IF NOT EXISTS sponsor_message text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_sponsor_len') THEN
    ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_sponsor_len CHECK (
      char_length(COALESCE(sponsor_name, '')) <= 60 AND char_length(COALESCE(sponsor_message, '')) <= 200
      AND char_length(COALESCE(sponsor_url, '')) <= 300 AND char_length(COALESCE(sponsor_logo_url, '')) <= 500);
  END IF;
END $$;
UPDATE public.tournaments t SET official = true
FROM public.profiles p WHERE p.id = t.created_by AND (p.role = 'admin' OR COALESCE(p.organizer_verified, false)) AND NOT t.official;

CREATE TABLE IF NOT EXISTS public.sponsor_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  sponsor_name text NOT NULL,
  contact text,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  hosting_fee numeric NOT NULL DEFAULT 0 CHECK (hosting_fee >= 0),
  paid_via text,
  invoice_ref text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sponsor_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage sponsor deals" ON public.sponsor_deals;
CREATE POLICY "Admins manage sponsor deals" ON public.sponsor_deals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_deals TO authenticated;

-- Welcome ticket
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entry_credit numeric NOT NULL DEFAULT 100 CHECK (entry_credit >= 0);
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS credit_used numeric NOT NULL DEFAULT 0;

-- Users can't edit their own credit
DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.protect_profile_sensitive_columns()'::regprocedure);
  IF position('''entry_credit''' in d) = 0 THEN
    EXECUTE replace(d, $q$'organizer_verified', 'organizer_name'$q$, $q$'organizer_verified', 'organizer_name', 'entry_credit'$q$);
  END IF;
END $do$;

-- ...or what a ticket paid on their entry
CREATE OR REPLACE FUNCTION public.guard_participant_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT has_role(auth.uid(), 'admin')
     AND (NEW.amount_paid IS DISTINCT FROM OLD.amount_paid OR NEW.credit_used IS DISTINCT FROM OLD.credit_used
          OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
          OR NEW.prize_won IS DISTINCT FROM OLD.prize_won) THEN
    RAISE EXCEPTION 'Not allowed to change this entry' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_tournaments_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_changed text[];
  v_team int;
  v_slots int;
  v_min_slots int;
  v_kyc text;
  v_max_pool numeric;
  v_official boolean;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Official = hosted by Arena (admin) or a verified organizer/sponsor.
    -- Only official tournaments can show a sponsor or accept welcome tickets.
    SELECT (role = 'admin' OR COALESCE(organizer_verified, false)) INTO v_official FROM profiles WHERE id = v_uid;
    NEW.official := COALESCE(v_official, false);
    IF NOT NEW.official THEN
      NEW.sponsor_name := NULL; NEW.sponsor_logo_url := NULL; NEW.sponsor_url := NULL; NEW.sponsor_message := NULL;
    ELSE
      IF NEW.sponsor_url IS NOT NULL AND NEW.sponsor_url !~ '^https://' THEN
        RAISE EXCEPTION 'Sponsor link must start with https://';
      END IF;
      IF NEW.sponsor_logo_url IS NOT NULL AND NEW.sponsor_logo_url !~ '^https://' THEN
        RAISE EXCEPTION 'Sponsor logo must be an https:// image link';
      END IF;
    END IF;
    v_team := GREATEST(COALESCE(NEW.team_size, 1), 1);
    v_slots := COALESCE(NEW.max_players, 0) / v_team;
    v_min_slots := COALESCE(NEW.min_participants, 0) / v_team;

    -- Sliding pools need a guarantee, an entry fee and a sensible threshold (everyone, admins too)
    IF NEW.prize_mode = 'sliding' THEN
      IF COALESCE(NEW.prize_pool, 0) <= 0 OR COALESCE(NEW.entry_fee, 0) <= 0 THEN
        RAISE EXCEPTION 'A growing prize pool needs a guaranteed prize and an entry fee';
      END IF;
      NEW.sliding_after := COALESCE(NEW.sliding_after, v_min_slots);
      IF NEW.sliding_after < 1 OR NEW.sliding_after >= v_slots THEN
        RAISE EXCEPTION 'The pool should start growing after 1 to % % have joined', v_slots - 1, CASE WHEN v_team > 1 THEN 'teams' ELSE 'players' END;
      END IF;
    ELSE
      NEW.prize_mode := 'fixed';
      NEW.sliding_after := NULL;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'You can only create tournaments as yourself' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM 'open' OR COALESCE(NEW.featured, false) OR NEW.winner_id IS NOT NULL
       OR COALESCE(NEW.current_players, 0) <> 0 OR COALESCE(NEW.prizes_distributed, false)
       OR COALESCE(NEW.bracket_generated, false) OR NEW.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'New tournaments start open with no players' USING ERRCODE = '42501';
    END IF;
    IF COALESCE(NEW.platform_fee_percentage, 10) < 10 THEN
      RAISE EXCEPTION 'Platform fee cannot be lowered' USING ERRCODE = '42501';
    END IF;
    NEW.created_at := now();

    -- One tournament a day for regular players (cancelled ones don't count, so
    -- a creator whose tournament didn't fill can try again straight away).
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND organizer_verified)
       AND EXISTS (SELECT 1 FROM tournaments WHERE created_by = v_uid AND status <> 'cancelled' AND created_at > now() - interval '24 hours') THEN
      RAISE EXCEPTION 'You can host one tournament a day. Your next one opens 24 hours after your last. Running sponsored events? Ask us to verify you as an organizer.';
    END IF;

    IF (COALESCE(NEW.prize_pool, 0) > 0 OR COALESCE(NEW.entry_fee, 0) > 0)
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND organizer_verified) THEN
      IF v_min_slots < 5 OR v_slots < 5 THEN
        RAISE EXCEPTION 'Tournaments with prizes need at least 5 % to start', CASE WHEN v_team > 1 THEN 'teams' ELSE 'players' END;
      END IF;
      IF NEW.start_time < now() + interval '30 minutes' THEN
        RAISE EXCEPTION 'Give players at least 30 minutes to join before a prize tournament starts';
      END IF;
      -- Cap the most the pool could reach (guarantee + every possible growing entry)
      v_max_pool := COALESCE(NEW.prize_pool, 0)
        + CASE WHEN NEW.prize_mode = 'sliding' THEN GREATEST(v_slots - NEW.sliding_after, 0) * NEW.entry_fee * v_team ELSE 0 END;
      IF v_max_pool > 2000 * v_slots THEN
        RAISE EXCEPTION 'Prize pool can reach up to KES % for % slots (this one could reach KES %). Need bigger prizes? Ask us to verify you as an organizer.', 2000 * v_slots, v_slots, v_max_pool;
      END IF;
      SELECT kyc_status INTO v_kyc FROM profiles WHERE id = v_uid;
      IF COALESCE(NEW.prize_pool, 0) > 20000 AND COALESCE(v_kyc, '') <> 'verified' THEN
        RAISE EXCEPTION 'Verify your ID to fund prize pools above KES 20,000, or ask us to verify you as an organizer';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(array_agg(n.key), '{}') INTO v_changed
  FROM jsonb_each(to_jsonb(NEW)) n
  WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
    AND n.key <> 'updated_at';
  IF cardinality(v_changed) = 0 THEN
    RETURN NEW;
  END IF;
  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'This tournament can no longer be edited' USING ERRCODE = '42501';
  END IF;
  IF NOT (v_changed <@ ARRAY['name', 'description', 'rules', 'banned_items', 'tie_break_rules']) THEN
    RAISE EXCEPTION 'Not allowed to change % on this tournament', array_to_string(ARRAY(SELECT unnest(v_changed) EXCEPT SELECT unnest(ARRAY['name', 'description', 'rules', 'banned_items', 'tie_break_rules'])), ', ')
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;


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
  v_credit numeric := 0;
  v_cash numeric;
BEGIN
  SELECT id, entry_fee, name, created_by, COALESCE(team_size, 1) AS team_size, COALESCE(official, false) AS official INTO t FROM tournaments WHERE id = NEW.tournament_id;
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
  NEW.credit_used := 0;
  IF v_fee > 0 THEN
    -- Welcome ticket: entry credit only works on Arena/sponsor-hosted (official) tournaments
    IF t.official THEN
      SELECT LEAST(COALESCE(entry_credit, 0), v_fee) INTO v_credit FROM profiles WHERE id = NEW.user_id FOR UPDATE;
    END IF;
    v_cash := v_fee - v_credit;
    SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = NEW.user_id FOR UPDATE;
    IF v_balance < v_cash THEN
      RAISE EXCEPTION 'Not enough in your play balance (KES % needed). Top up with M-Pesa first.', v_cash;
    END IF;
    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE profiles SET arena_currency = arena_currency - v_cash, entry_credit = entry_credit - v_credit WHERE id = NEW.user_id;
    PERFORM set_config('app.bypass_profile_protection', 'false', true);
    NEW.credit_used := v_credit;
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency, metadata)
    VALUES (NEW.user_id, 'tournament_fee', -v_cash,
            'Entry fee: ' || t.name || CASE WHEN v_credit > 0 THEN ' (KES ' || v_credit || ' welcome ticket)' ELSE '' END,
            'completed', NEW.tournament_id, 'KES', jsonb_build_object('credit_used', v_credit));
  END IF;
  RETURN NEW;
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
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  FOR r IN
    SELECT user_id, amount_paid, COALESCE(credit_used, 0) AS credit_used FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id AND tp.amount_paid > 0
      AND NOT EXISTS (SELECT 1 FROM transactions x WHERE x.user_id = tp.user_id AND x.tournament_id = p_tournament_id AND x.type = 'refund' AND x.description NOT LIKE 'Creator refund%')
  LOOP
    -- Cash back to the play balance, welcome-ticket credit back to the ticket
    UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) + (r.amount_paid - r.credit_used),
                        entry_credit = COALESCE(entry_credit, 0) + r.credit_used WHERE id = r.user_id;
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (r.user_id, 'refund', r.amount_paid - r.credit_used,
            'Refund for cancelled tournament: ' || t.name || CASE WHEN r.credit_used > 0 THEN ' (welcome ticket restored)' ELSE '' END,
            'completed', p_tournament_id, 'KES');
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


CREATE OR REPLACE FUNCTION public.distribute_arena_prizes(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t tournaments%ROWTYPE;
  v_fee numeric;
  v_gross numeric;
  v_net numeric;
  v_entries numeric;
  v_bonus numeric;
  v_creator_entries numeric;
  v_final match_results%ROWTYPE;
  v_first uuid;
  v_second uuid;
  v_thirds uuid[];
  v_s1 numeric;
  v_s2 numeric;
  v_s3 numeric;
  v_paid numeric := 0;
  v_rounds int;
  u uuid;
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(t.prizes_distributed, false) THEN
    RETURN;
  END IF;

  -- Only real cash counts: welcome-ticket credit never pays the creator
  SELECT COALESCE(sum(amount_paid - COALESCE(credit_used, 0)), 0) INTO v_entries FROM tournament_participants WHERE tournament_id = p_tournament_id;
  v_bonus := COALESCE(tournament_pool_bonus(p_tournament_id), 0);
  v_gross := COALESCE(t.prize_pool, 0) + v_bonus;
  v_fee := round(v_gross * COALESCE(t.platform_fee_percentage, 10) / 100.0, 2);
  v_net := v_gross - v_fee;

  v_rounds := COALESCE(t.num_rounds, (SELECT max(round) FROM match_results WHERE tournament_id = t.id));
  SELECT * INTO v_final FROM match_results WHERE tournament_id = t.id AND round = v_rounds AND status = 'confirmed' ORDER BY updated_at DESC LIMIT 1;
  v_first := COALESCE(v_final.winner_id, t.winner_id);
  v_second := CASE WHEN v_final.winner_id = v_final.player1_id THEN v_final.player2_id WHEN v_final.winner_id = v_final.player2_id THEN v_final.player1_id END;
  SELECT array_agg(CASE WHEN winner_id = player1_id THEN player2_id ELSE player1_id END)
  INTO v_thirds
  FROM match_results WHERE tournament_id = t.id AND round = v_rounds - 1 AND status = 'confirmed' AND winner_id IS NOT NULL
    AND (CASE WHEN winner_id = player1_id THEN player2_id ELSE player1_id END) IS NOT NULL;

  v_s1 := COALESCE((t.prize_distribution ->> '1st')::numeric, 1);
  v_s2 := COALESCE((t.prize_distribution ->> '2nd')::numeric, 0);
  v_s3 := COALESCE((t.prize_distribution ->> '3rd')::numeric, 0);
  IF v_second IS NULL THEN v_s1 := v_s1 + v_s2; v_s2 := 0; END IF;
  IF COALESCE(cardinality(v_thirds), 0) = 0 THEN v_s1 := v_s1 + v_s3; v_s3 := 0; END IF;

  IF v_net > 0 AND v_first IS NOT NULL THEN
    PERFORM _pay_tournament_place(t, v_second, round(v_net * v_s2, 2), '2nd');
    v_paid := v_paid + round(v_net * v_s2, 2);
    IF v_s3 > 0 THEN
      FOREACH u IN ARRAY v_thirds LOOP
        PERFORM _pay_tournament_place(t, u, round(v_net * v_s3 / cardinality(v_thirds), 2), '3rd');
        v_paid := v_paid + round(v_net * v_s3 / cardinality(v_thirds), 2);
      END LOOP;
    END IF;
    PERFORM _pay_tournament_place(t, v_first, v_net - v_paid, '1st');
  END IF;

  -- Entries that didn't grow the pool go to the creator, minus 10%, on hold
  v_creator_entries := v_entries - v_bonus;
  IF v_creator_entries > 0 AND t.created_by IS NOT NULL THEN
    v_fee := v_fee + round(v_creator_entries * 0.10, 2);
    PERFORM _credit_held(t.created_by, v_creator_entries - round(v_creator_entries * 0.10, 2), 'entry_fees', t.id);
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (t.created_by, 'payout', v_creator_entries - round(v_creator_entries * 0.10, 2), 'Entry fees for ' || t.name || ' (on hold 24h)', 'completed', t.id, 'KES');
  END IF;

  IF v_fee > 0 THEN
    UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_fee WHERE id = (SELECT id FROM platform_settings LIMIT 1);
  END IF;
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.tournament_pool_bonus(p_tournament_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN t.prize_mode = 'sliding' AND COALESCE(t.entry_fee, 0) > 0 THEN
    LEAST(
      GREATEST((SELECT count(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id AND tp.amount_paid - COALESCE(tp.credit_used, 0) > 0) - COALESCE(t.sliding_after, 0), 0)
        * t.entry_fee * GREATEST(COALESCE(t.team_size, 1), 1),
      (SELECT COALESCE(sum(amount_paid - COALESCE(credit_used, 0)), 0) FROM tournament_participants tp WHERE tp.tournament_id = t.id)
    )
  ELSE 0 END
  FROM tournaments t WHERE t.id = p_tournament_id;
$$;


DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('refund_tournament_entry_fees', 'distribute_arena_prizes', 'tournament_pool_bonus')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = 'tournament_pool_bonus' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
