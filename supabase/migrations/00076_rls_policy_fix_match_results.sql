-- Drop all existing UPDATE and INSERT policies so we can
-- replace them cleanly with NULL-safe versions
DROP POLICY IF EXISTS "Players can update their own reports" ON match_results;
DROP POLICY IF EXISTS "Admins can update any match results" ON match_results;
DROP POLICY IF EXISTS "Referees can update match results for their assigned games" ON match_results;
DROP POLICY IF EXISTS "Players can insert their match results" ON match_results;
DROP POLICY IF EXISTS "Admins can insert match results" ON match_results;
DROP POLICY IF EXISTS "Referees can insert match results" ON match_results;


-- ============================================================
-- INSERT POLICIES
-- ============================================================

-- Players: allow insert when they are either player slot,
-- or when one slot is NULL (trigger-created partial row)
CREATE POLICY "Players can insert their match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = player1_id
  OR auth.uid() = player2_id
  OR (player1_id IS NULL)
  OR (player2_id IS NULL)
);

-- Admins: full insert access
CREATE POLICY "Admins can insert match results" ON match_results
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::text)
);

-- Referees: insert access for their assigned tournaments
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
-- UPDATE POLICIES
-- ============================================================

-- Players: NULL-safe check using IS NOT DISTINCT FROM.
-- Unlike =, IS NOT DISTINCT FROM handles NULL correctly:
-- (auth.uid() IS NOT DISTINCT FROM NULL) returns FALSE not NULL.
-- This means the policy works even when a player slot is NULL.
CREATE POLICY "Players can update their own reports" ON match_results
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT DISTINCT FROM player1_id
  OR auth.uid() IS NOT DISTINCT FROM player2_id
)
WITH CHECK (
  auth.uid() IS NOT DISTINCT FROM player1_id
  OR auth.uid() IS NOT DISTINCT FROM player2_id
);

-- Admins: full update access, no NULL issues
CREATE POLICY "Admins can update any match results" ON match_results
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::text)
);

-- Referees: update access for their assigned tournaments
CREATE POLICY "Referees can update match results for their assigned games" ON match_results
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = match_results.tournament_id
    AND is_referee(auth.uid(), t.game)
  )
);