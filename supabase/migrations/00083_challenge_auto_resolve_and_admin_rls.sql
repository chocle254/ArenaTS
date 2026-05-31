-- 1. Update expire_old_challenges to handle check-in failures and award prizes
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle pending challenges (expired)
  UPDATE challenges
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();

  -- Handle accepted challenges where check-in deadline has passed
  -- Scenario A: Challenger checked in, Opponent didn't -> Challenger wins
  UPDATE challenges
  SET status = 'completed',
      winner_id = challenger_id,
      completed_at = now(),
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = true
    AND opponent_checked_in = false;

  -- Scenario B: Opponent checked in, Challenger didn't -> Opponent wins
  UPDATE challenges
  SET status = 'completed',
      winner_id = opponent_id,
      completed_at = now(),
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = false
    AND opponent_checked_in = true;

  -- Scenario C: Neither checked in -> Cancel/Refund
  UPDATE challenges
  SET status = 'cancelled',
      updated_at = now()
  WHERE status = 'accepted'
    AND check_in_deadline < now()
    AND challenger_checked_in = false
    AND opponent_checked_in = false;
END;
$$;

-- 2. Add RLS policy for admins to manage all challenges
DROP POLICY IF EXISTS "Admins can manage all challenges" ON challenges;
CREATE POLICY "Admins can manage all challenges"
  ON challenges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Ensure maintenance task also runs periodically via RPC if needed
-- (Though typically we call this from the frontend on key pages)
