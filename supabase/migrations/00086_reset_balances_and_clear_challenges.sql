-- 1. Cancel all active challenges to prevent escrow issues
UPDATE challenges 
SET status = 'cancelled',
    updated_at = NOW()
WHERE status NOT IN ('completed', 'cancelled', 'declined', 'expired');

-- 2. Reset all existing users' balances to 5000
UPDATE profiles 
SET arena_currency = 5000, 
    available_balance = 5000, 
    pending_balance = 0,
    updated_at = NOW();

-- 3. Change default balance for new members to 5000
ALTER TABLE profiles 
ALTER COLUMN arena_currency SET DEFAULT 5000;

ALTER TABLE profiles 
ALTER COLUMN available_balance SET DEFAULT 5000;

-- 4. Clean up any stuck transactions (optional but recommended for a clean state)
UPDATE transactions 
SET status = 'cancelled'
WHERE status = 'pending';