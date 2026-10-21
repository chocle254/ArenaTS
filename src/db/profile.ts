import { supabase } from '@/db/supabase';
import type { Profile } from '@/types/database';

/**
 * The signed-in player's full profile (balances, email, M-Pesa number...).
 * Other players' rows only expose public columns, so this goes through
 * get_my_profile on the server. userId is kept for callers; the server
 * always returns the signed-in player.
 */
export async function getProfile(_userId?: string): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  const row = data as Profile | null;
  return row?.id ? row : null;
}
