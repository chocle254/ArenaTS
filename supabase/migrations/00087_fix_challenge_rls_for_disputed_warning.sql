-- Update RLS policy to allow participants to update challenges in 'disputed_warning' status
DROP POLICY IF EXISTS "Participants can update live challenges" ON challenges;

CREATE POLICY "Participants can update live challenges" ON challenges
FOR UPDATE TO authenticated
USING (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND 
  status IN ('accepted', 'disputed', 'disputed_warning')
)
WITH CHECK (
  (auth.uid() = challenger_id OR auth.uid() = opponent_id) AND
  auth.uid() = submitted_by
);

-- Also ensure that we can update the status to completed or cancelled
-- The existing policy might be too restrictive on what columns can be updated.
-- But since we are using a trigger to handle the status change, the user only needs to be able to update their report field.
