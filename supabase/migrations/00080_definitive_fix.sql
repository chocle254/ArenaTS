-- ============================================================
-- ROOT CAUSE CONFIRMED:
--   In tournament_completion.sql, distribute_arena_prizes()
--   at line 186-188 runs this with NO WHERE CLAUSE:
--
--     UPDATE platform_settings
--     SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
--
--   Every time a tournament completes, handle_tournament_status_change
--   calls distribute_arena_prizes, which hits this bare UPDATE and
--   throws error code 21000. This is the error that has been
--   appearing on every result submission and admin override.
--
--   Additionally check_for_tournament_completion still uses
--   max_players - 1 to count matches, which was broken from
--   the start for non-power-of-2 player counts.
-- ============================================================

-- ============================================================
-- FIX 1: Replace distribute_arena_prizes with WHERE clause
-- ============================================================
CREATE OR REPLACE FUNCTION public.distribute_arena_prizes(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament        record;
  v_platform_fee      numeric;
  v_net_prize         numeric;
  v_total_entry_fees  numeric;
  v_winner_id         uuid;
BEGIN
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Prevent double distribution
  IF v_tournament.prizes_distributed = true THEN
    RETURN;
  END IF;

  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize    := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  -- Find winner from the final confirmed match
  SELECT winner_id INTO v_winner_id
  FROM match_results
  WHERE tournament_id = p_tournament_id
    AND status = 'confirmed'
  ORDER BY round DESC, created_at DESC
  LIMIT 1;

  -- Pay winner
  IF v_winner_id IS NOT NULL AND v_net_prize > 0 THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize
    WHERE id = v_winner_id;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 'payout', v_net_prize,
      'Tournament prize for winning: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- Pay creator entry fees
  IF v_total_entry_fees > 0 THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_total_entry_fees,
      available_balance = COALESCE(available_balance, 0) + v_total_entry_fees
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 'payout', v_total_entry_fees,
      'Entry fees collected for tournament: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- THE FIX: Add WHERE clause — this was the bare UPDATE causing error 21000
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);

  -- Mark as distributed
  UPDATE tournaments
  SET prizes_distributed = true
  WHERE id = p_tournament_id;
END;
$$;

-- ============================================================
-- FIX 2: Replace check_for_tournament_completion
-- Old version used max_players - 1 which breaks for any
-- tournament where actual participants != max_players.
-- New version checks if the final match specifically is confirmed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_for_tournament_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_round   integer;
  v_final_match text;
BEGIN
  IF NEW.status = 'confirmed'
    AND (OLD.status IS NULL OR OLD.status != 'confirmed')
  THEN
    -- Final match is always the highest round, match index 0
    SELECT MAX(round) INTO v_max_round
    FROM match_results
    WHERE tournament_id = NEW.tournament_id;

    v_final_match := 'r' || v_max_round || '-m0';

    -- Only complete the tournament if THIS match is the final
    IF NEW.match_id = v_final_match AND NEW.winner_id IS NOT NULL THEN
      UPDATE tournaments
      SET
        status    = 'completed',
        winner_id = NEW.winner_id
      WHERE id = NEW.tournament_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_tournament_completion ON match_results;
CREATE TRIGGER trigger_check_tournament_completion
  AFTER UPDATE OF status
  ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION check_for_tournament_completion();

-- ============================================================
-- FIX 3: Drop and recreate trigger_advance_winner as
-- UPDATE ONLY — the live database still has it firing on
-- both INSERT and UPDATE despite previous migration attempts.
-- ============================================================
DROP TRIGGER IF EXISTS trigger_advance_winner ON match_results;
CREATE TRIGGER trigger_advance_winner
  AFTER UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION advance_winner_to_next_match();