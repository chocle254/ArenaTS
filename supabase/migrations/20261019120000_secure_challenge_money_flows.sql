-- ============================================================================
-- Secure Arena Currency money flows for Quick Match challenges
-- ============================================================================
-- Applied to the ArenaTS project on 2026-10-20.
--
-- Why
--   * Challenge stakes are deducted by the browser (UPDATE profiles SET
--     arena_currency = ...). A player can do the same from devtools and give
--     themselves any balance.
--   * protect_profile_sensitive_columns() was meant to stop that, but it is
--     SECURITY DEFINER and starts with `IF current_user = 'postgres' THEN
--     RETURN NEW`. Inside a SECURITY DEFINER function current_user is the
--     function owner (postgres), so that check always passes and the guard
--     never blocks anything.
--   * It also reads NEW.tournaments_won, a column no repo migration creates.
--
-- What this does
--   1. Rewrites protect_profile_sensitive_columns() as SECURITY INVOKER so
--      current_user is the real caller, compares columns via jsonb so a
--      missing column can't break it, and keeps the original column list.
--      Allowed through: service role / postgres, SECURITY DEFINER functions
--      (they run as postgres), anything issued from inside another trigger
--      (pg_trigger_depth() > 1: the entry/creation fee and refund triggers),
--      the app.bypass_profile_protection opt-out, and admins.
--      Blocked: a player's own direct UPDATE of balance/stats/role columns.
--      kyc_status is intentionally NOT protected: the KYC dialog sets it to
--      'pending' from the client.
--   2. Attaches it as a BEFORE UPDATE trigger on profiles if it isn't already.
--   3. Adds create_challenge() and accept_challenge(): atomic, row-locked,
--      server-side versions of what the client did before. They write the same
--      rows (challenge + 'challenge_fee' transaction), so existing triggers
--      (notifications, auto-start, refunds, prize distribution) are unchanged.
--
-- The frontend calls these functions when they exist and falls back to the
-- old client-side flow when they don't, so deploying the app before this
-- migration is safe. Apply this migration and the app deploy together or
-- app-first: once (1) is live, the old client-side stake deduction is refused.
-- ============================================================================

-- 0. Quick matches for every game the app offers --------------------------
-- challenges_game_check predates eFootball and PUBG Mobile, so challenges in
-- those games were rejected. Widen it to the app's games (keeping legacy 'pubg').
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_game_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_game_check CHECK (
  game = ANY (ARRAY['codm', 'fortnite', 'fifa', 'warzone', 'apex', 'valorant', 'injustice', 'mortal_kombat', 'efootball', 'pubg_mobile', 'pubg'])
);

-- 1. Protection function -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_old jsonb;
  v_new jsonb;
  v_col text;
  v_protected text[] := ARRAY[
    'role', 'total_earnings', 'arena_currency', 'available_balance', 'pending_balance',
    'wins', 'losses', 'win_rate', 'current_streak', 'longest_streak', 'global_rank',
    'tournaments_won', 'tournaments_played', 'is_suspended', 'banned_until', 'rating'
  ];
BEGIN
  -- Trusted server-side code paths opt out explicitly
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Service role, postgres, and SECURITY DEFINER functions (run as owner)
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Updates issued by another trigger (fees, refunds, results) are trusted code
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.role::text INTO v_user_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_user_role = 'admin' THEN
    RETURN NEW;
  END IF;

  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);
  FOREACH v_col IN ARRAY v_protected LOOP
    IF (v_new -> v_col) IS DISTINCT FROM (v_old -> v_col) THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify sensitive account fields (%).', v_col
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 2. Attach it (idempotent) ---------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.profiles'::regclass
      AND t.tgfoid = 'public.protect_profile_sensitive_columns'::regproc
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER tr_protect_profile_sensitive_columns
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_profile_sensitive_columns();
  END IF;
END;
$$;

-- 3a. Create a challenge and escrow the challenger's stake --------------------
CREATE OR REPLACE FUNCTION public.create_challenge(
  p_opponent_id uuid,
  p_game text,
  p_stake numeric,
  p_opponent_team_id uuid DEFAULT NULL,
  p_challenger_team_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance numeric;
  v_opponent_tag text;
  v_total numeric;
  v_fee numeric;
  v_challenge_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_opponent_id IS NULL OR p_opponent_id = v_uid THEN
    RAISE EXCEPTION 'Choose another player to challenge';
  END IF;
  IF p_stake IS NULL OR p_stake < 2 OR p_stake > 1000 THEN
    RAISE EXCEPTION 'Stake must be between 2 and 1000 AC';
  END IF;

  SELECT gamertag INTO v_opponent_tag FROM profiles WHERE id = p_opponent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That player no longer exists';
  END IF;

  -- Lock the challenger's row so two quick taps can't double-spend
  SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < p_stake THEN
    RAISE EXCEPTION 'Insufficient Arena Currency';
  END IF;

  v_total := p_stake * 2;
  v_fee := v_total * 0.10;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) - p_stake WHERE id = v_uid;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO challenges (
    challenger_id, opponent_id, game, stake_amount, prize_pool, platform_fee,
    expires_at, status, challenger_team_id, opponent_team_id
  ) VALUES (
    v_uid, p_opponent_id, p_game, p_stake, v_total - v_fee, v_fee,
    now() + interval '5 minutes', 'pending', p_challenger_team_id, p_opponent_team_id
  )
  RETURNING id INTO v_challenge_id;

  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (v_uid, 'challenge_fee', -p_stake, 'Stake for challenge to: ' || COALESCE(v_opponent_tag, 'player'), 'completed', v_challenge_id);

  RETURN v_challenge_id;
END;
$$;

-- 3b. Accept a challenge and escrow the opponent's stake ----------------------
CREATE OR REPLACE FUNCTION public.accept_challenge(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT COALESCE(arena_currency, 0) INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < v_challenge.stake_amount THEN
    RAISE EXCEPTION 'Insufficient Arena Currency';
  END IF;

  SELECT gamertag INTO v_challenger_tag FROM profiles WHERE id = v_challenge.challenger_id;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE profiles SET arena_currency = COALESCE(arena_currency, 0) - v_challenge.stake_amount WHERE id = v_uid;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO transactions (user_id, type, amount, description, status, challenge_id)
  VALUES (v_uid, 'challenge_fee', -v_challenge.stake_amount, 'Stake for challenge from: ' || COALESCE(v_challenger_tag, 'player'), 'completed', p_challenge_id);

  UPDATE challenges SET status = 'accepted', accepted_at = now() WHERE id = p_challenge_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_challenge(uuid, text, numeric, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_challenge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_challenge(uuid, text, numeric, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_challenge(uuid) TO authenticated;
