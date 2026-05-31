-- ============================================================
-- FIX 1: Make player columns nullable
-- ============================================================

ALTER TABLE match_results
  ALTER COLUMN player1_id DROP NOT NULL,
  ALTER COLUMN player2_id DROP NOT NULL;


-- ============================================================
-- FIX 2: Add submitted_by column if it doesn't exist
-- ============================================================

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES profiles(id);


-- ============================================================
-- FIX 3: Add admin and referee INSERT policies
-- ============================================================

CREATE POLICY "Admins can insert match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::text)
);

CREATE POLICY "Referees can insert match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
);


-- ============================================================
-- FIX 4: Update the player INSERT policy to handle null slots
-- ============================================================

DROP POLICY IF EXISTS "Players can insert their match results" ON match_results;

CREATE POLICY "Players can insert their match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = player1_id
  OR auth.uid() = player2_id
  OR (player1_id IS NULL AND player2_id IS NOT NULL AND auth.uid() = player2_id)
  OR (player2_id IS NULL AND player1_id IS NOT NULL AND auth.uid() = player1_id)
);