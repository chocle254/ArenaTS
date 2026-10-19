import { supabase } from '@/db/supabase';

const key = (email: string) => `arena:pending-game-accounts:${email.trim().toLowerCase()}`;

export interface PendingGameAccount {
  game: string;
  inGameName: string;
}

/** Remember in-game names entered at sign-up until the player has a session. */
export function savePendingGameAccounts(email: string, accounts: PendingGameAccount[]) {
  try {
    if (accounts.length) localStorage.setItem(key(email), JSON.stringify(accounts));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Save any pending in-game names for this user. Safe to call on every sign-in:
 * it's a no-op when nothing is pending, and upserts so it never duplicates.
 */
export async function flushPendingGameAccounts(userId: string, email: string | undefined | null) {
  if (!email) return;
  let accounts: PendingGameAccount[] = [];
  try {
    accounts = JSON.parse(localStorage.getItem(key(email)) || '[]');
  } catch {
    return;
  }
  if (!Array.isArray(accounts) || accounts.length === 0) return;

  const rows = accounts
    .filter((a) => a?.game && a?.inGameName)
    .map((a) => ({ user_id: userId, game: a.game, in_game_name: a.inGameName }));
  if (rows.length === 0) return;

  const { error } = await supabase.from('game_accounts').upsert(rows, { onConflict: 'user_id,game', ignoreDuplicates: true });
  if (error) {
    console.error('Could not save pending game accounts:', error);
    return;
  }
  try {
    localStorage.removeItem(key(email));
  } catch {
    /* storage unavailable */
  }
}
