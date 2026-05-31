
-- Create trigger function to send notification when challenge is created
CREATE OR REPLACE FUNCTION notify_challenge_opponent()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_gamertag text;
  v_game_name text;
BEGIN
  -- Get challenger's gamertag
  SELECT gamertag INTO v_challenger_gamertag
  FROM profiles
  WHERE id = NEW.challenger_id;
  
  -- Format game name
  v_game_name := UPPER(NEW.game);
  
  -- Insert notification for opponent
  INSERT INTO notifications (user_id, type, title, message, link, created_at)
  VALUES (
    NEW.opponent_id,
    'challenge_received',
    '⚔️ New Challenge!',
    format('%s challenged you to a %s match for $%s!', 
      v_challenger_gamertag,
      v_game_name,
      NEW.stake_amount
    ),
    '/profile',
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on challenges table
DROP TRIGGER IF EXISTS notify_on_challenge_insert ON challenges;
CREATE TRIGGER notify_on_challenge_insert
AFTER INSERT ON challenges
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_challenge_opponent();

-- Create function to send notifications when tournament goes live
CREATE OR REPLACE FUNCTION notify_tournament_live()
RETURNS TRIGGER AS $$
DECLARE
  v_participant RECORD;
BEGIN
  -- Only send notifications when status changes to 'live'
  IF NEW.status = 'live' AND OLD.status != 'live' THEN
    -- Send notification to all participants
    FOR v_participant IN
      SELECT user_id
      FROM tournament_participants
      WHERE tournament_id = NEW.id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (
        v_participant.user_id,
        'tournament_live',
        '🔴 Tournament is LIVE!',
        format('"%s" has started! Join now and compete!', NEW.name),
        '/tournaments/' || NEW.id,
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tournaments table
DROP TRIGGER IF EXISTS notify_on_tournament_live ON tournaments;
CREATE TRIGGER notify_on_tournament_live
AFTER UPDATE OF status ON tournaments
FOR EACH ROW
EXECUTE FUNCTION notify_tournament_live();
