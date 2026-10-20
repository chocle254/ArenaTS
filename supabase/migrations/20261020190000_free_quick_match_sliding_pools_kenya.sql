-- ============================================================================
-- Free quick matches, "stream this match", sliding prize pools, Kenya-only
-- ============================================================================
-- 1. Quick matches are free. Players earn XP (wins/losses on the profile) and
--    rank. Money stakes stay in the code behind
--    platform_settings.quick_match_stakes_enabled (off) until a legal opinion
--    says otherwise. Only the first 3 matches a day between the same two
--    players count toward the record, so friends can't farm levels.
-- 2. Players can mark a match as streamed on Twitch; the Streams page shows
--    only those (plus a live check when Twitch keys are configured).
-- 3. Sliding prize pools (the ACGL model): the creator funds a guaranteed
--    prize up front, and each paid entry after the first N slots adds its fee
--    to the pool. Entries up to N go to the creator as before.
-- 4. Arena is Kenya-only for now: every account defaults to Kenya and
--    Africa/Nairobi, including Google sign-ups that skip the form.
-- ============================================================================

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS quick_match_stakes_enabled boolean NOT NULL DEFAULT false;

-- Free matches have a 0 stake
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_stake_amount_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_stake_amount_check CHECK (stake_amount >= 0);

-- NULL = not settled yet, true = counted toward wins/losses, false = played but not counted
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS xp_counted boolean;

-- ---------------------------------------------------------------------------
-- 1. Free quick matches
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_challenge(p_opponent_id uuid, p_game text, p_stake numeric, p_opponent_team_id uuid DEFAULT NULL, p_challenger_team_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_balance numeric;
  v_opponent_tag text;
  v_total numeric;
  v_fee numeric;
  v_challenge_id uuid;
  v_stakes_on boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_opponent_id IS NULL OR p_opponent_id = v_uid THEN
    RAISE EXCEPTION 'Choose another player to challenge';
  END IF;
  SELECT gamertag INTO v_opponent_tag FROM profiles WHERE id = p_opponent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That player no longer exists';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND COALESCE(is_suspended, false)) THEN
    RAISE EXCEPTION 'Your account is under review. Try again later.';
  END IF;
  -- Stop challenge spam: 5 open challenges at a time
  IF (SELECT count(*) FROM challenges WHERE challenger_id = v_uid AND status = 'pending' AND expires_at > now()) >= 5 THEN
    RAISE EXCEPTION 'You have 5 challenges waiting for an answer. Wait for one to be accepted or expire.';
  END IF;

  p_stake := round(COALESCE(p_stake, 0));
  SELECT COALESCE(quick_match_stakes_enabled, false) INTO v_stakes_on FROM platform_settings LIMIT 1;

  IF p_stake = 0 OR NOT COALESCE(v_stakes_on, false) THEN
    IF p_stake > 0 THEN
      RAISE EXCEPTION 'Quick matches are free for now. Play for XP and rank.';
    END IF;
    INSERT INTO challenges (challenger_id, opponent_id, game, stake_amount, prize_pool, platform_fee, expires_at, status, challenger_team_id, opponent_team_id)
    VALUES (v_uid, p_opponent_id, p_game, 0, 0, 0, now() + interval '5 minutes', 'pending', p_challenger_team_id, p_opponent_team_id)
    RETURNING id INTO v_challenge_id;
    RETURN v_challenge_id;
  END IF;

  -- Money stakes (only when the platform switch is on)
  PERFORM _check_pair_limits(v_uid, p_opponent_id, p_stake);
  SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < p_stake THEN
    RAISE EXCEPTION 'Not enough in your play balance. Top up with M-Pesa first.';
  END IF;
  v_total := p_stake * 2;
  v_fee := round(v_total * 0.10, 2);
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) - p_stake WHERE id = v_uid;
  INSERT INTO challenges (challenger_id, opponent_id, game, stake_amount, prize_pool, platform_fee, expires_at, status, challenger_team_id, opponent_team_id)
  VALUES (v_uid, p_opponent_id, p_game, p_stake, v_total - v_fee, v_fee, now() + interval '5 minutes', 'pending', p_challenger_team_id, p_opponent_team_id)
  RETURNING id INTO v_challenge_id;
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
  VALUES (v_uid, 'challenge_fee', -p_stake, 'Stake for challenge to: ' || COALESCE(v_opponent_tag, 'player'), 'completed', v_challenge_id, 'KES');
  RETURN v_challenge_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_challenge(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_challenge record;
  v_balance numeric;
  v_challenger_tag text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF v_challenge.opponent_id <> v_uid THEN
    RAISE EXCEPTION 'This challenge was not sent to you' USING ERRCODE = '42501';
  END IF;
  IF v_challenge.status <> 'pending' THEN
    RAISE EXCEPTION 'This challenge is no longer open';
  END IF;
  IF v_challenge.expires_at IS NOT NULL AND v_challenge.expires_at <= now() THEN
    RAISE EXCEPTION 'Challenge expired';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND (COALESCE(is_flagged_fraud, false) OR COALESCE(is_suspended, false))) THEN
    RAISE EXCEPTION 'Your account is under review. Try again later.';
  END IF;

  IF COALESCE(v_challenge.stake_amount, 0) > 0 THEN
    SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
    IF v_balance < v_challenge.stake_amount THEN
      RAISE EXCEPTION 'Not enough in your play balance. Top up with M-Pesa first.';
    END IF;
    SELECT gamertag INTO v_challenger_tag FROM profiles WHERE id = v_challenge.challenger_id;
    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) - v_challenge.stake_amount WHERE id = v_uid;
    INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
    VALUES (v_uid, 'challenge_fee', -v_challenge.stake_amount, 'Stake for challenge from: ' || COALESCE(v_challenger_tag, 'player'), 'completed', p_challenge_id, 'KES');
  END IF;

  UPDATE challenges SET status = 'accepted', accepted_at = now() WHERE id = p_challenge_id;
END;
$function$;

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
  v_counted_today int;
BEGIN
  SELECT * INTO c FROM challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND OR c.status <> 'completed' OR c.winner_id IS NULL OR c.xp_counted IS NOT NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM transactions WHERE challenge_id = p_challenge_id AND type = 'challenge_win') THEN
    RETURN;
  END IF;
  v_loser := CASE WHEN c.winner_id = c.challenger_id THEN c.opponent_id ELSE c.challenger_id END;

  -- Free match: wins/losses (XP) only, first 3 a day per pair
  IF COALESCE(c.stake_amount, 0) = 0 THEN
    SELECT count(*) INTO v_counted_today FROM challenges
    WHERE xp_counted AND completed_at > now() - interval '24 hours'
      AND ((challenger_id = c.challenger_id AND opponent_id = c.opponent_id) OR (challenger_id = c.opponent_id AND opponent_id = c.challenger_id));
    IF v_counted_today < 3 THEN
      PERFORM set_config('app.bypass_profile_protection', 'true', true);
      UPDATE profiles SET wins = COALESCE(wins, 0) + 1 WHERE id = c.winner_id;
      UPDATE profiles SET losses = COALESCE(losses, 0) + 1 WHERE id = v_loser;
      UPDATE challenges SET xp_counted = true WHERE id = c.id;
    ELSE
      UPDATE challenges SET xp_counted = false WHERE id = c.id;
    END IF;
    RETURN;
  END IF;

  -- Money match (only possible when stakes are switched on)
  SELECT count(*), count(*) FILTER (WHERE winner_id = c.winner_id), COALESCE(sum(prize_pool), 0)
  INTO v_games, v_winner_wins, v_pot_total
  FROM challenges
  WHERE status = 'completed' AND stake_amount > 0
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
  UPDATE challenges SET xp_counted = true WHERE id = c.id;
  PERFORM _credit_held(c.winner_id, c.prize_pool, 'challenge', c.id, v_status, v_reason);
  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id, currency)
  VALUES (c.winner_id, 'challenge_win', c.prize_pool, 'Quick match win: ' || c.game || CASE WHEN v_status = 'frozen' THEN ' (under review)' ELSE ' (on hold 24h)' END, 'completed', c.id, 'KES');
  UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + c.platform_fee WHERE id = (SELECT id FROM platform_settings LIMIT 1);
END;
$function$;

-- Money limits between two players only count money matches
CREATE OR REPLACE FUNCTION public._check_pair_limits(p_a uuid, p_b uuid, p_stake numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day int;
  v_week numeric;
BEGIN
  IF p_stake IS NULL OR p_stake < 50 OR p_stake > 2000 THEN
    RAISE EXCEPTION 'Stake must be between KES 50 and KES 2,000';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id IN (p_a, p_b) AND (COALESCE(is_flagged_fraud, false) OR COALESCE(is_suspended, false))) THEN
    RAISE EXCEPTION 'This match can''t be played for money right now. Try another opponent.';
  END IF;
  SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours'), COALESCE(sum(stake_amount), 0)
  INTO v_day, v_week
  FROM challenges
  WHERE ((challenger_id = p_a AND opponent_id = p_b) OR (challenger_id = p_b AND opponent_id = p_a))
    AND stake_amount > 0
    AND status NOT IN ('declined', 'expired', 'cancelled')
    AND created_at > now() - interval '7 days';
  IF v_day >= 3 THEN
    RAISE EXCEPTION 'You''ve played this opponent for money 3 times today. Play someone new, or rematch tomorrow.';
  END IF;
  IF v_week + p_stake > 6000 THEN
    RAISE EXCEPTION 'You''ve hit this week''s money-match limit with this opponent. Play someone new for now.';
  END IF;
END;
$$;

-- Free matches with the creator are normal play, not a money link
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
  IF EXISTS (SELECT 1 FROM challenges WHERE created_at > now() - interval '90 days' AND stake_amount > 0
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
-- 2. Stream this match
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  match_result_id uuid REFERENCES public.match_results(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  twitch_login text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((challenge_id IS NULL) <> (match_result_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS match_streams_challenge_user ON public.match_streams (challenge_id, user_id) WHERE challenge_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS match_streams_match_user ON public.match_streams (match_result_id, user_id) WHERE match_result_id IS NOT NULL;

ALTER TABLE public.match_streams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can see who is streaming" ON public.match_streams;
CREATE POLICY "Anyone can see who is streaming" ON public.match_streams FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.match_streams FROM anon, authenticated;
GRANT SELECT ON public.match_streams TO anon, authenticated;

-- Turn streaming on/off for a match you're playing. Needs a Twitch handle.
CREATE OR REPLACE FUNCTION public.set_match_streaming(p_challenge uuid, p_match uuid, p_on boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_handle text;
  v_login text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF (p_challenge IS NULL) = (p_match IS NULL) THEN
    RAISE EXCEPTION 'Pick one match';
  END IF;
  IF p_challenge IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM challenges WHERE id = p_challenge AND v_uid IN (challenger_id, opponent_id) AND status IN ('accepted', 'disputed', 'disputed_warning')
  ) THEN
    RAISE EXCEPTION 'You can only stream a match you''re playing';
  END IF;
  IF p_match IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM match_results WHERE id = p_match AND v_uid IN (player1_id, player2_id) AND status <> 'confirmed'
  ) THEN
    RAISE EXCEPTION 'You can only stream a match you''re playing';
  END IF;

  IF NOT COALESCE(p_on, false) THEN
    DELETE FROM match_streams WHERE user_id = v_uid AND (challenge_id = p_challenge OR match_result_id = p_match);
    RETURN NULL;
  END IF;

  SELECT twitch_handle INTO v_handle FROM profiles WHERE id = v_uid;
  v_login := lower(regexp_replace(regexp_replace(COALESCE(v_handle, ''), '^.*twitch\.tv/', ''), '[/?#].*$|^@', '', 'g'));
  IF v_login !~ '^[a-z0-9_]{3,25}$' THEN
    RAISE EXCEPTION 'Add your Twitch username in Settings first';
  END IF;
  INSERT INTO match_streams (challenge_id, match_result_id, user_id, twitch_login)
  VALUES (p_challenge, p_match, v_uid, v_login)
  ON CONFLICT DO NOTHING;
  RETURN v_login;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Sliding prize pools
-- ---------------------------------------------------------------------------
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS prize_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS sliding_after integer;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_prize_mode_check') THEN
    ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_prize_mode_check CHECK (prize_mode IN ('fixed', 'sliding'));
  END IF;
END $$;

-- Gross prize pool right now: guarantee + entry fees from every paid slot after sliding_after
CREATE OR REPLACE FUNCTION public.tournament_pool_bonus(p_tournament_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN t.prize_mode = 'sliding' AND COALESCE(t.entry_fee, 0) > 0 THEN
    LEAST(
      GREATEST((SELECT count(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id AND tp.amount_paid > 0) - COALESCE(t.sliding_after, 0), 0)
        * t.entry_fee * GREATEST(COALESCE(t.team_size, 1), 1),
      (SELECT COALESCE(sum(amount_paid), 0) FROM tournament_participants tp WHERE tp.tournament_id = t.id)
    )
  ELSE 0 END
  FROM tournaments t WHERE t.id = p_tournament_id;
$$;

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
  v_max_pool numeric;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_team := GREATEST(COALESCE(NEW.team_size, 1), 1);
    v_slots := COALESCE(NEW.max_players, 0) / v_team;
    v_min_slots := COALESCE(NEW.min_participants, 0) / v_team;

    -- Sliding pools need a guarantee, an entry fee and a sensible threshold (everyone, admins too)
    IF NEW.prize_mode = 'sliding' THEN
      IF COALESCE(NEW.prize_pool, 0) <= 0 OR COALESCE(NEW.entry_fee, 0) <= 0 THEN
        RAISE EXCEPTION 'A growing prize pool needs a guaranteed prize and an entry fee';
      END IF;
      NEW.sliding_after := COALESCE(NEW.sliding_after, v_min_slots);
      IF NEW.sliding_after < 1 OR NEW.sliding_after >= v_slots THEN
        RAISE EXCEPTION 'The pool should start growing after 1 to % % have joined', v_slots - 1, CASE WHEN v_team > 1 THEN 'teams' ELSE 'players' END;
      END IF;
    ELSE
      NEW.prize_mode := 'fixed';
      NEW.sliding_after := NULL;
    END IF;
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

    IF (COALESCE(NEW.prize_pool, 0) > 0 OR COALESCE(NEW.entry_fee, 0) > 0)
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND organizer_verified) THEN
      IF v_min_slots < 5 OR v_slots < 5 THEN
        RAISE EXCEPTION 'Tournaments with prizes need at least 5 % to start', CASE WHEN v_team > 1 THEN 'teams' ELSE 'players' END;
      END IF;
      IF NEW.start_time < now() + interval '30 minutes' THEN
        RAISE EXCEPTION 'Give players at least 30 minutes to join before a prize tournament starts';
      END IF;
      -- Cap the most the pool could reach (guarantee + every possible growing entry)
      v_max_pool := COALESCE(NEW.prize_pool, 0)
        + CASE WHEN NEW.prize_mode = 'sliding' THEN GREATEST(v_slots - NEW.sliding_after, 0) * NEW.entry_fee * v_team ELSE 0 END;
      IF v_max_pool > 2000 * v_slots THEN
        RAISE EXCEPTION 'Prize pool can reach up to KES % for % slots (this one could reach KES %). Need bigger prizes? Ask us to verify you as an organizer.', 2000 * v_slots, v_slots, v_max_pool;
      END IF;
      SELECT kyc_status INTO v_kyc FROM profiles WHERE id = v_uid;
      IF COALESCE(NEW.prize_pool, 0) > 20000 AND COALESCE(v_kyc, '') <> 'verified' THEN
        RAISE EXCEPTION 'Verify your ID to fund prize pools above KES 20,000, or ask us to verify you as an organizer';
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

CREATE OR REPLACE FUNCTION public.distribute_arena_prizes(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t tournaments%ROWTYPE;
  v_fee numeric;
  v_gross numeric;
  v_net numeric;
  v_entries numeric;
  v_bonus numeric;
  v_creator_entries numeric;
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

  SELECT COALESCE(sum(amount_paid), 0) INTO v_entries FROM tournament_participants WHERE tournament_id = p_tournament_id;
  v_bonus := COALESCE(tournament_pool_bonus(p_tournament_id), 0);
  v_gross := COALESCE(t.prize_pool, 0) + v_bonus;
  v_fee := round(v_gross * COALESCE(t.platform_fee_percentage, 10) / 100.0, 2);
  v_net := v_gross - v_fee;

  v_rounds := COALESCE(t.num_rounds, (SELECT max(round) FROM match_results WHERE tournament_id = t.id));
  SELECT * INTO v_final FROM match_results WHERE tournament_id = t.id AND round = v_rounds AND status = 'confirmed' ORDER BY updated_at DESC LIMIT 1;
  v_first := COALESCE(v_final.winner_id, t.winner_id);
  v_second := CASE WHEN v_final.winner_id = v_final.player1_id THEN v_final.player2_id WHEN v_final.winner_id = v_final.player2_id THEN v_final.player1_id END;
  SELECT array_agg(CASE WHEN winner_id = player1_id THEN player2_id ELSE player1_id END)
  INTO v_thirds
  FROM match_results WHERE tournament_id = t.id AND round = v_rounds - 1 AND status = 'confirmed' AND winner_id IS NOT NULL
    AND (CASE WHEN winner_id = player1_id THEN player2_id ELSE player1_id END) IS NOT NULL;

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
    PERFORM _pay_tournament_place(t, v_first, v_net - v_paid, '1st');
  END IF;

  -- Entries that didn't grow the pool go to the creator, minus 10%, on hold
  v_creator_entries := v_entries - v_bonus;
  IF v_creator_entries > 0 AND t.created_by IS NOT NULL THEN
    v_fee := v_fee + round(v_creator_entries * 0.10, 2);
    PERFORM _credit_held(t.created_by, v_creator_entries - round(v_creator_entries * 0.10, 2), 'entry_fees', t.id);
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (t.created_by, 'payout', v_creator_entries - round(v_creator_entries * 0.10, 2), 'Entry fees for ' || t.name || ' (on hold 24h)', 'completed', t.id, 'KES');
  END IF;

  IF v_fee > 0 THEN
    UPDATE platform_settings SET maintenance_balance = COALESCE(maintenance_balance, 0) + v_fee WHERE id = (SELECT id FROM platform_settings LIMIT 1);
  END IF;
  UPDATE tournaments SET prizes_distributed = true WHERE id = p_tournament_id;
END;
$function$;

-- Creation fee: KES wording and currency
CREATE OR REPLACE FUNCTION public.handle_tournament_creation_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
BEGIN
  IF COALESCE(NEW.prize_pool, 0) > 0 THEN
    SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = NEW.created_by FOR UPDATE;
    IF v_balance < NEW.prize_pool THEN
      RAISE EXCEPTION 'Not enough in your play balance to fund this prize (KES % needed). Top up with M-Pesa first.', NEW.prize_pool;
    END IF;
    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE profiles SET arena_currency = arena_currency - NEW.prize_pool WHERE id = NEW.created_by;
    PERFORM set_config('app.bypass_profile_protection', 'false', true);
    INSERT INTO transactions (user_id, type, amount, description, status, tournament_id, currency)
    VALUES (NEW.created_by, 'tournament_fee', -NEW.prize_pool, 'Guaranteed prize for ' || NEW.name, 'completed', NEW.id, 'KES');
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Kenya-only accounts
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN location SET DEFAULT 'Kenya';
ALTER TABLE public.profiles ALTER COLUMN timezone SET DEFAULT 'Africa/Nairobi';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_gamertag text;
  v_username text;
  v_base_gamertag text;
  v_counter int := 1;
BEGIN
  v_base_gamertag := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'gamertag', ''),
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    split_part(NEW.email, '@', 1)
  );
  IF v_base_gamertag IS NULL OR v_base_gamertag = '' THEN
    v_base_gamertag := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  v_gamertag := v_base_gamertag;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE gamertag = v_gamertag) LOOP
    v_gamertag := v_base_gamertag || v_counter::text;
    v_counter := v_counter + 1;
    IF v_counter > 100 THEN
      v_gamertag := v_base_gamertag || substr(NEW.id::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;

  v_username := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1));
  IF v_username IS NULL OR v_username = '' THEN
    v_username := v_gamertag;
  END IF;

  INSERT INTO public.profiles (
    id, email, phone, role, username, full_name, gamertag,
    favorite_games, location, timezone, email_notifications_opt_in
  )
  VALUES (
    NEW.id, NEW.email, NEW.phone, 'user'::public.user_role, v_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), v_gamertag,
    CASE
      WHEN NEW.raw_user_meta_data->'favorite_games' IS NOT NULL AND jsonb_typeof(NEW.raw_user_meta_data->'favorite_games') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'favorite_games'))::public.game_type[]
      ELSE '{}'::public.game_type[]
    END,
    'Kenya',
    'Africa/Nairobi',
    COALESCE((NEW.raw_user_meta_data->>'email_notifications_opt_in')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Existing accounts (Google sign-ups landed with no country and UTC)
UPDATE public.profiles SET location = 'Kenya' WHERE location IS NULL OR location = '';
UPDATE public.profiles SET timezone = 'Africa/Nairobi' WHERE timezone IS NULL OR timezone IN ('', 'UTC');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN ('create_challenge', 'accept_challenge', 'distribute_challenge_prizes', '_creator_link',
                               'set_match_streaming', 'tournament_pool_bonus', 'distribute_arena_prizes')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname IN ('create_challenge', 'accept_challenge', 'set_match_streaming') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    IF r.proname = 'tournament_pool_bonus' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
