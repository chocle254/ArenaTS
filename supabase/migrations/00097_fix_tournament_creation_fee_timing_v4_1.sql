-- 1. Drop the old BEFORE trigger
DROP TRIGGER IF EXISTS tr_tournament_creation_fee ON tournaments;

-- 2. Update the function (keep it the same logic, but now it will run AFTER)
CREATE OR REPLACE FUNCTION public.handle_tournament_creation_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_balance decimal;
BEGIN
  IF NEW.prize_pool > 0 THEN
    -- Check balance
    SELECT arena_currency INTO v_balance FROM profiles WHERE id = NEW.created_by;
    IF v_balance < NEW.prize_pool THEN
      RAISE EXCEPTION 'Insufficient Arena Currency to create tournament';
    END IF;

    -- Set bypass for profile protection
    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    -- Deduct balance
    UPDATE profiles 
    SET arena_currency = arena_currency - NEW.prize_pool,
        available_balance = available_balance - NEW.prize_pool
    WHERE id = NEW.created_by;
    
    PERFORM set_config('app.bypass_profile_protection', 'false', true);

    -- Record transaction (This now works because NEW.id exists in tournaments table in AFTER trigger)
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (NEW.created_by, 'tournament_fee', -NEW.prize_pool, 'Tournament creation fee: ' || NEW.name, 'completed', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger as AFTER INSERT
CREATE TRIGGER tr_tournament_creation_fee
AFTER INSERT ON tournaments
FOR EACH ROW
EXECUTE FUNCTION handle_tournament_creation_fee();
