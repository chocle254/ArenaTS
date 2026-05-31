-- Add last_seen_at to profiles
ALTER TABLE profiles ADD COLUMN last_seen_at timestamptz DEFAULT now();

-- Add min_participants to tournaments
ALTER TABLE tournaments ADD COLUMN min_participants integer DEFAULT 5;

-- Update existing tournaments if any
UPDATE tournaments SET min_participants = 5 WHERE min_participants IS NULL;

-- Function to refund entry fees when a tournament is cancelled
CREATE OR REPLACE FUNCTION refund_tournament_entry_fees(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    SET available_balance = available_balance + v_participant.entry_fee
    WHERE id = v_participant.user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (v_participant.user_id, 'refund', v_participant.entry_fee, 'Refund for cancelled tournament ' || p_tournament_id, 'completed');
    
    -- Notify user
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (v_participant.user_id, 'Tournament Cancelled', 'Tournament has been cancelled due to insufficient participants. Your entry fee has been refunded.', 'system');
  END LOOP;
END;
$$;

-- Function to check and cancel tournaments starting soon with insufficient participants
CREATE OR REPLACE FUNCTION check_and_cancel_insufficient_tournaments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament record;
BEGIN
  -- Find tournaments starting in the next 5 minutes that are still 'open' and have < min_participants
  -- Or tournaments that just started but didn't reach min_participants
  FOR v_tournament IN 
    SELECT id, name, current_players, min_participants
    FROM tournaments
    WHERE status = 'open' 
      AND start_time <= now() + interval '1 minute'
      AND current_players < min_participants
  LOOP
    -- Cancel the tournament
    UPDATE tournaments 
    SET status = 'cancelled', updated_at = now()
    WHERE id = v_tournament.id;
    
    -- Refund fees
    PERFORM refund_tournament_entry_fees(v_tournament.id);
    
    RAISE NOTICE 'Cancelled tournament % due to insufficient participants (%/%)', v_tournament.name, v_tournament.current_players, v_tournament.min_participants;
  END LOOP;
END;
$$;
