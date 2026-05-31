-- Add rating field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rating NUMERIC(4,2) DEFAULT 5.0 NOT NULL;

-- Add dispute tracking fields to challenges table
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS dispute_warning_shown BOOLEAN DEFAULT false;

-- Create function to handle Quick Match result submission
CREATE OR REPLACE FUNCTION handle_quick_match_result()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- First dispute: Set warning status
      IF v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        -- Clear reports to allow resubmission
        NEW.challenger_reported_winner := NULL;
        NEW.opponent_reported_winner := NULL;
        
      -- Second dispute: Cancel match and reduce ratings
      ELSE
        NEW.status := 'cancelled';
        NEW.completed_at := now();
        NEW.dispute_count := 2;
        
        -- Reduce both players' ratings by 0.5
        UPDATE profiles
        SET rating = GREATEST(rating - 0.5, 0.0)
        WHERE id IN (NEW.challenger_id, NEW.opponent_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for Quick Match result handling
DROP TRIGGER IF EXISTS trigger_handle_quick_match_result ON challenges;
CREATE TRIGGER trigger_handle_quick_match_result
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  WHEN (NEW.challenger_reported_winner IS DISTINCT FROM OLD.challenger_reported_winner 
    OR NEW.opponent_reported_winner IS DISTINCT FROM OLD.opponent_reported_winner)
  EXECUTE FUNCTION handle_quick_match_result();