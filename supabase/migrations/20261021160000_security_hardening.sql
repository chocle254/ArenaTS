-- ============================================================================
-- Security hardening (audit 2026-10-21)
-- ============================================================================
-- 1. Private profile data. Any signed-in player could read every other
--    player's email, M-Pesa number, full name, balances, date of birth, KYC
--    file paths and fraud flags. Players now get only public columns of other
--    profiles; their own full row comes from get_my_profile(), and admins use
--    admin_get_profiles() / admin_balance_totals().
-- 2. KYC file paths must point into the player's own folder (no pointing the
--    reviewer at someone else's ID).
-- 3. Notifications. Anyone could insert any notification for anyone (fake
--    "Arena" messages with links). Direct inserts and create_notification are
--    closed to players; they notify each other through notify_player, which
--    labels the message with their gamertag and rate-limits it.
-- 4. Reminders: you can only read and mark your own.
-- 5. Joining tournaments: the server now checks registration is open, decides
--    standby when full (with the tournament row locked, so simultaneous joins
--    can't overfill it), and sets prize/position/check-in/gamertag itself.
-- 6. Team invites: accepting failed on a notification type the table rejects;
--    teammates also weren't linked to their team.
-- 7. AI referee: a confident AI verdict only becomes a proposed decision when
--    both players uploaded evidence; otherwise a human referee decides.
-- 8. Match chat: removed a policy that let anyone read every match chat.
-- 9. Indexes for hot lookups; duplicate indexes dropped.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Private profile data
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, username, gamertag, avatar_url, bio, role, tier, wins, losses, win_rate, rating,
  total_earnings, tournaments_played, current_streak, longest_streak, global_rank,
  favorite_games, twitch_handle, efootball_id, pubg_id, location, timezone, currency,
  disputes_filed, disputes_won, organizer_verified, organizer_name, kyc_status,
  created_at, updated_at, last_seen_at
) ON public.profiles TO authenticated;

-- Your own full profile (balances, email, M-Pesa number, ticket, invite code...)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM profiles WHERE id = auth.uid();
$$;

-- Admin views of full profiles
CREATE OR REPLACE FUNCTION public.admin_get_profiles(p_ids uuid[] DEFAULT NULL, p_kyc_only boolean DEFAULT false)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM profiles p
    WHERE (p_ids IS NULL OR p.id = ANY (p_ids))
      AND (NOT p_kyc_only OR p.kyc_status IN ('pending', 'verified', 'rejected'))
    ORDER BY p.updated_at DESC NULLS LAST
    LIMIT 1000;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_balance_totals()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v json;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT json_build_object(
    'available_balance', COALESCE(sum(available_balance), 0),
    'pending_balance', COALESCE(sum(pending_balance), 0),
    'arena_currency', COALESCE(sum(arena_currency), 0),
    'entry_credit', COALESCE(sum(entry_credit), 0)
  ) INTO v FROM profiles;
  RETURN v;
END;
$$;

-- Used as a column default; runs as owner so it can check existing codes
ALTER FUNCTION public._new_referral_code() SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 2. KYC paths must be in the player's own folder
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_kyc_paths()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text := auth.uid()::text || '/';
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF (NEW.kyc_id_front_path IS DISTINCT FROM OLD.kyc_id_front_path AND NEW.kyc_id_front_path IS NOT NULL AND left(NEW.kyc_id_front_path, length(v_prefix)) <> v_prefix)
     OR (NEW.kyc_id_back_path IS DISTINCT FROM OLD.kyc_id_back_path AND NEW.kyc_id_back_path IS NOT NULL AND left(NEW.kyc_id_back_path, length(v_prefix)) <> v_prefix)
     OR (NEW.kyc_selfie_path IS DISTINCT FROM OLD.kyc_selfie_path AND NEW.kyc_selfie_path IS NOT NULL AND left(NEW.kyc_selfie_path, length(v_prefix)) <> v_prefix)
     OR position('..' in COALESCE(NEW.kyc_id_front_path, '') || COALESCE(NEW.kyc_id_back_path, '') || COALESCE(NEW.kyc_selfie_path, '')) > 0 THEN
    RAISE EXCEPTION 'ID documents must be uploaded from your own account' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tr_guard_kyc_paths ON public.profiles;
CREATE TRIGGER tr_guard_kyc_paths BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_kyc_paths();

-- ---------------------------------------------------------------------------
-- 3. Notifications
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS notifications_sender_recent_idx ON public.notifications (sender_id, created_at DESC) WHERE sender_id IS NOT NULL;

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
REVOKE INSERT, DELETE, TRUNCATE ON public.notifications FROM anon, authenticated;
REVOKE UPDATE ON public.notifications FROM anon;

-- Internal: used by server functions (disputes, AI referee...). Not callable by players.
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_link IS NOT NULL AND (left(p_link, 1) <> '/' OR left(p_link, 2) = '//' OR position('\' in p_link) > 0) THEN
    p_link := NULL;
  END IF;
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, left(COALESCE(p_type, 'system'), 40), left(COALESCE(p_title, ''), 120), left(COALESCE(p_message, ''), 500), p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) TO service_role;

-- For the app. Notifying yourself (reminders) is unrestricted. Notifying
-- someone else (mentions, team invites) is labelled with your gamertag,
-- can't use payment/system types, links stay inside the app, max 20 a minute.
CREATE OR REPLACE FUNCTION public.notify_player(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tag text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'That player doesn''t exist';
  END IF;
  IF p_link IS NOT NULL AND (left(p_link, 1) <> '/' OR left(p_link, 2) = '//' OR position('\' in p_link) > 0) THEN
    p_link := NULL;
  END IF;
  p_type := CASE WHEN p_type IN ('tournament', 'match', 'mention') THEN p_type ELSE 'mention' END;

  IF p_user_id <> v_uid AND NOT (has_role(v_uid, 'admin') OR has_role(v_uid, 'referee')) THEN
    IF (SELECT count(*) FROM notifications WHERE sender_id = v_uid AND created_at > now() - interval '1 minute') >= 20 THEN
      RAISE EXCEPTION 'Slow down a little and try again in a minute';
    END IF;
    SELECT gamertag INTO v_tag FROM profiles WHERE id = v_uid;
    p_title := COALESCE(v_tag, 'A player') || ': ' || COALESCE(p_title, '');
  END IF;

  INSERT INTO notifications (user_id, type, title, message, link, sender_id)
  VALUES (p_user_id, p_type, left(COALESCE(p_title, ''), 120), left(COALESCE(p_message, ''), 500), p_link, v_uid)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.notify_player(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_player(uuid, text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Reminders: only your own
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_due_reminders(p_user_id uuid)
RETURNS TABLE(reminder_id uuid, tournament_id uuid, tournament_name text, start_time timestamp with time zone, reminder_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- auth.uid() is NULL for the server (service role); players only see their own
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only see your own reminders' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT tr.id, t.id, t.name, t.start_time,
    CASE
      WHEN tr.reminder_24h AND NOT tr.sent_24h AND t.start_time <= now() + interval '24 hours' AND t.start_time > now() THEN '24h'
      WHEN tr.reminder_1h AND NOT tr.sent_1h AND t.start_time <= now() + interval '1 hour' AND t.start_time > now() THEN '1h'
      WHEN tr.reminder_15m AND NOT tr.sent_15m AND t.start_time <= now() + interval '15 minutes' AND t.start_time > now() THEN '15m'
    END
  FROM tournament_reminders tr
  JOIN tournaments t ON tr.tournament_id = t.id
  WHERE tr.user_id = p_user_id
    AND t.status IN ('open', 'active')
    AND (
      (tr.reminder_24h AND NOT tr.sent_24h AND t.start_time <= now() + interval '24 hours' AND t.start_time > now())
      OR (tr.reminder_1h AND NOT tr.sent_1h AND t.start_time <= now() + interval '1 hour' AND t.start_time > now())
      OR (tr.reminder_15m AND NOT tr.sent_15m AND t.start_time <= now() + interval '15 minutes' AND t.start_time > now())
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_reminder_sent(p_reminder_id uuid, p_reminder_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE tournament_reminders SET
    sent_24h = sent_24h OR p_reminder_type = '24h',
    sent_1h = sent_1h OR p_reminder_type = '1h',
    sent_15m = sent_15m OR p_reminder_type = '15m'
  WHERE id = p_reminder_id
    AND (auth.uid() IS NULL OR user_id = auth.uid());
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Joining tournaments: server decides open/full/standby
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_participant_join_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t record;
  v_member_team uuid;
  v_taken int;
  v_slots int;
BEGIN
  -- Lock the tournament so simultaneous joins are counted one at a time
  SELECT id, status, max_players, GREATEST(COALESCE(team_size, 1), 1) AS team_size
  INTO t FROM tournaments WHERE id = NEW.tournament_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Admins manage rosters by hand (replacements, fixes)
  IF auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF t.status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Registration for this tournament is closed';
  END IF;

  -- Set by the server, never by the player
  NEW.prize_won := 0;
  NEW.final_position := NULL;
  NEW.eliminated := false;
  NEW.checked_in := false;
  NEW.checked_in_at := NULL;
  NEW.paid_at := NULL;
  NEW.bracket_seed := NULL;
  NEW.gamertag := COALESCE((SELECT gamertag FROM profiles WHERE id = NEW.user_id), NEW.gamertag);

  IF t.team_size > 1 THEN
    -- A teammate who accepted an invite takes the captain's slot
    SELECT m.team_id INTO v_member_team
    FROM tournament_team_members m JOIN tournament_teams tt ON tt.id = m.team_id
    WHERE tt.tournament_id = NEW.tournament_id AND m.user_id = NEW.user_id AND m.status = 'accepted' AND tt.captain_id <> NEW.user_id
    LIMIT 1;
    IF v_member_team IS NOT NULL THEN
      NEW.team_id := v_member_team;
      NEW.is_standby := COALESCE((
        SELECT tp.is_standby FROM tournament_participants tp JOIN tournament_teams tt ON tt.id = v_member_team
        WHERE tp.tournament_id = NEW.tournament_id AND tp.user_id = tt.captain_id), false);
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM tournament_teams WHERE tournament_id = NEW.tournament_id AND captain_id = NEW.user_id) THEN
      RAISE EXCEPTION 'This is a team tournament. Create a team or accept a teammate''s invite.';
    END IF;
    SELECT count(*) INTO v_taken
    FROM tournament_participants tp JOIN tournament_teams tt ON tt.captain_id = tp.user_id AND tt.tournament_id = tp.tournament_id
    WHERE tp.tournament_id = NEW.tournament_id AND NOT COALESCE(tp.is_standby, false);
    v_slots := COALESCE(t.max_players, 0) / t.team_size;
  ELSE
    SELECT count(*) INTO v_taken FROM tournament_participants
    WHERE tournament_id = NEW.tournament_id AND NOT COALESCE(is_standby, false);
    v_slots := t.max_players;
  END IF;

  NEW.is_standby := v_slots IS NOT NULL AND v_slots > 0 AND v_taken >= v_slots;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS b_guard_participant_join_rules ON public.tournament_participants;
CREATE TRIGGER b_guard_participant_join_rules BEFORE INSERT ON public.tournament_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_participant_join_rules();

-- Players can't edit check-in/standby/position on their entry directly either
CREATE OR REPLACE FUNCTION public.guard_participant_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT has_role(auth.uid(), 'admin')
     AND (NEW.amount_paid IS DISTINCT FROM OLD.amount_paid OR NEW.credit_used IS DISTINCT FROM OLD.credit_used
          OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
          OR NEW.prize_won IS DISTINCT FROM OLD.prize_won OR NEW.final_position IS DISTINCT FROM OLD.final_position
          OR NEW.is_standby IS DISTINCT FROM OLD.is_standby OR NEW.eliminated IS DISTINCT FROM OLD.eliminated
          OR NEW.team_id IS DISTINCT FROM OLD.team_id OR NEW.gamertag IS DISTINCT FROM OLD.gamertag
          OR NEW.bracket_seed IS DISTINCT FROM OLD.bracket_seed OR NEW.paid_at IS DISTINCT FROM OLD.paid_at) THEN
    RAISE EXCEPTION 'Not allowed to change this entry' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Team invites
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_team_invite(p_team_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_member record;
  v_team record;
BEGIN
  SELECT * INTO v_member FROM tournament_team_members WHERE id = p_team_member_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF v_member.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'This invite is not yours to accept';
  END IF;
  IF v_member.status <> 'pending' THEN
    RAISE EXCEPTION 'This invite has already been responded to';
  END IF;
  IF v_member.expires_at IS NOT NULL AND v_member.expires_at < now() THEN
    UPDATE tournament_team_members SET status = 'declined' WHERE id = p_team_member_id;
    RAISE EXCEPTION 'This invite has expired';
  END IF;

  SELECT * INTO v_team FROM tournament_teams WHERE id = v_member.team_id;
  UPDATE tournament_team_members SET status = 'accepted' WHERE id = p_team_member_id;

  INSERT INTO tournament_participants (tournament_id, user_id, team_id, amount_paid, is_standby)
  VALUES (v_team.tournament_id, v_user_id, v_team.id, 0, false)
  ON CONFLICT DO NOTHING;

  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (v_team.captain_id, 'tournament', 'Teammate joined',
          format('%s accepted your invite to "%s".', COALESCE((SELECT gamertag FROM profiles WHERE id = v_user_id), 'A player'), v_team.team_name),
          '/tournaments/' || v_team.tournament_id);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. AI referee: auto-decide only when both players sent evidence
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_record_verdict(p_dispute uuid, p_winner uuid, p_confidence numeric, p_verdict jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  d match_disputes%ROWTYPE;
  v_flags int := COALESCE(jsonb_array_length(p_verdict -> 'red_flags'), 0);
  v_both boolean;
BEGIN
  SELECT * INTO d FROM match_disputes WHERE id = p_dispute FOR UPDATE;
  IF NOT FOUND OR d.status <> 'ai_review' THEN
    RETURN 'skipped';
  END IF;
  IF p_winner IS NOT NULL AND p_winner NOT IN (d.player1_id, d.player2_id) THEN
    p_winner := NULL;
  END IF;
  UPDATE match_disputes SET ai_verdict = p_verdict, ai_winner = p_winner, ai_confidence = p_confidence WHERE id = d.id;

  v_both := EXISTS (SELECT 1 FROM dispute_evidence WHERE dispute_id = d.id AND user_id = d.player1_id)
        AND EXISTS (SELECT 1 FROM dispute_evidence WHERE dispute_id = d.id AND user_id = d.player2_id);

  IF p_winner IS NOT NULL AND p_confidence >= 0.85 AND v_flags = 0 AND v_both THEN
    UPDATE match_disputes SET status = 'proposed', appeal_deadline = now() + interval '10 minutes' WHERE id = d.id;
    PERFORM create_notification(u, 'match', 'AI referee decision',
      (SELECT gamertag FROM profiles WHERE id = p_winner) || ' won, based on the evidence. You have 10 minutes to appeal.',
      CASE WHEN d.match_kind = 'tournament' THEN '/tournaments/' || d.tournament_id ELSE '/quick-match' END)
    FROM unnest(ARRAY[d.player1_id, d.player2_id]) u;
    RETURN 'proposed';
  END IF;

  -- No evidence at all from either side on a quick match: cancel and refund
  IF d.match_kind = 'quick' AND NOT EXISTS (SELECT 1 FROM dispute_evidence WHERE dispute_id = d.id) THEN
    PERFORM _apply_dispute_decision(d.id, NULL, 'system', NULL, 'No evidence from either player');
    RETURN 'void';
  END IF;
  -- Unsure, red flags, or only one side sent evidence: a human referee decides
  PERFORM _assign_referee(d.id);
  RETURN 'human_review';
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. Match chat: challenge chats are only for the two players
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view all messages" ON public.match_messages;

-- ---------------------------------------------------------------------------
-- 9. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS tournaments_created_by_idx ON public.tournaments (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_tournament_idx ON public.transactions (tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_challenge_idx ON public.transactions (challenge_id) WHERE challenge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mpesa_withdrawals_provider_idx ON public.mpesa_withdrawals (provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mpesa_deposits_ip_idx ON public.mpesa_deposits (ip) WHERE ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS mpesa_withdrawals_ip_idx ON public.mpesa_withdrawals (ip) WHERE ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS mpesa_deposits_user_completed_idx ON public.mpesa_deposits (user_id) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS match_messages_challenge_idx ON public.match_messages (challenge_id, created_at) WHERE challenge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_messages_tournament_idx ON public.match_messages (tournament_id, created_at) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS challenges_winner_completed_idx ON public.challenges (winner_id, completed_at DESC) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS friendships_friend_idx ON public.friendships (friend_id);
CREATE INDEX IF NOT EXISTS match_disputes_player1_idx ON public.match_disputes (player1_id);
CREATE INDEX IF NOT EXISTS match_disputes_player2_idx ON public.match_disputes (player2_id);
CREATE INDEX IF NOT EXISTS tournament_teams_captain_idx ON public.tournament_teams (tournament_id, captain_id);
CREATE INDEX IF NOT EXISTS tournament_team_members_user_idx ON public.tournament_team_members (user_id, status);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS community_messages_user_idx ON public.community_messages (user_id);
CREATE INDEX IF NOT EXISTS quick_match_participants_user_idx ON public.quick_match_participants (user_id);

DROP INDEX IF EXISTS public.idx_transactions_user_id;   -- same as idx_transactions_user
DROP INDEX IF EXISTS public.idx_profiles_gamertag;      -- same as profiles_gamertag_key
DROP INDEX IF EXISTS public.idx_notifications_user_id;  -- covered by idx_notifications_user_created

-- ---------------------------------------------------------------------------
-- Grants for the new functions
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN ('get_my_profile', 'admin_get_profiles', 'admin_balance_totals', 'guard_participant_join_rules', 'guard_kyc_paths', 'ai_record_verdict')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname IN ('get_my_profile', 'admin_get_profiles', 'admin_balance_totals') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
