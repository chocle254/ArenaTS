
-- Drop the trigger and function for automatic prize pool calculation
DROP TRIGGER IF EXISTS trigger_update_prize_pool ON tournaments;
DROP FUNCTION IF EXISTS update_tournament_prize_pool();
DROP FUNCTION IF EXISTS calculate_prize_pool(uuid);

-- The prize pool is now always set manually by the creator
-- The 10% platform fee will be deducted when distributing prizes to winners
-- No automatic calculation needed
