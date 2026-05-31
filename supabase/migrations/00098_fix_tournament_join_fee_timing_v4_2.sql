-- 1. Drop the old BEFORE trigger
DROP TRIGGER IF EXISTS tr_tournament_join_fee ON tournament_participants;

-- 2. Update the function (keep it the same logic, but now it will run AFTER)
CREATE OR REPLACE FUNCTION public.handle_tournament_join_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_fee decimal;
  v_balance decimal;
  v_tournament_name text;
BEGIN
  SELECT entry_fee, name INTO v_entry_fee, v_tournament_name FROM tournaments WHERE id = NEW.tournament_id;
  IF v_entry_fee > 0 THEN
    SELECT arena_currency INTO v_balance FROM profiles WHERE id = NEW.user_id;
    IF v_balance < v_entry_fee THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Set bypass
    PERFORM set_config('app.bypass_profile_protection', 'true', true);

    UPDATE profiles 
    SET arena_currency = arena_currency - v_entry_fee,
        available_balance = available_balance - v_entry_fee
    WHERE id = NEW.user_id;

    PERFORM set_config('app.bypass_profile_protection', 'false', true);

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (NEW.user_id, 'tournament_fee', -v_entry_fee, 'Entry fee: ' || v_tournament_name, 'completed', NEW.tournament_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger as AFTER INSERT
CREATE TRIGGER tr_tournament_join_fee
AFTER INSERT ON tournament_participants
FOR EACH ROW
EXECUTE FUNCTION handle_tournament_join_fee();
