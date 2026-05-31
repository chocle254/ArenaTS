-- Make gamertag NOT NULL with a default value for existing users
-- First, update any NULL gamertags to use a generated value
UPDATE profiles 
SET gamertag = 'Player' || SUBSTRING(id::text, 1, 8)
WHERE gamertag IS NULL;

-- Now make the column NOT NULL
ALTER TABLE profiles 
ALTER COLUMN gamertag SET NOT NULL;

-- Add a check constraint to ensure gamertag is not empty
ALTER TABLE profiles 
ADD CONSTRAINT gamertag_not_empty CHECK (length(trim(gamertag)) > 0);
