-- Create challenges table for 1v1 direct challenges
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL CHECK (game IN ('codm', 'pubg', 'fortnite', 'valorant', 'apex', 'warzone', 'fifa', 'injustice', 'mortal_kombat')),
  stake_amount numeric(10, 2) NOT NULL CHECK (stake_amount > 0),
  prize_pool numeric(10, 2) NOT NULL,
  platform_fee numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  completed_at timestamptz,
  winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT different_players CHECK (challenger_id != opponent_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_challenges_opponent_status ON challenges(opponent_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON challenges(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Policies for challenges
CREATE POLICY "Users can view their own challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (
    auth.uid() = challenger_id OR 
    auth.uid() = opponent_id
  );

CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = challenger_id AND
    stake_amount >= 2 AND
    stake_amount <= 1000
  );

CREATE POLICY "Opponents can update challenge status"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = opponent_id AND
    status = 'pending'
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
  );

CREATE POLICY "Challengers can cancel pending challenges"
  ON challenges FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = challenger_id AND
    status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- Function to automatically expire challenges
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE challenges
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;

-- Function to calculate prize pool (stake * 2 - 10% fee)
CREATE OR REPLACE FUNCTION calculate_challenge_prize(stake numeric)
RETURNS TABLE (
  prize_pool numeric,
  platform_fee numeric
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (stake * 2 * 0.9)::numeric(10, 2) as prize_pool,
    (stake * 2 * 0.1)::numeric(10, 2) as platform_fee;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_challenges_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenges_updated_at();
