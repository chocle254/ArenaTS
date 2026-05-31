-- 1. Update the consolidated trigger function for challenge results
CREATE OR REPLACE FUNCTION handle_challenge_result_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
  v_system_msg text;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Only handle matches that are in relevant statuses
  IF NEW.status NOT IN ('accepted', 'disputed', 'disputed_warning') THEN
    RETURN NEW;
  END IF;

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
      -- If it's the first time they disagree, set warning status and notify
      IF NEW.status != 'disputed_warning' AND v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        
        -- Insert system message into match_messages
        v_system_msg := '⚠️ Both of you are claiming to be winners. Discuss again on the real winner. If you don''t come to an agreement, you can cancel the match but it will reduce your rating scores by 0.5. You can change your report until the timer ends.';
        
        INSERT INTO match_messages (challenge_id, user_id, message, is_system_message)
        VALUES (NEW.id, NULL, v_system_msg, true);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure RLS is permissive enough for disputes and manual cancellations
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;

CREATE POLICY "Participants can update live challenges" ON challenges
FOR UPDATE TO authenticated
USING (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND 
  status IN ('accepted', 'disputed', 'disputed_warning')
)
WITH CHECK (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND
  auth.uid() = submitted_by
);

-- Note: We removed the status check in WITH CHECK to allow the trigger to change status freely
-- during the update, and to allow users to set 'cancelled' manually.
