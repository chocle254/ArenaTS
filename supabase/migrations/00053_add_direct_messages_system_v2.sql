
-- Direct Messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users NOT NULL,
  receiver_id uuid REFERENCES auth.users NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  image_url text
);

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Helper function for policy
CREATE OR REPLACE FUNCTION can_access_dm(msg_sender_id uuid, msg_receiver_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = msg_sender_id OR auth.uid() = msg_receiver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
CREATE POLICY "Users can view their own DMs" ON direct_messages
FOR SELECT TO authenticated
USING (can_access_dm(sender_id, receiver_id));

CREATE POLICY "Users can send DMs" ON direct_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark their received DMs as read" ON direct_messages
FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Update notifications constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'tournament'::text, 
  'match'::text, 
  'payment'::text, 
  'system'::text,
  'challenge_received'::text,
  'tournament_live'::text,
  'mention'::text,
  'direct_message'::text
]));

-- Enable realtime for direct_messages
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
