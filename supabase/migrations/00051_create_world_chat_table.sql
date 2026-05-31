-- Create world_chat_messages table
CREATE TABLE IF NOT EXISTS world_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_world_chat_messages_created_at ON world_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_world_chat_messages_user_id ON world_chat_messages(user_id);

-- Enable RLS
ALTER TABLE world_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read world chat messages"
  ON world_chat_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send world chat messages"
  ON world_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON world_chat_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE world_chat_messages;
