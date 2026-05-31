-- Add team support and match tracking to challenges
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS challenger_team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS opponent_team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS challenger_checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS opponent_checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS check_in_deadline timestamptz,
ADD COLUMN IF NOT EXISTS both_players_ready boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS challenger_reported_winner uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS opponent_reported_winner uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS screenshot_url text,
ADD COLUMN IF NOT EXISTS match_started_at timestamptz,
ADD COLUMN IF NOT EXISTS match_deadline timestamptz;

-- Update status check constraint
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;
ALTER TABLE challenges ADD CONSTRAINT challenges_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled', 'disputed'));

-- Enhance match_messages for challenges
ALTER TABLE match_messages 
ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE;

-- Allow tournament_id and match_id to be nullable if challenge_id is set
ALTER TABLE match_messages ALTER COLUMN tournament_id DROP NOT NULL;
ALTER TABLE match_messages ALTER COLUMN match_id DROP NOT NULL;

-- Update RLS for match_messages to allow challenge participants
DROP POLICY IF EXISTS "Users can view match messages" ON match_messages;
CREATE POLICY "Users can view match messages" ON match_messages
FOR SELECT TO authenticated
USING (
  tournament_id IS NOT NULL OR 
  EXISTS (
    SELECT 1 FROM challenges 
    WHERE id = challenge_id AND (challenger_id = auth.uid() OR opponent_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert match messages" ON match_messages;
CREATE POLICY "Users can insert match messages" ON match_messages
FOR INSERT TO authenticated
WITH CHECK (
  tournament_id IS NOT NULL OR 
  EXISTS (
    SELECT 1 FROM challenges 
    WHERE id = challenge_id AND (challenger_id = auth.uid() OR opponent_id = auth.uid())
  )
);

-- Realtime for challenges
ALTER PUBLICATION supabase_realtime ADD TABLE challenges;
