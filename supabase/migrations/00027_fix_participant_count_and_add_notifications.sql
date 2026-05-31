
-- Create trigger function to update current_players count
CREATE OR REPLACE FUNCTION update_tournament_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment current_players when a participant joins
    UPDATE tournaments
    SET current_players = current_players + 1
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement current_players when a participant leaves
    UPDATE tournaments
    SET current_players = GREATEST(0, current_players - 1)
    WHERE id = OLD.tournament_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tournament_participants
DROP TRIGGER IF EXISTS update_participant_count_trigger ON tournament_participants;
CREATE TRIGGER update_participant_count_trigger
AFTER INSERT OR DELETE ON tournament_participants
FOR EACH ROW
EXECUTE FUNCTION update_tournament_participant_count();

-- Fix existing tournaments by recalculating current_players
UPDATE tournaments t
SET current_players = (
  SELECT COUNT(*)
  FROM tournament_participants tp
  WHERE tp.tournament_id = t.id
);

-- Create function to send tournament reminders
CREATE OR REPLACE FUNCTION send_tournament_reminders()
RETURNS void AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_time_until_start interval;
BEGIN
  -- Find tournaments starting in 13-17 minutes (to catch the 15-minute window)
  FOR v_tournament IN
    SELECT id, name, start_time, game_type
    FROM tournaments
    WHERE status = 'open'
      AND start_time > NOW()
      AND start_time <= NOW() + interval '17 minutes'
      AND start_time >= NOW() + interval '13 minutes'
  LOOP
    -- Calculate exact time until start
    v_time_until_start := v_tournament.start_time - NOW();
    
    -- Send notification to all participants
    FOR v_participant IN
      SELECT user_id
      FROM tournament_participants
      WHERE tournament_id = v_tournament.id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (
        v_participant.user_id,
        'tournament_reminder',
        'Tournament Starting Soon! ⏰',
        format('Your tournament "%s" starts in %s minutes. Get ready!', 
          v_tournament.name,
          ROUND(EXTRACT(EPOCH FROM v_time_until_start) / 60)
        ),
        '/tournaments/' || v_tournament.id,
        NOW()
      );
    END LOOP;
    
    RAISE NOTICE 'Sent reminders for tournament: %', v_tournament.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_tournament_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION send_tournament_reminders() TO service_role;
