// UpesiPay client shared by the mpesa and mpesa-callback functions.
// Secrets (set in Supabase > Edge Functions > Secrets):
//   UPESIPAY_AUTH_TOKEN       the token from UpesiPay developer settings (used as "Basic <token>")
//   UPESIPAY_CALLBACK_SECRET  any long random string; it is added to callback URLs so only
//                             UpesiPay (which receives the URL from us) can call mpesa-callback
import { createClient } from 'jsr:@supabase/supabase-js@2';

const BASE = 'https://upesipay.com/api/v2';

export function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

export function cors(req: Request) {
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || null;
}

function token() {
  const t = Deno.env.get('UPESIPAY_AUTH_TOKEN');
  if (!t) throw new Error('Payments are not configured yet (UPESIPAY_AUTH_TOKEN missing)');
  return t.startsWith('Basic ') ? t : `Basic ${t}`;
}

export function callbackUrl() {
  const secret = Deno.env.get('UPESIPAY_CALLBACK_SECRET');
  if (!secret) throw new Error('Payments are not configured yet (UPESIPAY_CALLBACK_SECRET missing)');
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback?k=${encodeURIComponent(secret)}`;
}

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: token(), 'Content-Type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok && body?.success !== false, status: res.status, body };
}

/**
 * STK push that tops up the Disbursement Wallet (5% charge). Player deposits
 * land in the same wallet B2C payouts are paid from. (The old
 * /collections/initiate/ "wallet" channel paid into the payments wallet,
 * which payouts can't use.)
 */
export function stkPush(phone: string, amount: number) {
  return call('/disbursement-wallet/topup/', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phone, amount, callback_url: callbackUrl() }),
  });
}

/** checkout_request_id is top-level on top-ups and under data on STK collections */
export function checkoutId(body: any): string | null {
  return body?.checkout_request_id ?? body?.data?.checkout_request_id ?? null;
}

/**
 * B2C payout to an M-Pesa number. NOTE: UpesiPay charges this to the "account"
 * balance, not the Disbursement Wallet where deposits land; asking UpesiPay for
 * the disbursement-wallet payout endpoint (/withdraw?wallet_type=disbursement_wallet
 * returns 404). Until then payouts queue with the money reserved.
 */
export function payout(phone: string, amount: number, reference: string) {
  return call('/withdrawals/initiate/', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phone, amount, callback_url: callbackUrl(), external_reference: reference }),
  });
}

/** Provider's id for a payout, whichever field this endpoint uses */
export function payoutId(body: any): string {
  const d = body?.data ?? body ?? {};
  return String(d.withdrawal_id ?? d.transaction_id ?? d.id ?? d.reference ?? d.request_id ?? body?.request_id ?? '');
}

export function balances() {
  return call('/account/balance/');
}

/**
 * Best-effort status lookup. Returns null when UpesiPay can't confirm.
 * UpesiPay documents two forms (path id and ?reference=), so try both.
 */
export async function transactionStatus(id: string): Promise<string | null> {
  if (!id) return null;
  for (const path of [`/transactions/${encodeURIComponent(id)}/`, `/transaction-status?reference=${encodeURIComponent(id)}`]) {
    const r = await call(path).catch(() => null);
    if (!r?.ok) continue;
    const s = String(r.body?.data?.status ?? r.body?.status ?? '').toLowerCase();
    if (s) return s;
  }
  return null;
}

export function providerError(r: { status: number; body: any }) {
  const code = r.body?.error_code;
  if (code === 'INSUFFICIENT_BALANCE') return 'Payouts are paused for a moment. Your money is safe and will be sent shortly.';
  return r.body?.message || r.body?.detail || `Payment provider error (${r.status})`;
}
