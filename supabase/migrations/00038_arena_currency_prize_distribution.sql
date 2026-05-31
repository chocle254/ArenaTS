-- Function to distribute Arena Currency prizes when tournament completes
CREATE OR REPLACE FUNCTION distribute_arena_prizes(
  p_tournament_id uuid,
  p_winner_user_id uuid,
  p_prize_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_platform_fee numeric;
  v_net_prize numeric;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Calculate platform fee (10%)
  v_platform_fee := p_prize_amount * 0.10;
  v_net_prize := p_prize_amount - v_platform_fee;
  
  -- Add Arena Currency to winner
  UPDATE profiles
  SET arena_currency = COALESCE(arena_currency, 0) + v_net_prize
  WHERE id = p_winner_user_id;
  
  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
  
  -- If tournament had entry fee, refund creator's $10 deposit
  IF v_tournament.entry_fee > 0 THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + 10
    WHERE id = v_tournament.created_by;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION distribute_arena_prizes TO authenticated;
