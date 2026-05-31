-- 1. Update distribute_challenge_prizes to ensure total_earnings is updated
CREATE OR REPLACE FUNCTION distribute_challenge_prizes(p_challenge_id UUID)
RETURNS VOID AS $$
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
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'payout') THEN
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
    'payout', 
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update handle_challenge_result_v2 to ensure rating cap
CREATE OR REPLACE FUNCTION handle_challenge_result_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_report uuid;
  v_opponent_report uuid;
  v_dispute_count integer;
  v_system_msg text;
BEGIN
  -- Get current reports
  v_challenger_report := NEW.challenger_reported_winner;
  v_opponent_report := NEW.opponent_reported_winner;
  v_dispute_count := COALESCE(NEW.dispute_count, 0);

  -- Only handle matches that are in relevant statuses
  IF NEW.status NOT IN ('accepted', 'disputed', 'disputed_warning') THEN
    RETURN NEW;
  END IF;

  -- Check if both players have reported
  IF v_challenger_report IS NOT NULL AND v_opponent_report IS NOT NULL THEN
    
    -- Case 1: Both agree on winner
    IF v_challenger_report = v_opponent_report THEN
      NEW.status := 'completed';
      NEW.winner_id := v_challenger_report;
      NEW.completed_at := now();
      
      -- Increase winner's rating by 0.1, capped at 10.0
      UPDATE profiles
      SET rating = LEAST(rating + 0.1, 10.0)
      WHERE id = v_challenger_report;
      
    -- Case 2: Disagreement (dispute)
    ELSE
      -- If it's the first time they disagree, set warning status and notify
      IF NEW.status != 'disputed_warning' AND v_dispute_count = 0 THEN
        NEW.status := 'disputed_warning';
        NEW.dispute_count := 1;
        NEW.dispute_warning_shown := true;
        
        -- Insert system message into match_messages
        v_system_msg := '⚠️ Both of you are claiming to be winners. Discuss again on the real winner. If you don''t come to an agreement, you can cancel the match but it will reduce your rating scores by 0.5. You can change your report until the timer ends.';
        
        INSERT INTO match_messages (challenge_id, user_id, message, is_system_message)
        VALUES (NEW.id, NULL, v_system_msg, true);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update complete_tournament_flow to include total_earnings and rating boost
CREATE OR REPLACE FUNCTION complete_tournament_flow(p_tournament_id uuid, p_winner_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_tournament record;
  v_winner record;
  v_runner_up record;
  v_platform_fee numeric;
  v_net_prize numeric;
  v_total_entry_fees numeric;
  v_creator_cut numeric;
  v_participant_count integer;
  v_tournament_duration interval;
  v_result jsonb;
BEGIN
  -- Step 1: Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Prevent double execution
  IF v_tournament.status = 'completed' AND v_tournament.prizes_distributed = true THEN
    RAISE NOTICE 'Tournament already completed and prizes distributed';
    RETURN jsonb_build_object('success', false, 'message', 'Already completed');
  END IF;

  -- Step 2: Update tournament status
  UPDATE tournaments 
  SET 
    status = 'completed',
    winner_id = p_winner_id,
    ended_at = NOW()
  WHERE id = p_tournament_id;

  RAISE NOTICE 'Step 2: Tournament status updated to completed';

  -- Get updated tournament with ended_at
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  -- Calculate tournament duration
  IF v_tournament.started_at IS NOT NULL THEN
    v_tournament_duration := v_tournament.ended_at - v_tournament.started_at;
  ELSE
    v_tournament_duration := interval '0';
  END IF;

  -- Get winner details
  SELECT id, gamertag, avatar_url INTO v_winner 
  FROM profiles WHERE id = p_winner_id;

  -- Get runner-up (loser of final match)
  SELECT p.id, p.gamertag, p.avatar_url INTO v_runner_up
  FROM match_results mr
  JOIN profiles p ON (p.id = mr.player1_id OR p.id = mr.player2_id) AND p.id != p_winner_id
  WHERE mr.tournament_id = p_tournament_id 
    AND mr.status = 'confirmed'
  ORDER BY mr.round DESC
  LIMIT 1;

  -- Count participants
  SELECT COUNT(*) INTO v_participant_count 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  -- Step 3: Distribute prize pool to winner
  v_platform_fee := COALESCE(v_tournament.prize_pool, 0) * 0.10;
  v_net_prize := COALESCE(v_tournament.prize_pool, 0) - v_platform_fee;

  IF v_net_prize > 0 THEN
    UPDATE profiles
    SET 
      arena_currency = COALESCE(arena_currency, 0) + v_net_prize,
      available_balance = COALESCE(available_balance, 0) + v_net_prize,
      total_earnings = COALESCE(total_earnings, 0) + v_net_prize,
      rating = LEAST(rating + 0.5, 10.0) -- Significant rating boost for tournament win
    WHERE id = p_winner_id;
    
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      p_winner_id, 
      'payout', 
      v_net_prize, 
      'Tournament prize for winning: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    RAISE NOTICE 'Step 3: Prize pool distributed to winner: %', v_net_prize;
  END IF;

  -- Step 4: Send entry fees to tournament creator (10% of total entry fees)
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_entry_fees 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;

  v_creator_cut := v_total_entry_fees * 0.10;

  IF v_creator_cut > 0 THEN
    UPDATE profiles
    SET 
      arena_currency = COALESCE(arena_currency, 0) + v_creator_cut,
      available_balance = COALESCE(available_balance, 0) + v_creator_cut
    WHERE id = v_tournament.created_by;

    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id)
    VALUES (
      v_tournament.created_by, 
      'payout', 
      v_creator_cut, 
      'Creator fee (10%) for tournament: ' || v_tournament.name, 
      'completed', 
      p_tournament_id
    );

    RAISE NOTICE 'Step 4: Creator fee sent: %', v_creator_cut;
  END IF;

  -- Add platform fee to maintenance balance
  IF v_platform_fee > 0 THEN
    UPDATE platform_settings
    SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_platform_fee;
  END IF;

  -- Step 7: Send completion notifications
  -- Winner notification
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    p_winner_id,
    '🏆 You are the Arena Champion!',
    'A$' || v_net_prize || ' Arena Coins added to your wallet',
    'tournament',
    '/wallet'
  );

  -- All other participants notification
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT 
    user_id,
    'Tournament Ended',
    'Well played! Check the leaderboard for results.',
    'tournament',
    '/tournaments/' || p_tournament_id
  FROM tournament_participants
  WHERE tournament_id = p_tournament_id AND user_id != p_winner_id;

  RAISE NOTICE 'Step 7: Notifications sent to all participants';

  -- Step 8: Update leaderboard stats
  -- Increment tournaments_played for all participants
  UPDATE profiles
  SET tournaments_played = COALESCE(tournaments_played, 0) + 1
  WHERE id IN (
    SELECT user_id FROM tournament_participants WHERE tournament_id = p_tournament_id
  );

  -- Increment tournaments_won for winner
  UPDATE profiles
  SET tournaments_won = COALESCE(tournaments_won, 0) + 1
  WHERE id = p_winner_id;

  -- Update win_rate for all participants
  UPDATE profiles
  SET win_rate = CASE 
    WHEN COALESCE(tournaments_played, 0) > 0 
    THEN (COALESCE(tournaments_won, 0)::numeric / COALESCE(tournaments_played, 0)::numeric) * 100
    ELSE 0
  END
  WHERE id IN (
    SELECT user_id FROM tournament_participants WHERE tournament_id = p_tournament_id
  );

  RAISE NOTICE 'Step 8: Leaderboard stats updated';

  -- Mark prizes as distributed
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;

  -- Build result payload for Realtime broadcast
  v_result := jsonb_build_object(
    'success', true,
    'tournament_id', p_tournament_id,
    'winner_id', p_winner_id,
    'winner_username', v_winner.gamertag,
    'winner_avatar', v_winner.avatar_url,
    'prize_amount', v_net_prize,
    'runner_up_id', v_runner_up.id,
    'runner_up_username', v_runner_up.gamertag,
    'tournament_name', v_tournament.name,
    'total_participants', v_participant_count,
    'tournament_duration', EXTRACT(EPOCH FROM v_tournament_duration)::integer
  );

  RAISE NOTICE 'Tournament completion flow finished successfully';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
