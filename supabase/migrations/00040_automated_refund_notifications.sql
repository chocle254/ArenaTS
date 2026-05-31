-- 1. Update refund_tournament_entry_fees to use arena_currency and remove manual notification
CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void AS $$
DECLARE
  v_participant record;
BEGIN
  FOR v_participant IN 
    SELECT user_id, entry_fee 
    FROM tournament_participants tp
    JOIN tournaments t ON t.id = tp.tournament_id
    WHERE tp.tournament_id = p_tournament_id
  LOOP
    -- Update user balance
    UPDATE profiles 
    SET arena_currency = arena_currency + v_participant.entry_fee,
        available_balance = available_balance + v_participant.entry_fee
    WHERE id = v_participant.user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (v_participant.user_id, 'refund', v_participant.entry_fee, 'Refund for cancelled tournament: ' || p_tournament_id, 'completed', p_tournament_id);
    
    -- Notification will be handled by the transactions trigger
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Handle Challenge Refunds via trigger
CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge is declined or expired, refund the challenger
  IF (OLD.status = 'pending' AND (NEW.status = 'declined' OR NEW.status = 'expired')) THEN
    -- Update user balance
    UPDATE profiles
    SET arena_currency = arena_currency + OLD.stake_amount,
        available_balance = available_balance + OLD.stake_amount
    WHERE id = OLD.challenger_id;

    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status, metadata)
    VALUES (
      OLD.challenger_id, 
      'refund', 
      OLD.stake_amount, 
      CASE 
        WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
        ELSE 'Challenge expired without response'
      END,
      'completed',
      jsonb_build_object('challenge_id', OLD.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists and drop if it does
DROP TRIGGER IF EXISTS challenge_refund_trigger ON challenges;

CREATE TRIGGER challenge_refund_trigger
AFTER UPDATE ON challenges
FOR EACH ROW
EXECUTE FUNCTION handle_challenge_refund();

-- 3. Automated Notification on any refund transaction
CREATE OR REPLACE FUNCTION create_refund_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.type = 'refund') THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Refund Issued',
      'A refund of A$' || NEW.amount || ' has been processed: ' || NEW.description,
      'payment'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists and drop if it does
DROP TRIGGER IF EXISTS refund_notification_trigger ON transactions;

CREATE TRIGGER refund_notification_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION create_refund_notification();
