import { supabase } from '@/db/supabase';

const KEY = 'arena:ref';
const CODE_RE = /^[A-Z0-9]{4,12}$/;

export function normalizeRefCode(code: string | null | undefined): string {
  return (code || '').trim().toUpperCase();
}

/**
 * Remember an invite code from a link (/sign-up?ref=CODE) on this device, so
 * it still applies after a Google/Discord/Twitch round trip.
 */
export function saveRefCode(code: string | null | undefined) {
  const c = normalizeRefCode(code);
  if (!CODE_RE.test(c)) return;
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* storage unavailable */
  }
}

export function readRefCode(): string {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function clearRefCode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export function inviteLink(code: string) {
  return `${window.location.origin}/sign-up?ref=${encodeURIComponent(code)}`;
}

/** Link the signed-in player to an inviter. Throws a readable message on failure. */
export async function applyRefCode(code: string) {
  const { error } = await supabase.rpc('apply_referral_code', { p_code: normalizeRefCode(code) });
  if (error) throw new Error(error.message);
}

/**
 * After an OAuth sign-up, apply the code saved from the invite link. Only new
 * accounts can use one, so this is quiet for everyone else.
 */
export async function claimSavedRefCode(createdAt: string | undefined): Promise<boolean> {
  const code = readRefCode();
  if (!code) return false;
  // Old accounts can't add a code; just forget it.
  if (createdAt && Date.now() - new Date(createdAt).getTime() > 7 * 24 * 3600 * 1000) {
    clearRefCode();
    return false;
  }
  try {
    await applyRefCode(code);
    return true;
  } catch {
    return false;
  } finally {
    clearRefCode();
  }
}

export interface ReferralFriend {
  gamertag: string;
  avatar_url: string | null;
  status: 'pending' | 'rewarded' | 'blocked';
  reason: string | null;
  reward: number;
  joined_at: string;
}

export interface ReferralSummary {
  code: string;
  enabled: boolean;
  reward: number;
  min_deposit: number;
  monthly_cap: number;
  can_add_code: boolean;
  invited_by: string | null;
  earned: number;
  friends: ReferralFriend[];
}

export async function getMyReferrals(): Promise<ReferralSummary | null> {
  const { data, error } = await supabase.rpc('get_my_referrals');
  if (error) throw error;
  return (data as ReferralSummary) ?? null;
}
