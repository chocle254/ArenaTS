
-- Add mode and team_size to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS team_size integer DEFAULT 1;

-- Create teams table
CREATE TABLE IF NOT EXISTS tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  captain_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, team_name)
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS tournament_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add team_id to match_results (keep player_id for backward compatibility)
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS team1_id uuid REFERENCES tournament_teams(id) ON DELETE SET NULL;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS team2_id uuid REFERENCES tournament_teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_teams
CREATE POLICY "Anyone can view teams" ON tournament_teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON tournament_teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = captain_id);
CREATE POLICY "Team captains can update their teams" ON tournament_teams FOR UPDATE TO authenticated USING (auth.uid() = captain_id);
CREATE POLICY "Team captains can delete their teams" ON tournament_teams FOR DELETE TO authenticated USING (auth.uid() = captain_id);

-- RLS Policies for tournament_team_members
CREATE POLICY "Anyone can view team members" ON tournament_team_members FOR SELECT USING (true);
CREATE POLICY "Team captains can add members" ON tournament_team_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournament_teams
    WHERE id = team_id AND captain_id = auth.uid()
  )
);
CREATE POLICY "Team captains and members can remove themselves" ON tournament_team_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM tournament_teams
    WHERE id = team_id AND captain_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_team_id ON tournament_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_user_id ON tournament_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_match_results_team1_id ON match_results(team1_id);
CREATE INDEX IF NOT EXISTS idx_match_results_team2_id ON match_results(team2_id);
