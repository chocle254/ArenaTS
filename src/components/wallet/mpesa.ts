import { supabase } from '@/db/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function';

export const DEPOSIT_FEE_RATE = 0.045; // UpesiPay wallet collection fee, passed on to the player
export const DEPOSIT_MIN = 50;
export const DEPOSIT_MAX = 70000;
export const WITHDRAW_MIN = 50;
export const WITHDRAW_MAX = 70000;
export const UNVERIFIED_WITHDRAWALS = 2;
export const UNVERIFIED_WITHDRAW_MAX = 2000;

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
export const requestWithdrawal = (amount: number) => call<{ id: string; status: 'processing' | 'queued' | 'review' | 'failed'; message?: string }>({ action: 'withdraw', amount });

export const depositFee = (amount: number) => Math.round(amount * DEPOSIT_FEE_RATE * 100) / 100;

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
