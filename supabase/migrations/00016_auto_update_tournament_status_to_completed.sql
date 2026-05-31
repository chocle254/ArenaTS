
-- Create function to check and update tournament status to completed
CREATE OR REPLACE FUNCTION check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update tournaments to 'completed' if they've been live/active for more than 3 hours
  UPDATE tournaments
  SET status = 'completed'
  WHERE status IN ('live', 'active')
  AND start_time < NOW() - INTERVAL '3 hours';
END;
$$;

-- Create function that can be called to get updated tournament status
CREATE OR REPLACE FUNCTION get_tournament_status(tournament_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_start_time timestamptz;
BEGIN
  SELECT status, start_time INTO v_status, v_start_time
  FROM tournaments
  WHERE id = tournament_id;
  
  -- If tournament is live/active and 3+ hours have passed, return 'completed'
  IF v_status IN ('live', 'active') AND v_start_time < NOW() - INTERVAL '3 hours' THEN
    -- Update the status in database
    UPDATE tournaments SET status = 'completed' WHERE id = tournament_id;
    RETURN 'completed';
  END IF;
  
  RETURN v_status;
END;
$$;
