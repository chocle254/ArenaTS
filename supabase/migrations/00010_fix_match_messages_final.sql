-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can send system messages" ON match_messages;
DROP POLICY IF EXISTS "Match participants can send messages" ON match_messages;
DROP POLICY IF EXISTS "Match participants can view messages" ON match_messages;

-- Drop foreign key constraint if exists
ALTER TABLE match_messages DROP CONSTRAINT IF EXISTS match_messages_match_id_fkey;

-- Add tournament_id column
ALTER TABLE match_messages 
ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE;

-- Update match_id to text type
ALTER TABLE match_messages 
ALTER COLUMN match_id TYPE text;

-- Create index
CREATE INDEX IF NOT EXISTS idx_match_messages_match ON match_messages(tournament_id, match_id);

-- Create new simple policies
CREATE POLICY "Users can view all messages" ON match_messages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can send messages" ON match_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE match_messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;