-- 1. Add submitted_by column for RLS parity with match_results
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);

-- 2. Add RLS policies for live challenges
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;
CREATE POLICY "Participants can update live challenges"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND
    (status IN ('accepted', 'disputed'))
  )
  WITH CHECK (
    auth.uid() = submitted_by
  );

-- 3. Create auto_start_challenge function to match tournament logic
CREATE OR REPLACE FUNCTION auto_start_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

  -- Only set check-in deadline when BOTH players are present.
  -- In challenges, they are usually both present from the start once 'accepted',
  -- but we'll follow the same logic for consistency.
  IF NEW.status = 'accepted' AND NEW.check_in_deadline IS NULL
    AND NEW.challenger_id IS NOT NULL
    AND NEW.opponent_id IS NOT NULL
  THEN
    NEW.check_in_deadline := now() + interval '5 minutes';
  END IF;

  -- Only start match timer when both players have checked in
  IF NEW.status = 'accepted' 
    AND NEW.challenger_checked_in 
    AND NEW.opponent_checked_in 
    AND NEW.match_started_at IS NULL 
  THEN
    NEW.match_started_at := now();
    NEW.match_deadline := now() + interval '30 minutes';
    NEW.both_players_ready := true;
  END IF;

  RETURN NEW;

END;
$$;

-- 4. Create trigger for auto_start_challenge
DROP TRIGGER IF EXISTS trigger_auto_start_challenge ON challenges;
CREATE TRIGGER trigger_auto_start_challenge
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION auto_start_challenge();
