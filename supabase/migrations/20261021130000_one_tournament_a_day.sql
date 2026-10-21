-- Regular players can host one tournament per 24 hours. Cancelled tournaments
-- don't count, so a creator whose tournament didn't fill can try again. Verified
-- organizers and admins are exempt. created_at is set by the server so it
-- can't be backdated to get around the limit.
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
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
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
