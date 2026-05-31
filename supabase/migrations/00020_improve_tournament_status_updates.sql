-- Drop the old function
DROP FUNCTION IF EXISTS check_and_update_tournament_status();

-- Create improved function that handles all status transitions
CREATE OR REPLACE FUNCTION check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update open tournaments to active when start time is reached
  UPDATE tournaments
  SET status = 'active'
  WHERE status = 'open'
  AND start_time <= NOW();

  -- Update active tournaments to completed after 3 hours
  UPDATE tournaments
  SET status = 'completed'
  WHERE status = 'active'
  AND start_time < NOW() - INTERVAL '3 hours';
END;
$$;