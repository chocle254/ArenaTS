-- Drop the existing status check constraint
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;

-- Create the updated status check constraint including 'disputed_warning'
ALTER TABLE challenges ADD CONSTRAINT challenges_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text, 'disputed_warning'::text]));
