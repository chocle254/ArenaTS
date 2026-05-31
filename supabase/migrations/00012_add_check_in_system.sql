-- Add check-in fields to match_results table
ALTER TABLE match_results
ADD COLUMN IF NOT EXISTS player1_checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS player2_checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS check_in_deadline timestamptz,
ADD COLUMN IF NOT EXISTS both_players_ready boolean DEFAULT false;

-- Update auto_start_match function to handle check-in
CREATE OR REPLACE FUNCTION auto_start_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only set check-in deadline when BOTH players are present.
  -- If only one slot is filled, leave NULL and wait for second player.
  IF NEW.check_in_deadline IS NULL
    AND NEW.player1_id IS NOT NULL
    AND NEW.player2_id IS NOT NULL
  THEN
    NEW.check_in_deadline := now() + interval '5 minutes';
  END IF;

  -- Only start match timer when both players have checked in
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND NEW.match_started_at IS NULL THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
    NEW.both_players_ready := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Create function to handle check-in
CREATE OR REPLACE FUNCTION handle_player_check_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When both players check in, start the match timer
  IF NEW.player1_checked_in AND NEW.player2_checked_in AND OLD.both_players_ready = false THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + (COALESCE(NEW.match_duration_minutes, 30) || ' minutes')::interval;
    NEW.both_players_ready := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for check-in updates
DROP TRIGGER IF EXISTS handle_check_in_trigger ON match_results;
CREATE TRIGGER handle_check_in_trigger
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  WHEN (OLD.player1_checked_in IS DISTINCT FROM NEW.player1_checked_in 
        OR OLD.player2_checked_in IS DISTINCT FROM NEW.player2_checked_in)
  EXECUTE FUNCTION handle_player_check_in();