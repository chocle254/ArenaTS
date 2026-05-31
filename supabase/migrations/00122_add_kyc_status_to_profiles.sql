-- Add kyc_status to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_verified';

-- Add check constraint for kyc_status
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS kyc_status_check;
ALTER TABLE profiles ADD CONSTRAINT kyc_status_check CHECK (kyc_status IN ('not_verified', 'pending', 'verified', 'rejected'));

-- Update existing profiles to 'not_verified' if they are null
UPDATE profiles SET kyc_status = 'not_verified' WHERE kyc_status IS NULL;