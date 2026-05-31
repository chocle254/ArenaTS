-- Make gamertag nullable since users might not have set it yet
ALTER TABLE tournament_participants ALTER COLUMN gamertag DROP NOT NULL;