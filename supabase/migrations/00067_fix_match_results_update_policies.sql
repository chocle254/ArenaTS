-- Drop problematic update policies
DROP POLICY IF EXISTS "Players can update their own reports" ON match_results;
DROP POLICY IF EXISTS "Admins can update any match results" ON match_results;
DROP POLICY IF EXISTS "Referees can update match results for their assigned games" ON match_results;

-- Re-create policies with more robust checks
CREATE POLICY "Players can update their own reports" ON match_results
FOR UPDATE TO authenticated
USING (
  (auth.uid() = player1_id OR auth.uid() = player2_id)
)
WITH CHECK (
  (auth.uid() = player1_id OR auth.uid() = player2_id)
);

CREATE POLICY "Admins can update any match results" ON match_results
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::text)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::text)
);

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
