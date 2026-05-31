-- Update distribute_arena_prizes (the one called with tournament ID)
CREATE OR REPLACE FUNCTION distribute_arena_prizes(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament        record;
  v_platform_fee      numeric;
  v_net_prize         numeric;
  v_total_entry_fees  numeric;
  v_winner_id         uuid;
  v_participant       record;
  v_participant_count integer;
BEGIN

  -- Get tournament details
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

  -- Calculate fees
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize    := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  -- Calculate total entry fees
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id;

  -- Find winner from the final confirmed match
  v_winner_id := v_tournament.winner_id;

  -- Fallback: find from match_results if not set on tournament
  IF v_winner_id IS NULL THEN
    SELECT winner_id INTO v_winner_id
    FROM match_results
    WHERE tournament_id = p_tournament_id
      AND status = 'confirmed'
    ORDER BY round DESC, created_at DESC
    LIMIT 1;
  END IF;

  -- ── Pay winner ───────────────────────────────────────────
  IF v_winner_id IS NOT NULL AND v_net_prize > 0 THEN
    UPDATE profiles
    SET
      arena_currency    = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize,
      total_earnings    = COALESCE(total_earnings, 0) + v_net_prize,
      tournaments_won   = COALESCE(tournaments_won, 0) + 1
    WHERE id = v_winner_id;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_winner_id, 'tournament_win', v_net_prize,
      'Tournament prize for winning: ' || v_tournament.name,
      'completed', p_tournament_id
    );
  END IF;

  -- ── Pay creator entry fees (if tournament has entry fee) ───────────────
  IF v_total_entry_fees > 0 AND v_tournament.created_by IS NOT NULL THEN
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

  -- ── Platform fee ─────────────────────────────────────────
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);

  -- ── Update stats for ALL participants ────────────────────
  FOR v_participant IN
    SELECT tp.user_id
    FROM tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
  LOOP

    IF v_participant.user_id = v_winner_id THEN
      -- Winner stats update
      UPDATE profiles
      SET
        wins                = COALESCE(wins, 0) + 1,
        tournaments_played  = COALESCE(tournaments_played, 0) + 1,
        current_streak      = COALESCE(current_streak, 0) + 1,
        longest_streak      = GREATEST(
                                COALESCE(longest_streak, 0),
                                COALESCE(current_streak, 0) + 1
                              ),
        win_rate            = CASE
                                WHEN (COALESCE(tournaments_played, 0) + 1) > 0
                                THEN ROUND(
                                  ((COALESCE(wins, 0) + 1)::numeric /
                                  (COALESCE(tournaments_played, 0) + 1)::numeric) * 100,
                                  2
                                )
                                ELSE 0
                              END
      WHERE id = v_participant.user_id;
    ELSE
      -- Loser stats update
      UPDATE profiles
      SET
        losses             = COALESCE(losses, 0) + 1,
        tournaments_played = COALESCE(tournaments_played, 0) + 1,
        current_streak     = 0,
        win_rate           = CASE
                               WHEN (COALESCE(tournaments_played, 0) + 1) > 0
                               THEN ROUND(
                                 (COALESCE(wins, 0)::numeric /
                                 (COALESCE(tournaments_played, 0) + 1)::numeric) * 100,
                                 2
                               )
                               ELSE 0
                             END
      WHERE id = v_participant.user_id;
    END IF;
  END LOOP;

  -- ── Mark tournament as distributed ───────────────────────
  UPDATE tournaments
  SET prizes_distributed = true
  WHERE id = p_tournament_id;

END;
$$;

-- Update distribute_challenge_prizes
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge record;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only distribute if match is completed and winner is set
  IF v_challenge.status != 'completed' OR v_challenge.winner_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if already distributed to avoid double payment
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'challenge_win') THEN
    RETURN;
  END IF;

  -- Add prize pool to winner
  UPDATE profiles
  SET 
    arena_currency = COALESCE(arena_currency, 0) + v_challenge.prize_pool,
    available_balance = COALESCE(available_balance, 0) + v_challenge.prize_pool,
    total_earnings = COALESCE(total_earnings, 0) + v_challenge.prize_pool,
    wins = COALESCE(wins, 0) + 1
  WHERE id = v_challenge.winner_id;

  -- Increment losses for the opponent
  UPDATE profiles
  SET 
    losses = COALESCE(losses, 0) + 1
  WHERE id = CASE 
    WHEN v_challenge.winner_id = v_challenge.challenger_id THEN v_challenge.opponent_id 
    ELSE v_challenge.challenger_id 
  END;

  -- Record transaction for winner
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (
    v_challenge.winner_id, 
    'challenge_win', 
    v_challenge.prize_pool, 
    'Quick Match prize for winning: ' || v_challenge.game, 
    'completed', 
    p_challenge_id
  );

  -- Add platform fee to maintenance balance
  UPDATE platform_settings
  SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_challenge.platform_fee
  WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$$;

-- Update existing payout transactions to be more specific
UPDATE transactions SET type = 'tournament_win' WHERE type = 'payout' AND description LIKE 'Tournament%';
UPDATE transactions SET type = 'challenge_win' WHERE type = 'payout' AND description LIKE 'Quick Match%';
