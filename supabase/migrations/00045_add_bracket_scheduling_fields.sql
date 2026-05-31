-- Add bracket_generated flag to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS bracket_generated boolean DEFAULT false;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS bracket_generated_at timestamptz;

-- Add check-in tracking fields to match_results
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS check_in_started_at timestamptz;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS replacement_count integer DEFAULT 0;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS player1_ready_at timestamptz;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS player2_ready_at timestamptz;

-- Add spectator_assigned flag to track if participant was pulled from standby
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS spectator_assigned boolean DEFAULT false;
