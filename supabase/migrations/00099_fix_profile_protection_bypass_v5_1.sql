-- 1. Update the actual function used by the trigger
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role user_role;
BEGIN
  -- Check for bypass setting
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow updates from the postgres/service role (internal system updates)
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- If not an authenticated session, we might be in an internal process
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the role of the user performing the update
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- If not an admin, prevent changing sensitive columns
  IF v_user_role IS DISTINCT FROM 'admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.total_earnings IS DISTINCT FROM OLD.total_earnings OR
       NEW.arena_currency IS DISTINCT FROM OLD.arena_currency OR
       NEW.available_balance IS DISTINCT FROM OLD.available_balance OR
       NEW.pending_balance IS DISTINCT FROM OLD.pending_balance OR
       NEW.wins IS DISTINCT FROM OLD.wins OR
       NEW.losses IS DISTINCT FROM OLD.losses OR
       NEW.win_rate IS DISTINCT FROM OLD.win_rate OR
       NEW.current_streak IS DISTINCT FROM OLD.current_streak OR
       NEW.longest_streak IS DISTINCT FROM OLD.longest_streak OR
       NEW.global_rank IS DISTINCT FROM OLD.global_rank OR
       NEW.tournaments_won IS DISTINCT FROM OLD.tournaments_won OR
       NEW.tournaments_played IS DISTINCT FROM OLD.tournaments_played OR
       NEW.is_suspended IS DISTINCT FROM OLD.is_suspended OR
       NEW.banned_until IS DISTINCT FROM OLD.banned_until OR
       NEW.rating IS DISTINCT FROM OLD.rating
    THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify sensitive account fields.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the redundant function I created earlier if it exists
DROP FUNCTION IF EXISTS public.tr_protect_profile_sensitive_columns();
