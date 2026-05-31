CREATE OR REPLACE FUNCTION distribute_arena_prizes(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
  v_platform_fee numeric;
  v_net_prize numeric;
  v_total_entry_fees numeric;
  v_winner_id uuid;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Only distribute if not already completed
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- Calculate platform fee (10% of creator's prize pool)
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;
  
  -- Calculate total entry fees to be sent to creator
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  -- Identify the winner of the final match
  -- The final match is always the one in the highest round number
  SELECT winner_id INTO v_winner_id 
  FROM match_results 
  WHERE tournament_id = p_tournament_id 
    AND status = 'confirmed'
  ORDER BY round DESC, created_at DESC 
  LIMIT 1;

  IF v_winner_id IS NOT NULL THEN
    -- Distribute the net prize to the winner
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + v_net_prize,
        available_balance = COALESCE(available_balance, 0) + v_net_prize
    WHERE id = v_winner_id;
    
    -- Record transaction for winner
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 
      'payout', 
      v_net_prize, 
      'Tournament prize for winning: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    -- Notify winner
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_winner_id,
      'Tournament Winner!',
      'Congratulations! You won ' || v_tournament.name || ' and received A$' || v_net_prize,
      'tournament',
      '/wallet'
    );
  END IF;

  -- Pay total entry fees to creator
  IF v_total_entry_fees > 0 THEN
    UPDATE profiles
    SET arena_currency = COALESCE(arena_currency, 0) + v_total_entry_fees,
        available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    -- Record transaction for creator
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 
      'payout', 
      v_total_entry_fees, 
      'Entry fees collected for tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    -- Notify creator
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_tournament.created_by,
      'Tournament Entry Fees Collected',
      'You collected A$' || v_total_entry_fees || ' in entry fees from ' || v_tournament.name,
      'payment',
      '/wallet'
    );
  END IF;

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;

  -- Mark as distributed
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$$;
