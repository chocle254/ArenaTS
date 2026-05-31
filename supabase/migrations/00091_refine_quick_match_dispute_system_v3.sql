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
      -- First dispute: Set warning status, keep reports, and notify in chat
      IF v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        
        -- Insert system message into match_messages
        v_system_msg := '⚠️ Both of you are claiming to be winners. Discuss again on the real winner. If you don''t come to an agreement, you can cancel the match but it will reduce your rating scores by 0.5. You can change your report until the timer ends.';
        
        INSERT INTO match_messages (challenge_id, user_id, message, is_system_message)
        VALUES (NEW.id, '00000000-0000-0000-0000-000000000000'::uuid, v_system_msg, true);
        
      -- We no longer auto-cancel here, we allow the players to use the cancel button
      -- OR if they change their reports and still disagree, it stays in disputed_warning
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the refund and rating penalty trigger
CREATE OR REPLACE FUNCTION handle_challenge_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- If challenge is declined, expired, or cancelled
  IF (OLD.status != NEW.status) AND (NEW.status IN ('declined', 'expired', 'cancelled')) THEN
    
    -- Rating penalty for cancelled matches that had a dispute
    IF NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN
      UPDATE profiles
      SET rating = GREATEST(rating - 0.5, 0.0)
      WHERE id IN (NEW.challenger_id, NEW.opponent_id);
    END IF;

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
          WHEN NEW.status = 'cancelled' AND NEW.dispute_count >= 1 THEN 'Match cancelled due to dispute'
          ELSE 'Match cancelled'
        END,
        'completed',
        OLD.id
      );
    END IF;

    -- Refund opponent if they paid stake
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
