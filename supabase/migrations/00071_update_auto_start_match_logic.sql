CREATE OR REPLACE FUNCTION auto_start_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

  -- Only set check-in deadline when BOTH players are present.
  -- If only one player slot is filled (first winner just arrived),
  -- leave check_in_deadline as NULL and wait for the second player.
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