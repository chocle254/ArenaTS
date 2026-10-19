import { supabase } from '@/db/supabase';

/**
 * True when PostgREST says the function doesn't exist (migration not applied yet).
 * PGRST202 = function not found in the schema cache.
 */
export function isMissingFunction(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message || '');
}

/** Turn database errors into something a player can act on. */
export function friendlyChallengeError(error: unknown): string {
  const msg = (error as { message?: string })?.message || '';
  if (/insufficient/i.test(msg)) return 'Not enough Arena Currency for this stake. Top up your wallet and try again.';
  if (/expired/i.test(msg)) return 'This challenge has expired.';
  if (/no longer open/i.test(msg)) return 'This challenge is no longer open.';
  if (/sensitive account fields/i.test(msg)) return 'Your balance could not be updated. Refresh the page and try again.';
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

/** Create a challenge and escrow the stake. Server function first, legacy client flow as fallback. */
export async function createChallenge(args: CreateArgs): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_challenge', {
    p_opponent_id: args.opponentId,
    p_game: args.game,
    p_stake: args.stake,
    p_opponent_team_id: args.opponentTeamId ?? null,
    p_challenger_team_id: args.challengerTeamId ?? null,
  });
  if (!error) return (data as string) ?? null;
  if (!isMissingFunction(error)) throw error;
  return legacyCreateChallenge(args);
}

async function legacyCreateChallenge(args: CreateArgs): Promise<string | null> {
  const { data: latest, error: balErr } = await supabase.from('profiles').select('arena_currency').eq('id', args.userId).single();
  if (balErr) throw balErr;
  const balance = Number(latest?.arena_currency || 0);
  if (balance < args.stake) throw new Error('Insufficient Arena Currency');

  const { error: debitErr } = await supabase.from('profiles').update({ arena_currency: balance - args.stake }).eq('id', args.userId);
  if (debitErr) throw debitErr;

  const total = args.stake * 2;
  const fee = total * 0.1;
  const { data: created, error: insertErr } = await supabase
    .from('challenges')
    .insert({
      challenger_id: args.userId,
      opponent_id: args.opponentId,
      game: args.game,
      stake_amount: args.stake,
      prize_pool: total - fee,
      platform_fee: fee,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      status: 'pending',
      challenger_team_id: args.challengerTeamId ?? null,
      opponent_team_id: args.opponentTeamId ?? null,
    })
    .select('id')
    .single();

  if (insertErr || !created) {
    await supabase.from('profiles').update({ arena_currency: balance }).eq('id', args.userId);
    throw insertErr || new Error('Could not create the challenge');
  }

  await supabase.from('transactions').insert({
    user_id: args.userId,
    type: 'challenge_fee',
    amount: -args.stake,
    description: `Stake for challenge to: ${args.opponentTag}`,
    status: 'completed',
    challenge_id: created.id,
  });
  return created.id as string;
}

interface AcceptArgs {
  userId: string;
  challengeId: string;
  stake: number;
  challengerTag: string;
}

/** Accept a challenge and escrow the stake. Server function first, legacy client flow as fallback. */
export async function acceptChallenge(args: AcceptArgs): Promise<void> {
  const { error } = await supabase.rpc('accept_challenge', { p_challenge_id: args.challengeId });
  if (!error) return;
  if (!isMissingFunction(error)) throw error;

  const { data: latest, error: balErr } = await supabase.from('profiles').select('arena_currency').eq('id', args.userId).single();
  if (balErr) throw balErr;
  const balance = Number(latest?.arena_currency || 0);
  if (balance < args.stake) throw new Error('Insufficient Arena Currency');

  const { error: debitErr } = await supabase.from('profiles').update({ arena_currency: balance - args.stake }).eq('id', args.userId);
  if (debitErr) throw debitErr;

  // Only flip a still-pending challenge, so a double tap can't charge twice
  const { data: updated, error: updErr } = await supabase
    .from('challenges')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', args.challengeId)
    .eq('status', 'pending')
    .select('id');

  if (updErr || !updated?.length) {
    await supabase.from('profiles').update({ arena_currency: balance }).eq('id', args.userId);
    throw updErr || new Error('This challenge is no longer open');
  }

  await supabase.from('transactions').insert({
    user_id: args.userId,
    type: 'challenge_fee',
    amount: -args.stake,
    description: `Stake for challenge from: ${args.challengerTag}`,
    status: 'completed',
    challenge_id: args.challengeId,
  });
}
