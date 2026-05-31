-- Update trigger to also run on INSERT (for byes)
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
AFTER INSERT OR UPDATE OF status ON match_results
FOR EACH ROW
EXECUTE FUNCTION advance_winner_to_next_match();
