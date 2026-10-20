-- ============================================================================
-- Launch performance indexes
-- ============================================================================
-- NOT YET APPLIED. Safe to run more than once (IF NOT EXISTS); adds indexes
-- only, no data changes. Each statement briefly locks its table for writes,
-- so run it at a quiet moment (seconds on a launch-sized database).
--
-- Every index below backs a query the app runs constantly:
-- ============================================================================

-- "Online now" lists and the World Chat online count (polled every 30-60 s per player)
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles (last_seen_at DESC NULLS LAST);

-- Leaderboards: top earners, most wins, hot streaks
CREATE INDEX IF NOT EXISTS idx_profiles_total_earnings ON public.profiles (total_earnings DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_wins ON public.profiles (wins DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_current_streak ON public.profiles (current_streak DESC NULLS LAST) WHERE current_streak > 0;

-- Chats inbox and conversations
CREATE INDEX IF NOT EXISTS idx_dm_sender_created ON public.direct_messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_receiver_created ON public.direct_messages (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_receiver_unread ON public.direct_messages (receiver_id, sender_id) WHERE read_at IS NULL;

-- Home / "my tournaments" and tournament participant lists
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON public.tournament_participants (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON public.tournament_participants (tournament_id);

-- Upcoming / live tournament rails
CREATE INDEX IF NOT EXISTS idx_tournaments_status_start ON public.tournaments (status, start_time);

-- Live matches feed (Home "Live on Twitch", Streams)
CREATE INDEX IF NOT EXISTS idx_match_results_live ON public.match_results (updated_at DESC) WHERE both_players_ready = true AND status <> 'confirmed';
CREATE INDEX IF NOT EXISTS idx_challenges_live ON public.challenges (match_started_at DESC) WHERE status = 'accepted' AND match_started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_opponent ON public.challenges (opponent_id);

-- Friends and friend requests
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships (user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests (receiver_id, status);

-- Notifications bell (newest first per player)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
