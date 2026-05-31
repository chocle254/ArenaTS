-- Update refund trigger to handle cancelled disputes
CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge is declined, expired, or cancelled (including dispute cancellations), refund both players
  IF (OLD.status != NEW.status) AND (NEW.status IN ('declined', 'expired', 'cancelled')) THEN
    
    -- Refund challenger if they paid stake
    IF OLD.stake_amount > 0 AND OLD.status != 'pending' THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.challenger_id;

      INSERT INTO transactions (user_id, type, amount, description, status, metadata)
      VALUES (
        OLD.challenger_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'declined' THEN 'Challenge declined by opponent'
          WHEN NEW.status = 'expired' THEN 'Challenge expired without response'
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 2 THEN 'Match cancelled due to repeated disputes'
          ELSE 'Match cancelled'
        END,
        'completed',
        jsonb_build_object('challenge_id', OLD.id)
      );
    END IF;

    -- Refund opponent if they paid stake (for accepted/active matches)
    IF OLD.stake_amount > 0 AND OLD.status IN ('accepted', 'disputed', 'disputed_warning') THEN
      UPDATE profiles
      SET arena_currency = arena_currency + OLD.stake_amount,
          available_balance = available_balance + OLD.stake_amount
      WHERE id = OLD.opponent_id;

      INSERT INTO transactions (user_id, type, amount, description, status, metadata)
      VALUES (
        OLD.opponent_id, 
        'refund', 
        OLD.stake_amount, 
        CASE 
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 2 THEN 'Match cancelled due to repeated disputes'
          ELSE 'Match cancelled'
        END,
        'completed',
        jsonb_build_object('challenge_id', OLD.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;