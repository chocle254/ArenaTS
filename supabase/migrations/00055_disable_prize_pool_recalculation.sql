-- Drop the trigger that auto-calculates prize pool from entry fees
DROP TRIGGER IF EXISTS trigger_update_prize_pool ON tournaments;

-- Update calculate_prize_pool to just return the current prize pool
CREATE OR REPLACE FUNCTION calculate_prize_pool(
  p_tournament_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prize_pool numeric;
BEGIN
  SELECT prize_pool INTO v_prize_pool FROM tournaments WHERE id = p_tournament_id;
  RETURN v_prize_pool;
END;
$$;
