-- Function to handle challenge completion when reports agree
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
      
      -- If it was a dispute, we can clear it or leave it as history
      -- But here we just complete it.
    
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

-- Create trigger for challenge completion
DROP TRIGGER IF EXISTS trigger_handle_challenge_completion ON challenges;
CREATE TRIGGER trigger_handle_challenge_completion
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION handle_challenge_completion();
