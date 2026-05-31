-- Add check-in timestamp to tournament_participants
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Create index for faster check-in queries
CREATE INDEX IF NOT EXISTS idx_tournament_participants_checked_in ON tournament_participants(checked_in, checked_in_at);