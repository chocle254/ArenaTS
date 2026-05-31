CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
  v_tournament record;
  v_creator_refund numeric;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Refund Participants
  FOR v_participant IN 
    SELECT user_id, amount_paid 
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.amount_paid > 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions 
        WHERE user_id = tp.user_id 
          AND tournament_id = p_tournament_id 
          AND type = 'refund'
          AND description NOT LIKE 'Creator refund%'
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
      'Refund for cancelled tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );
  END LOOP;

  -- 2. Refund Creator Deposit/Contribution
  -- Calculate what the creator paid
  IF v_tournament.entry_fee > 0 THEN
    v_creator_refund := 10; -- The $10 deposit
  ELSE
    v_creator_refund := v_tournament.creator_contribution; -- The prize pool they funded
  END IF;

  IF v_creator_refund > 0 THEN
    -- Check if creator already got a refund for this tournament
    IF NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE user_id = v_tournament.created_by 
        AND tournament_id = p_tournament_id 
        AND type = 'refund'
        AND description LIKE 'Creator refund%'
    ) THEN
      UPDATE profiles 
      SET arena_currency = COALESCE(arena_currency, 0) + v_creator_refund,
          available_balance = COALESCE(available_balance, 0) + v_creator_refund
      WHERE id = v_tournament.created_by;

      INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
      VALUES (
        v_tournament.created_by, 
        'refund', 
        v_creator_refund, 
        'Creator refund for cancelled tournament: ' || v_tournament.name, 
        'completed', 
        p_tournament_id
      );
    END IF;
  END IF;
END;
$$;
