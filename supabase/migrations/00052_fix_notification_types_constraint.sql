
-- Drop the old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with all notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'tournament'::text, 
  'match'::text, 
  'payment'::text, 
  'system'::text,
  'challenge_received'::text,
  'tournament_live'::text,
  'mention'::text
]));
