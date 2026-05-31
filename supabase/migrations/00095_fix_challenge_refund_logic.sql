CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge status changes to a terminal/non-playable status that requires a refund
  IF (OLD.status != NEW.status) AND (NEW.status IN ('declined', 'expired', 'cancelled')) THEN
    
    -- Rating penalty for cancelled matches that had a dispute
    IF NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN
      UPDATE profiles
      SET rating = GREATEST(rating - 0.5, 0.0)
      WHERE id IN (NEW.challenger_id, NEW.opponent_id);
    END IF;

    -- Refund challenger if they paid stake (Challenger pays when creating, i.e., in 'pending' status)
    IF OLD.stake_amount > 0 AND OLD.status IN ('pending', 'accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.challenger_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.challenger_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
          WHEN NEW.status = 'expired' THEN 'Challenge expired without response'
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;

    -- Refund opponent if they paid stake (Opponent pays when they accept, so status must have been 'accepted' or more)
    IF OLD.stake_amount > 0 AND OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.opponent_id;

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
      VALUES (
        OLD.opponent_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;