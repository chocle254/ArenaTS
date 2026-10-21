/**
 * Columns that are safe to load for *other* players. Never use select('*') on
 * profiles for anyone but the signed-in user: the row also holds email, phone,
 * balances, Stripe IDs and KYC file paths.
 */
export const PUBLIC_PROFILE_COLUMNS =
  'id, gamertag, username, avatar_url, bio, role, tier, wins, losses, win_rate, rating, total_earnings, tournaments_played, current_streak, longest_streak, global_rank, favorite_games, twitch_handle, location, created_at, last_seen_at';

/** A player counts as online if their heartbeat landed in the last 5 minutes. */
export function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60_000;
}
