
-- Add creator_contribution field to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS creator_contribution numeric DEFAULT 0;

-- Create function to calculate prize pool
CREATE OR REPLACE FUNCTION calculate_prize_pool(
  p_tournament_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_fee numeric;
  v_current_players integer;
  v_creator_contribution numeric;
  v_platform_fee_percentage numeric;
  v_total_collected numeric;
  v_platform_fee numeric;
  v_prize_pool numeric;
BEGIN
  -- Get tournament details
  SELECT entry_fee, current_players, creator_contribution, platform_fee_percentage
  INTO v_entry_fee, v_current_players, v_creator_contribution, v_platform_fee_percentage
  FROM tournaments
  WHERE id = p_tournament_id;
  
  -- If entry fee is 0, return the manually set prize pool
  IF v_entry_fee = 0 THEN
    SELECT prize_pool INTO v_prize_pool FROM tournaments WHERE id = p_tournament_id;
    RETURN v_prize_pool;
  END IF;
  
  -- Calculate prize pool for paid tournaments
  v_total_collected := v_entry_fee * v_current_players;
  v_platform_fee := v_total_collected * (v_platform_fee_percentage / 100);
  v_prize_pool := v_total_collected - v_platform_fee + COALESCE(v_creator_contribution, 0);
  
  RETURN v_prize_pool;
END;
$$;

-- Create trigger to update prize pool when participants change
CREATE OR REPLACE FUNCTION update_tournament_prize_pool()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update if entry fee > 0
  IF NEW.entry_fee > 0 THEN
    NEW.prize_pool := calculate_prize_pool(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_prize_pool ON tournaments;
CREATE TRIGGER trigger_update_prize_pool
  BEFORE UPDATE OF current_players, creator_contribution
  ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_tournament_prize_pool();
