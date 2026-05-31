ALTER TABLE tournament_participants ADD COLUMN amount_paid numeric DEFAULT 0;

-- Update existing participants to have the current entry fee of their tournament
UPDATE tournament_participants tp
SET amount_paid = t.entry_fee
FROM tournaments t
WHERE tp.tournament_id = t.id;
