-- Create function to distribute prizes for completed challenges
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge record;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Prevent double distribution
  -- We'll use completed_at as a proxy or just check if it's already completed
  -- Actually this function will be called when status transitions to completed
  
  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if already distributed (we might need a flag, but for now we'll check transactions)
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'payout') THEN
    RETURN;
  END IF;

  -- Add prize pool to winner
  UPDATE profiles
  SET 
    arena_currency = COALESCE(arena_currency, 0) + v_challenge.prize_pool,
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool
  WHERE id = v_challenge.winner_id;

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
$$;

-- Update handle_challenge_completion to call distribute_challenge_prizes
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run if status is accepted or disputed
  IF NEW.status IN ('accepted', 'disputed') THEN
    
    -- Check if both players have reported and they agree
    IF NEW.challenger_reported_winner IS NOT NULL 
       AND NEW.opponent_reported_winner IS NOT NULL 
       AND NEW.challenger_reported_winner = NEW.opponent_reported_winner
    THEN
      -- Agreement reached
      NEW.status := 'completed';
      NEW.winner_id := NEW.challenger_reported_winner;
      NEW.completed_at := now();
      
      -- We'll use an AFTER trigger for prize distribution to avoid nested transaction issues if any
    
    -- Check if both have reported but they disagree
    ELSIF NEW.challenger_reported_winner IS NOT NULL 
          AND NEW.opponent_reported_winner IS NOT NULL 
          AND NEW.challenger_reported_winner != NEW.opponent_reported_winner
    THEN
      -- Conflict -> Dispute
      NEW.status := 'disputed';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Create AFTER trigger for prize distribution
CREATE OR REPLACE FUNCTION trigger_distribute_challenge_prizes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM distribute_challenge_prizes(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_challenge_prize_distribution ON challenges;
CREATE TRIGGER trigger_challenge_prize_distribution
  AFTER UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_distribute_challenge_prizes();
