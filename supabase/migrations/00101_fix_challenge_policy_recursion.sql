-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;

-- Re-create it without the recursive subquery
CREATE POLICY "Participants can update live challenges" ON challenges
FOR UPDATE
TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id)
WITH CHECK (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Ensure "Opponents can update challenge status" also doesn't cause issues
-- (It didn't seem recursive, but let's make sure it's clean)
-- The existing one was: 
-- qual: ((auth.uid() = opponent_id) AND (status = 'pending'::text))
-- with_check: (status = ANY (ARRAY['accepted'::text, 'declined'::text]))
-- This is fine.
