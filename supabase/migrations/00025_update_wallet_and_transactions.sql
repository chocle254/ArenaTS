-- Add wallet fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS available_balance numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_balance numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- Add new columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_payout_id text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- Function to update transaction updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Function to update user balance
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id uuid,
  p_amount numeric,
  p_balance_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_balance_type = 'available' THEN
    UPDATE profiles
    SET available_balance = COALESCE(available_balance, 0) + p_amount
    WHERE id = p_user_id;
  ELSIF p_balance_type = 'pending' THEN
    UPDATE profiles
    SET pending_balance = COALESCE(pending_balance, 0) + p_amount
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Function to transfer from pending to available
CREATE OR REPLACE FUNCTION transfer_pending_to_available(
  p_user_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET 
    pending_balance = COALESCE(pending_balance, 0) - p_amount,
    available_balance = COALESCE(available_balance, 0) + p_amount
  WHERE id = p_user_id
    AND COALESCE(pending_balance, 0) >= p_amount;
END;
$$;