-- migration: fix_match_results_structure
-- Fix nullability and defaults for core columns
UPDATE match_results SET player1_checked_in = COALESCE(player1_checked_in, false) WHERE player1_checked_in IS NULL;
UPDATE match_results SET player2_checked_in = COALESCE(player2_checked_in, false) WHERE player2_checked_in IS NULL;
UPDATE match_results SET both_players_ready = COALESCE(both_players_ready, false) WHERE both_players_ready IS NULL;
UPDATE match_results SET replacement_count = COALESCE(replacement_count, 0) WHERE replacement_count IS NULL;

ALTER TABLE match_results 
  ALTER COLUMN player1_checked_in SET NOT NULL,
  ALTER COLUMN player1_checked_in SET DEFAULT false,
  ALTER COLUMN player2_checked_in SET NOT NULL,
  ALTER COLUMN player2_checked_in SET DEFAULT false,
  ALTER COLUMN both_players_ready SET NOT NULL,
  ALTER COLUMN both_players_ready SET DEFAULT false,
  ALTER COLUMN replacement_count SET NOT NULL,
  ALTER COLUMN replacement_count SET DEFAULT 0,
  ALTER COLUMN match_duration_minutes SET DEFAULT 30;

-- Fix foreign keys to ON DELETE SET NULL
ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_player1_id_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_player1_id_fkey 
  FOREIGN KEY (player1_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_player2_id_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_player2_id_fkey 
  FOREIGN KEY (player2_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_player1_reported_winner_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_player1_reported_winner_fkey 
  FOREIGN KEY (player1_reported_winner) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_player2_reported_winner_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_player2_reported_winner_fkey 
  FOREIGN KEY (player2_reported_winner) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_winner_id_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_winner_id_fkey 
  FOREIGN KEY (winner_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Re-apply indexes
CREATE INDEX IF NOT EXISTS idx_match_results_tournament ON match_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(status);
CREATE INDEX IF NOT EXISTS idx_match_results_players ON match_results(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_match_results_round ON match_results(tournament_id, round);
DROP INDEX IF EXISTS idx_match_results_pending_deadline;
CREATE INDEX idx_match_results_pending_deadline ON match_results(check_in_deadline) 
  WHERE status = 'pending' AND check_in_deadline IS NOT NULL;

-- Re-apply RLS policies
DROP POLICY IF EXISTS "Anyone can view match results" ON match_results;
CREATE POLICY "Anyone can view match results" ON match_results FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Players can insert their match results" ON match_results;
CREATE POLICY "Players can insert their match results" ON match_results FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Players can update their own reports" ON match_results;
CREATE POLICY "Players can update their own reports" ON match_results FOR UPDATE TO authenticated 
  USING (auth.uid() = player1_id OR auth.uid() = player2_id)
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Admins can update any match results" ON match_results;
CREATE POLICY "Admins can update any match results" ON match_results FOR UPDATE TO authenticated 
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Re-apply trigger
CREATE OR REPLACE FUNCTION _update_match_results_timestamp() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_results_updated_at ON match_results;
CREATE TRIGGER trg_match_results_updated_at
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION _update_match_results_timestamp();
