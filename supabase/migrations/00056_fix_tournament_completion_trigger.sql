CREATE OR REPLACE FUNCTION check_for_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_matches_needed integer;
  v_confirmed_matches integer;
  v_max_players integer;
  v_team_size integer;
  v_total_teams integer;
BEGIN
  -- Only run if a match is confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Get tournament info
    SELECT max_players, team_size INTO v_max_players, v_team_size FROM tournaments WHERE id = NEW.tournament_id;
    
    IF v_team_size > 1 THEN
      v_total_teams := v_max_players / v_team_size;
      v_total_matches_needed := v_total_teams - 1;
    ELSE
      v_total_matches_needed := v_max_players - 1;
    END IF;

    -- Special case for 2 players/teams: 1 match needed
    IF v_total_matches_needed < 1 THEN
      v_total_matches_needed := 1;
    END IF;
    
    -- Check how many matches are confirmed
    SELECT COUNT(*) INTO v_confirmed_matches FROM match_results 
    WHERE tournament_id = NEW.tournament_id AND status = 'confirmed';
    
    -- If we have enough matches confirmed, it might be the end
    IF v_confirmed_matches >= v_total_matches_needed THEN
      UPDATE tournaments SET status = 'completed' WHERE id = NEW.tournament_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
