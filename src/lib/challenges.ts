import { supabase } from '@/db/supabase';

/** Turn database errors into something a player can act on. */
export function friendlyChallengeError(error: unknown): string {
  const msg = (error as { message?: string })?.message || '';
  if (/5 challenges waiting/i.test(msg)) return msg;
  if (/insufficient|not enough in your play balance/i.test(msg)) return 'Not enough in your play balance for this stake. Top up with M-Pesa and try again.';
  if (/expired/i.test(msg)) return 'This challenge has expired.';
  if (/no longer open/i.test(msg)) return 'This challenge is no longer open.';
  return msg || 'Something went wrong. Try again.';
}

interface CreateArgs {
  userId: string;
  opponentId: string;
  opponentTag: string;
  game: string;
  stake: number;
  challengerTeamId?: string | null;
  opponentTeamId?: string | null;
}

/** Create a challenge. The server checks limits, takes the stake and records it. */
export async function createChallenge(args: CreateArgs): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_challenge', {
    p_opponent_id: args.opponentId,
    p_game: args.game,
    p_stake: args.stake,
    p_opponent_team_id: args.opponentTeamId ?? null,
    p_challenger_team_id: args.challengerTeamId ?? null,
  });
  if (error) throw error;
  return (data as string) ?? null;
}

interface AcceptArgs {
  userId: string;
  challengeId: string;
  stake: number;
  challengerTag: string;
}

/** Accept a challenge. The server takes the stake. */
export async function acceptChallenge(args: AcceptArgs): Promise<void> {
  const { error } = await supabase.rpc('accept_challenge', { p_challenge_id: args.challengeId });
  if (error) throw error;
}

/**
 * Quick matches are free (XP and rank only). Money stakes are switched off on
 * the server (platform_settings.quick_match_stakes_enabled); these limits
 * apply only if that is ever turned on.
 */
export const STAKE_MIN = 50;
export const STAKE_MAX = 2000;
