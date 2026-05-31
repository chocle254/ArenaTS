-- Update the tournament status check function to call bracket generation and check-in enforcement
CREATE OR REPLACE FUNCTION check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Generate brackets for tournaments starting in 15 minutes
  PERFORM generate_tournament_brackets();

  -- 2. Start tournaments that have generated brackets and reached start time
  UPDATE tournaments
  SET status = 'active'
  WHERE status = 'open'
    AND bracket_generated = true
    AND start_time <= now()
    AND current_players >= min_participants;

  -- 3. Enforce check-in deadlines
  PERFORM enforce_check_in_deadlines();

  -- 4. Cancel tournaments that didn't meet minimum participants
  UPDATE tournaments
  SET status = 'cancelled'
  WHERE status = 'open'
    AND start_time <= now()
    AND current_players < min_participants;

  -- Refund cancelled tournaments
  PERFORM refund_tournament_entry_fees(id)
  FROM tournaments
  WHERE status = 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE tournament_id = tournaments.id 
        AND type = 'refund'
    );
END;
$$;
