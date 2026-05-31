-- 1. Update distribute_arena_prizes function to reflect new logic
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
  v_winner record;
  v_distribution jsonb;
  v_place_amount numeric;
  v_place text;
  v_winner_id uuid;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Only distribute if not already completed (or to prevent double distribution)
  -- But we call this when status CHANGES to completed, so let's check a flag
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  -- Calculate platform fee (10% of creator's prize pool)
  v_platform_fee := v_tournament.prize_pool * 0.10;
  v_net_prize := v_tournament.prize_pool - v_platform_fee;
  
  -- Calculate total entry fees to be sent to creator
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  -- Distribute prizes to winners based on prize_distribution
  -- For now, we mainly support 1st place in this refactor to ensure it works
  -- The tournament should have a winner_id if completed correctly
  
  -- In single elimination, the winner of the final match is the tournament winner
  -- Let's try to find the winner of the final match
  SELECT winner_id INTO v_winner_id 
  FROM match_results 
  WHERE tournament_id = p_tournament_id 
    AND status = 'confirmed'
  ORDER BY round DESC, created_at DESC 
  LIMIT 1;

  IF v_winner_id IS NOT NULL THEN
    -- Distribute the net prize to the winner
    -- (We can expand this to multiple winners based on v_tournament.prize_distribution if needed)
    -- For simplicity and following the user's "sent to the winner" request:
    
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
  END IF;

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;

  -- Mark as distributed
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$$;

-- 2. Add prizes_distributed column to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prizes_distributed boolean DEFAULT false;

-- 3. Update refund_tournament_entry_fees function
CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant record;
  v_tournament record;
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

  -- 2. Refund Creator their prize pool payment
  IF v_tournament.prize_pool > 0 THEN
    -- Check if creator already got a refund for this tournament
    IF NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE user_id = v_tournament.created_by 
        AND tournament_id = p_tournament_id 
        AND type = 'refund'
        AND description LIKE 'Creator refund%'
    ) THEN
      UPDATE profiles 
      SET arena_currency = COALESCE(arena_currency, 0) + v_tournament.prize_pool,
          available_balance = COALESCE(available_balance, 0) + v_tournament.prize_pool
    WHERE id = v_tournament.created_by;

      INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
      VALUES (
        v_tournament.created_by, 
        'refund', 
        v_tournament.prize_pool, 
        'Creator refund for cancelled tournament: ' || v_tournament.name, 
        'completed', 
        p_tournament_id
      );
    END IF;
  END IF;
END;
$$;

-- 4. Create trigger to automatically distribute prizes when tournament is completed
CREATE OR REPLACE FUNCTION handle_tournament_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM distribute_arena_prizes(NEW.id);
  END IF;

  -- Also handle cancellation
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM refund_tournament_entry_fees(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_tournament_status_change ON tournaments;
CREATE TRIGGER trigger_tournament_status_change
  AFTER UPDATE OF status
  ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION handle_tournament_status_change();

-- 5. Add trigger to match_results to complete tournament if final match is confirmed
CREATE OR REPLACE FUNCTION check_for_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_matches integer;
  v_confirmed_matches integer;
  v_max_players integer;
BEGIN
  -- Only run if a match is confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Get tournament info
    SELECT max_players INTO v_max_players FROM tournaments WHERE id = NEW.tournament_id;
    
    -- In a single elimination bracket, total matches is max_players - 1
    -- Check if all matches are confirmed
    SELECT COUNT(*) INTO v_confirmed_matches FROM match_results 
    WHERE tournament_id = NEW.tournament_id AND status = 'confirmed';
    
    -- If we have enough matches confirmed, it might be the end
    -- For solo tournaments, it's exactly max_players - 1
    IF v_confirmed_matches >= (v_max_players - 1) THEN
      UPDATE tournaments SET status = 'completed' WHERE id = NEW.tournament_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_tournament_completion ON match_results;
CREATE TRIGGER trigger_check_tournament_completion
  AFTER UPDATE OF status
  ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION check_for_tournament_completion();
