ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'payout';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'deposit';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'tournament_win';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'tournament_fee';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'challenge_fee';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'challenge_win';