-- Add challenge_id column to transactions table for better tracking
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES challenges(id);

-- Update the distribution function to use the correct columns
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id UUID)
RETURNS VOID AS $$
DECLARE
  v_challenge record;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only distribute if match is completed and winner is set
  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if already distributed to avoid double payment
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'payout') THEN
    RETURN;
  END IF;

  -- Add prize pool to winner
  UPDATE profiles
  SET 
    arena_currency = COALESCE(arena_currency, 0) + v_challenge.prize_pool,
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool,
    total_earnings = COALESCE(total_earnings, 0) + v_challenge.prize_pool,
    wins = COALESCE(wins, 0) + 1
  WHERE id = v_challenge.winner_id;

  -- Increment losses for the opponent
  UPDATE profiles
  SET 
    losses = COALESCE(losses, 0) + 1
  WHERE id = CASE 
    WHEN v_challenge.winner_id = v_challenge.challenger_id THEN v_challenge.opponent_id 
    ELSE v_challenge.challenger_id 
  END;

  -- Record transaction for winner
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (
    v_challenge.winner_id, 
    'payout', 
    v_challenge.prize_pool, 
    'Quick Match prize for winning: ' || v_challenge.game, 
    'completed', 
    p_challenge_id
  );

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_challenge.platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the refund function to use the challenge_id column as well
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

      INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
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
        OLD.id
      );
    END IF;

    -- Refund opponent if they paid stake (for accepted/active matches)
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
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 2 THEN 'Match cancelled due to repeated disputes'
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
