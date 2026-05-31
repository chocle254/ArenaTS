-- Create match results table
CREATE TABLE IF NOT EXISTS match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id text NOT NULL,
  round integer NOT NULL,
  player1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player1_reported_winner uuid REFERENCES profiles(id),
  player2_reported_winner uuid REFERENCES profiles(id),
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed')),
  winner_id uuid REFERENCES profiles(id),
  admin_override boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, match_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_match_results_tournament ON match_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(status);
CREATE INDEX IF NOT EXISTS idx_match_results_players ON match_results(player1_id, player2_id);

-- Enable RLS
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Policies for match results
CREATE POLICY "Anyone can view match results" ON match_results
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Players can insert their match results" ON match_results
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = player1_id OR auth.uid() = player2_id
  );

CREATE POLICY "Players can update their own reports" ON match_results
  FOR UPDATE TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id)
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Admins can update any match results" ON match_results
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));