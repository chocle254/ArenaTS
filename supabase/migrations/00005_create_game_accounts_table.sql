-- Create game_accounts table to store in-game names for each game
CREATE TABLE IF NOT EXISTS game_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game game_type NOT NULL,
  in_game_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_accounts_user_id ON game_accounts(user_id);

-- RLS Policies
ALTER TABLE game_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own game accounts
CREATE POLICY "Users can view own game accounts" ON game_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own game accounts
CREATE POLICY "Users can insert own game accounts" ON game_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own game accounts
CREATE POLICY "Users can update own game accounts" ON game_accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own game accounts
CREATE POLICY "Users can delete own game accounts" ON game_accounts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins have full access to game accounts" ON game_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));