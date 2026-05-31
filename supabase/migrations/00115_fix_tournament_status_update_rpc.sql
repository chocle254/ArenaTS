CREATE OR REPLACE FUNCTION check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Generate brackets for tournaments starting soon
  PERFORM generate_tournament_brackets();

  -- 2. Start tournaments that have reached start time
  -- Note: generate_tournament_brackets already sets status to 'active' for tournaments it processes,
  -- but this handles cases where bracket was generated but status was still 'open' (if any).
  UPDATE tournaments
  SET status = 'active'
  WHERE status = 'open'
    AND bracket_generated = true
    AND start_time <= now()
    AND current_players >= min_participants;

  -- 3. Enforce check-in deadlines
  -- Changed from enforce_check_in_deadlines() to process_expired_check_ins()
  PERFORM process_expired_check_ins();

  -- 4. Cancel tournaments that didn't meet minimum participants
  UPDATE tournaments
  SET status = 'cancelled'
  WHERE status = 'open'
    AND start_time <= now()
    AND current_players < min_participants;

  -- 5. Complete tournaments where all matches are confirmed
  UPDATE tournaments t
  SET status = 'completed',
      updated_at = now()
  WHERE t.status = 'active'
    AND EXISTS (SELECT 1 FROM match_results mr WHERE mr.tournament_id = t.id)
    AND NOT EXISTS (
      SELECT 1 FROM match_results mr 
      WHERE mr.tournament_id = t.id 
        AND mr.status != 'confirmed'
    );

  -- 6. Refund cancelled tournaments (if not already refunded)
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
