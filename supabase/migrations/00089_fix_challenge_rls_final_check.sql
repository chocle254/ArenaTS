-- Update RLS policy to allow participants to transition challenges to completed/cancelled
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;

CREATE POLICY "Participants can update live challenges" ON challenges
FOR UPDATE TO authenticated
USING (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND 
  status IN ('accepted', 'disputed', 'disputed_warning')
)
WITH CHECK (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND
  auth.uid() = submitted_by AND
  status IN ('accepted', 'disputed', 'disputed_warning', 'completed', 'cancelled')
);
