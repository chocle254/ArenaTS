import { supabase } from '@/db/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function';

export const DEPOSIT_FEE_RATE = 0.05; // UpesiPay disbursement-wallet top-up charge, passed on to the player
// Low minimums for launch testing (mirrors platform_settings.min_deposit_kes / min_withdrawal_kes)
export const DEPOSIT_MIN = 10;
export const DEPOSIT_MAX = 70000;
export const WITHDRAW_MIN = 20;
export const WITHDRAW_MAX = 70000;
/** Without ID: per withdrawal and per rolling 30 days (mirrors the server) */
export const UNVERIFIED_WITHDRAW_MAX = 5000;
export const UNVERIFIED_MONTHLY_MAX = 20000;

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const { data, error } = await invokeEdgeFunction<T & { error?: string }>('mpesa', { accessToken: token, body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
  return data as T;
}

export interface DepositStart {
  id: string;
  amount: number;
  fee: number;
  credit: number;
  phone: string;
}
export type DepositStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export const startDeposit = (phone: string, amount: number, purpose = 'wallet') => call<DepositStart>({ action: 'deposit', phone, amount, purpose });
export const depositStatus = (id: string) => call<{ status: DepositStatus; credit: number }>({ action: 'deposit_status', id });
export const requestWithdrawal = (amount: number) => call<{ id: string; status: 'processing' | 'queued' | 'review' | 'failed'; message?: string; send?: number; fee?: number }>({ action: 'withdraw', amount });

export const depositFee = (amount: number) => Math.round(amount * DEPOSIT_FEE_RATE * 100) / 100;

/** UpesiPay's B2C payout fee per amount sent (mirrors payout_fee_tiers). The player pays it. */
export const PAYOUT_FEE_TIERS: [from: number, to: number, fee: number][] = [
  [10, 49, 3], [50, 99, 8], [100, 499, 14], [500, 999, 20], [1000, 1499, 26],
  [1500, 2499, 37], [2500, 3499, 41], [3500, 4999, 52], [5000, 7499, 61],
  [7500, 9999, 70], [10000, 14999, 81], [15000, 19999, 85], [20000, 24999, 94],
  [25000, 29999, 99], [30000, 34999, 110], [35000, 39999, 129], [40000, 44999, 133],
  [45000, 49999, 139], [50000, 69999, 144], [70000, 149999, 157], [150000, 250000, 161],
];

export interface WithdrawalQuote {
  /** What reaches M-Pesa */
  send: number;
  /** UpesiPay's payout fee */
  fee: number;
  /** Taken from winnings (send + fee). Anything above this stays in winnings. */
  total: number;
}

/** Largest send with send + fee <= amount (same maths as the server's withdrawal_quote). */
export function quoteWithdrawal(amount: number): WithdrawalQuote | null {
  const a = Math.floor(amount);
  let best: WithdrawalQuote | null = null;
  for (const [from, to, fee] of PAYOUT_FEE_TIERS) {
    const send = Math.min(to, a - fee);
    if (send >= from && (!best || send > best.send)) best = { send, fee, total: send + fee };
  }
  return best;
}

/** If a slightly smaller withdrawal drops to a cheaper fee, say so. */
export function cheaperFeeHint(amount: number): { upTo: number; fee: number } | null {
  const q = quoteWithdrawal(amount);
  if (!q) return null;
  const i = PAYOUT_FEE_TIERS.findIndex(([, , fee]) => fee === q.fee);
  if (i <= 0) return null;
  const [from] = PAYOUT_FEE_TIERS[i];
  const [, prevTo, prevFee] = PAYOUT_FEE_TIERS[i - 1];
  // Only worth mentioning just above a tier boundary
  if (q.send - from > Math.max(20, from * 0.03)) return null;
  return { upTo: prevTo + prevFee, fee: prevFee };
}

/** "254712345678" -> "0712 *** 678" */
export function maskPhone(p?: string | null) {
  if (!p) return '';
  const local = p.startsWith('254') ? `0${p.slice(3)}` : p;
  return `${local.slice(0, 4)} *** ${local.slice(-3)}`;
}

export function isKenyanMobile(p: string) {
  const d = p.replace(/\D/g, '');
  return /^(254|0)?(7|1)\d{8}$/.test(d);
}
