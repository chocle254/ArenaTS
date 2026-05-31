-- Add timing fields to match_results table
ALTER TABLE match_results
ADD COLUMN IF NOT EXISTS match_started_at timestamptz,
ADD COLUMN IF NOT EXISTS match_deadline timestamptz,
ADD COLUMN IF NOT EXISTS match_duration_minutes integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS time_extended_by_admin integer DEFAULT 0;

-- Add default match duration to tournaments
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS default_match_duration_minutes integer DEFAULT 30;

-- Create function to auto-start match when both players are assigned
CREATE OR REPLACE FUNCTION auto_start_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set match start time and deadline when match result is created
  IF NEW.match_started_at IS NULL THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-starting matches
DROP TRIGGER IF EXISTS auto_start_match_trigger ON match_results;
CREATE TRIGGER auto_start_match_trigger
  BEFORE INSERT ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION auto_start_match();