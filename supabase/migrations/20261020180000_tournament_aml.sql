-- ============================================================================
-- Tournament anti-money-laundering + prize split + lifecycle fix
-- ============================================================================
-- The trick this blocks: create a tournament with a big prize, cap it at 2
-- players, have an accomplice join fast, lose on purpose. The creator's
-- deposit (not withdrawable) becomes the accomplice's winnings (withdrawable).
--
-- Rules for tournaments with a prize pool or entry fee (non-admins):
--   * at least 8 slots (teams count as one slot) and a minimum of 4 to start;
--     below the minimum it auto-cancels and the creator is refunded minus 10%
--   * registration open at least 1 hour before start
--   * prize pool at most KES 500 per slot; over KES 5,000 needs verified ID
-- At payout every prize is checked against the creator: friends, DMs, money
-- matches, same team, shared payment network -> prize frozen for review.
-- New accounts (< 7 days) winning KES 10,000+ are frozen too.
--
-- Also fixed
--   * check_and_update_tournament_status cancelled active tournaments once
--     un-eliminated players dropped below min_participants (i.e. after round 1)
--   * only 1st place was paid; prize_distribution (1st/2nd/3rd) is now honoured
-- ============================================================================

-- Is p_user connected to p_creator? Returns the reason, or NULL.
CREATE OR REPLACE FUNCTION public._creator_link(p_creator uuid, p_user uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_creator IS NULL OR p_user IS NULL THEN RETURN NULL; END IF;
  IF p_creator = p_user THEN RETURN 'creator'; END IF;
  IF EXISTS (SELECT 1 FROM friendships WHERE (user_id = p_creator AND friend_id = p_user) OR (user_id = p_user AND friend_id = p_creator)) THEN
    RETURN 'friends with the creator';
  END IF;
  IF EXISTS (SELECT 1 FROM direct_messages WHERE (sender_id = p_creator AND receiver_id = p_user) OR (sender_id = p_user AND receiver_id = p_creator)) THEN
    RETURN 'messaged the creator';
  END IF;
  IF EXISTS (SELECT 1 FROM challenges WHERE created_at > now() - interval '90 days'
             AND ((challenger_id = p_creator AND opponent_id = p_user) OR (challenger_id = p_user AND opponent_id = p_creator))) THEN
    RETURN 'played the creator for money';
  END IF;
  IF EXISTS (SELECT 1 FROM team_members a JOIN team_members b ON a.team_id = b.team_id WHERE a.user_id = p_creator AND b.user_id = p_user) THEN
    RETURN 'on a team with the creator';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (SELECT ip FROM mpesa_deposits WHERE user_id = p_creator AND ip IS NOT NULL
                   UNION SELECT ip FROM mpesa_withdrawals WHERE user_id = p_creator AND ip IS NOT NULL) c
    JOIN (SELECT ip FROM mpesa_deposits WHERE user_id = p_user AND ip IS NOT NULL
          UNION SELECT ip FROM mpesa_withdrawals WHERE user_id = p_user AND ip IS NOT NULL) u ON u.ip = c.ip
  ) THEN
    RETURN 'same payment network as the creator';
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Creation rules (extends the tournaments guard)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_tournaments_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_changed text[];
  v_team int;
  v_slots int;
  v_min_slots int;
  v_kyc text;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'You can only create tournaments as yourself' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM 'open' OR COALESCE(NEW.featured, false) OR NEW.winner_id IS NOT NULL
       OR COALESCE(NEW.current_players, 0) <> 0 OR COALESCE(NEW.prizes_distributed, false)
       OR COALESCE(NEW.bracket_generated, false) OR NEW.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'New tournaments start open with no players' USING ERRCODE = '42501';
    END IF;
    IF COALESCE(NEW.platform_fee_percentage, 10) < 10 THEN
      RAISE EXCEPTION 'Platform fee cannot be lowered' USING ERRCODE = '42501';
    END IF;

    IF COALESCE(NEW.prize_pool, 0) > 0 OR COALESCE(NEW.entry_fee, 0) > 0 THEN
      v_team := GREATEST(COALESCE(NEW.team_size, 1), 1);
      v_slots := COALESCE(NEW.max_players, 0) / v_team;
      v_min_slots := COALESCE(NEW.min_participants, 0) / v_team;
      IF v_slots < 8 THEN
        RAISE EXCEPTION 'Money tournaments need at least 8 % slots', CASE WHEN v_team > 1 THEN 'team' ELSE 'player' END;
      END IF;
      IF v_min_slots < 4 THEN
        RAISE EXCEPTION 'Money tournaments need a minimum of at least 4 % to start', CASE WHEN v_team > 1 THEN 'teams' ELSE 'players' END;
      END IF;
      IF NEW.start_time < now() + interval '1 hour' THEN
        RAISE EXCEPTION 'Money tournaments must start at least 1 hour from now so anyone can join';
      END IF;
      IF COALESCE(NEW.prize_pool, 0) > 500 * v_slots THEN
        RAISE EXCEPTION 'Prize pool can be at most KES % for % slots (KES 500 per slot)', 500 * v_slots, v_slots;
      END IF;
      SELECT kyc_status INTO v_kyc FROM profiles WHERE id = v_uid;
      IF COALESCE(NEW.prize_pool, 0) > 5000 AND COALESCE(v_kyc, '') <> 'verified' THEN
        RAISE EXCEPTION 'Verify your ID to fund prize pools above KES 5,000';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(array_agg(n.key), '{}') INTO v_changed
  FROM jsonb_each(to_jsonb(NEW)) n
  WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
    AND n.key <> 'updated_at';
  IF cardinality(v_changed) = 0 THEN
    RETURN NEW;
  END IF;
  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'This tournament can no longer be edited' USING ERRCODE = '42501';
  END IF;
  IF NOT (v_changed <@ ARRAY['name', 'description', 'rules', 'banned_items', 'tie_break_rules']) THEN
    RAISE EXCEPTION 'Not allowed to change % on this tournament', array_to_string(ARRAY(SELECT unnest(v_changed) EXCEPT SELECT unnest(ARRAY['name', 'description', 'rules', 'banned_items', 'tie_break_rules'])), ', ')
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Payouts: 1st / 2nd / 3rd split, each checked against the creator
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._pay_tournament_place(t public.tournaments, p_user uuid, p_amount numeric, p_place text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link text;
  v_status text := 'held';
  v_reason text;
  v_age interval;
BEGIN
  IF p_user IS NULL OR p_amount <= 0 THEN RETURN; END IF;
  v_link := _creator_link(t.created_by, p_user);
  IF v_link IS NOT NULL THEN
    v_status := 'frozen';
    v_reason := initcap(p_place) || ' place ' || v_link;
    PERFORM _flag(p_user, 'creator_linked_winner', jsonb_build_object('tournament', t.id, 'creator', t.created_by, 'link', v_link, 'amount', p_amount, 'place', p_place));
  END IF;
  SELECT now() - created_at INTO v_age FROM profiles WHERE id = p_user;
  IF v_age < interval '7 days' AND p_amount >= 10000 THEN
    v_status := 'frozen';
    v_reason := COALESCE(v_reason || '; ', '') || 'New account won a large prize';
    PERFORM _flag(p_user, 'new_account_big_prize', jsonb_build_object('tournament', t.id, 'amount', p_amount));
  END IF;
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET total_earnings = COALESCE(total_earnings, 0) + p_amount WHERE id = p_user;
  UPDATE tournament_participants SET prize_won = COALESCE(prize_won, 0) + p_amount,
    final_position = CASE p_place WHEN '1st' THEN 1 WHEN '2nd' THEN 2 ELSE 3 END
  WHERE tournament_id = t.id AND user_id = p_user;
  PERFORM _credit_held(p_user, p_amount, 'tournament_prize', t.id, v_status, v_reason);
  INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
  VALUES (p_user, 'tournament_win', p_amount, p_place || ' place: ' || t.name || CASE WHEN v_status = 'frozen' THEN ' (under review)' ELSE ' (on hold 24h)' END, 'completed', t.id, 'KES');
END;
$$;

CREATE OR REPLACE FUNCTION public.distribute_arena_prizes(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t tournaments%ROWTYPE;
  v_fee numeric;
  v_net numeric;
  v_entries numeric;
  v_final match_results%ROWTYPE;
  v_first uuid;
  v_second uuid;
  v_thirds uuid[];
  v_s1 numeric;
  v_s2 numeric;
  v_s3 numeric;
  v_paid numeric := 0;
  v_rounds int;
  u uuid;
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(t.prizes_distributed, false) THEN
    RETURN;
  END IF;

  v_fee := round(COALESCE(t.prize_pool, 0) * COALESCE(t.platform_fee_percentage, 10) / 100.0, 2);
  v_net := COALESCE(t.prize_pool, 0) - v_fee;

  v_rounds := COALESCE(t.num_rounds, (SELECT max(round) FROM match_results WHERE tournament_id = t.id));
  SELECT * INTO v_final FROM match_results WHERE tournament_id = t.id AND round = v_rounds AND status = 'confirmed' ORDER BY updated_at DESC LIMIT 1;
  v_first := COALESCE(v_final.winner_id, t.winner_id);
  v_second := CASE WHEN v_final.winner_id = v_final.player1_id THEN v_final.player2_id WHEN v_final.winner_id = v_final.player2_id THEN v_final.player1_id END;
  SELECT array_agg(CASE WHEN winner_id = player1_id THEN player2_id ELSE player1_id END)
  INTO v_thirds
  FROM match_results WHERE tournament_id = t.id AND round = v_rounds - 1 AND status = 'confirmed' AND winner_id IS NOT NULL
    AND (CASE WHEN winner_id = player1_id THEN player2_id ELSE player1_id END) IS NOT NULL;

  -- Shares from prize_distribution ({"1st":0.5,"2nd":0.3,"3rd":0.2}); default winner takes all
  v_s1 := COALESCE((t.prize_distribution ->> '1st')::numeric, 1);
  v_s2 := COALESCE((t.prize_distribution ->> '2nd')::numeric, 0);
  v_s3 := COALESCE((t.prize_distribution ->> '3rd')::numeric, 0);
  IF v_second IS NULL THEN v_s1 := v_s1 + v_s2; v_s2 := 0; END IF;
  IF COALESCE(cardinality(v_thirds), 0) = 0 THEN v_s1 := v_s1 + v_s3; v_s3 := 0; END IF;

  IF v_net > 0 AND v_first IS NOT NULL THEN
    PERFORM _pay_tournament_place(t, v_second, round(v_net * v_s2, 2), '2nd');
    v_paid := v_paid + round(v_net * v_s2, 2);
    IF v_s3 > 0 THEN
      FOREACH u IN ARRAY v_thirds LOOP
        PERFORM _pay_tournament_place(t, u, round(v_net * v_s3 / cardinality(v_thirds), 2), '3rd');
        v_paid := v_paid + round(v_net * v_s3 / cardinality(v_thirds), 2);
      END LOOP;
    END IF;
    -- Winner gets the rest (absorbs rounding)
    PERFORM _pay_tournament_place(t, v_first, v_net - v_paid, '1st');
  END IF;

  -- Entry fees go to the creator, minus 10%, on hold
  SELECT COALESCE(sum(amount_paid), 0) INTO v_entries FROM tournament_participants WHERE tournament_id = p_tournament_id;
  IF v_entries > 0 AND t.created_by IS NOT NULL THEN
    v_fee := v_fee + round(v_entries * 0.10, 2);
    PERFORM _credit_held(t.created_by, v_entries - round(v_entries * 0.10, 2), 'entry_fees', t.id);
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (t.created_by, 'payout', v_entries - round(v_entries * 0.10, 2), 'Entry fees for ' || t.name || ' (on hold 24h)', 'completed', t.id, 'KES');
  END IF;

  IF v_fee > 0 THEN
    UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_fee WHERE id = (SELECT id FROM platform_settings LIMIT 1);
  END IF;
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Lifecycle sweep: don't cancel active tournaments as players get knocked out
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_update_tournament_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM generate_tournament_brackets();

  UPDATE tournaments SET status = 'active'
  WHERE status = 'open' AND bracket_generated = true AND start_time <= now() AND current_players >= min_participants;

  PERFORM process_expired_check_ins();
  PERFORM expire_stale_team_invites();

  -- Not enough sign-ups by start time: cancel (refunds below)
  UPDATE tournaments SET status = 'cancelled', updated_at = now()
  WHERE status = 'open' AND start_time <= now() AND current_players < min_participants;

  -- Active but people left before playing (count everyone registered, not just survivors)
  UPDATE tournaments t SET status = 'cancelled', updated_at = now()
  WHERE t.status = 'active'
    AND (SELECT count(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id AND tp.is_standby = false) < 2;

  UPDATE tournaments t SET status = 'completed', updated_at = now()
  WHERE t.status = 'active'
    AND EXISTS (SELECT 1 FROM match_results mr WHERE mr.tournament_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM match_results mr WHERE mr.tournament_id = t.id AND mr.status <> 'confirmed');

  PERFORM refund_tournament_entry_fees(id)
  FROM tournaments
  WHERE status = 'cancelled' AND NOT EXISTS (SELECT 1 FROM transactions WHERE tournament_id = tournaments.id AND type = 'refund');
END;
$function$;

-- ---------------------------------------------------------------------------
-- Quick matches: large pots between linked players get a review
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._linked_players(p_a uuid, p_b uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM friendships WHERE (user_id = p_a AND friend_id = p_b) OR (user_id = p_b AND friend_id = p_a)) THEN 'friends'
    WHEN EXISTS (
      SELECT 1 FROM (SELECT ip FROM mpesa_deposits WHERE user_id = p_a AND ip IS NOT NULL UNION SELECT ip FROM mpesa_withdrawals WHERE user_id = p_a AND ip IS NOT NULL) x
      JOIN (SELECT ip FROM mpesa_deposits WHERE user_id = p_b AND ip IS NOT NULL UNION SELECT ip FROM mpesa_withdrawals WHERE user_id = p_b AND ip IS NOT NULL) y ON x.ip = y.ip
    ) THEN 'same payment network'
  END;
$$;

CREATE OR REPLACE FUNCTION public.distribute_challenge_prizes(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  v_loser uuid;
  v_games int;
  v_winner_wins int;
  v_pot_total numeric;
  v_status text := 'held';
  v_reason text;
  v_recent_deposit numeric;
  v_link text;
BEGIN
  SELECT * INTO c FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND OR c.status <> 'completed' OR c.winner_id IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'challenge_win') THEN
    RETURN;
  END IF;
  v_loser := CASE WHEN c.winner_id = c.challenger_id THEN c.opponent_id ELSE c.challenger_id END;

  SELECT count(*), count(*) FILTER (WHERE winner_id = c.winner_id), COALESCE(sum(prize_pool), 0)
  INTO v_games, v_winner_wins, v_pot_total
  FROM challenges
  WHERE status = 'completed'
    AND ((challenger_id = c.challenger_id AND opponent_id = c.opponent_id) OR (challenger_id = c.opponent_id AND opponent_id = c.challenger_id))
    AND completed_at > now() - interval '30 days';
  IF v_games >= 3 AND v_winner_wins = v_games AND v_pot_total >= 1500 THEN
    v_status := 'frozen';
    v_reason := 'Same opponent lost every money match in 30 days';
    PERFORM _flag(c.winner_id, 'one_sided_pair', jsonb_build_object('opponent', v_loser, 'matches', v_games, 'pot_total', v_pot_total));
  END IF;

  SELECT COALESCE(sum(credit), 0) INTO v_recent_deposit FROM mpesa_deposits
  WHERE user_id = v_loser AND status = 'completed' AND completed_at > now() - interval '2 hours';
  IF v_recent_deposit > 0 AND c.stake_amount >= 0.8 * v_recent_deposit AND c.stake_amount >= 1000 THEN
    v_status := 'frozen';
    v_reason := COALESCE(v_reason || '; ', '') || 'Loser deposited and lost it straight away';
    PERFORM _flag(c.winner_id, 'deposit_and_lose', jsonb_build_object('loser', v_loser, 'deposit', v_recent_deposit, 'stake', c.stake_amount));
  END IF;

  v_link := _linked_players(c.winner_id, v_loser);
  IF v_link IS NOT NULL AND c.prize_pool >= 3000 THEN
    v_status := 'frozen';
    v_reason := COALESCE(v_reason || '; ', '') || 'Large pot between linked players (' || v_link || ')';
    PERFORM _flag(c.winner_id, 'linked_players_big_pot', jsonb_build_object('loser', v_loser, 'link', v_link, 'pot', c.prize_pool));
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET total_earnings = COALESCE(total_earnings, 0) + c.prize_pool, wins = COALESCE(wins, 0) + 1 WHERE id = c.winner_id;
  UPDATE profiles SET losses = COALESCE(losses, 0) + 1 WHERE id = v_loser;
  PERFORM _credit_held(c.winner_id, c.prize_pool, 'challenge', c.id, v_status, v_reason);
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
  VALUES (c.winner_id, 'challenge_win', c.prize_pool, 'Quick match win: ' || c.game || CASE WHEN v_status = 'frozen' THEN ' (under review)' ELSE ' (on hold 24h)' END, 'completed', c.id, 'KES');
  UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + c.platform_fee WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$function$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN ('_creator_link', '_pay_tournament_place', 'distribute_arena_prizes', 'check_and_update_tournament_status', '_linked_players', 'distribute_challenge_prizes')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
  -- The app triggers the lifecycle sweep on page load
  GRANT EXECUTE ON FUNCTION public.check_and_update_tournament_status() TO authenticated;
END $$;
