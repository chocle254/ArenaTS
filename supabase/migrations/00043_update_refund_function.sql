CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
BEGIN
  FOR v_participant IN 
    SELECT user_id, amount_paid 
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.amount_paid > 0
      -- Check if we already issued a refund for this tournament to this user
      AND NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = tp.user_id 
          AND tournament_id = p_tournament_id 
          AND type = 'refund'
      )
  LOOP
    -- Update user balance
    UPDATE profiles 
    SET arena_currency = COALESCE(arena_currency, 0) + v_participant.amount_paid,
        available_balance = COALESCE(available_balance, 0) + v_participant.amount_paid
    WHERE id = v_participant.user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_participant.user_id, 
      'refund', 
      v_participant.amount_paid, 
      'Refund for cancelled tournament: ' || p_tournament_id, 
      'completed', 
      p_tournament_id
    );
  END LOOP;
END;
$$;
