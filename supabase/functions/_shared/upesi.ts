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

/** STK push into the UpesiPay payments wallet (channel "wallet") */
export function stkPush(phone: string, amount: number) {
  return call('/collections/initiate/', {
    method: 'POST',
    body: JSON.stringify({ channel_id: 'wallet', phone_number: phone, amount, callback_url: callbackUrl() }),
  });
}

/** B2C: pay out from the wallet to an M-Pesa number */
export function payout(phone: string, amount: number) {
  return call('/withdrawals/initiate/', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phone, amount, callback_url: callbackUrl() }),
  });
}

export function balances() {
  return call('/account/balance/');
}

/** Best-effort status lookup. Returns null when UpesiPay can't confirm. */
export async function transactionStatus(id: string): Promise<string | null> {
  if (!id) return null;
  const r = await call(`/transactions/${encodeURIComponent(id)}/`);
  if (!r.ok) return null;
  const s = String(r.body?.data?.status || '').toLowerCase();
  return s || null;
}

export function providerError(r: { status: number; body: any }) {
  const code = r.body?.error_code;
  if (code === 'INSUFFICIENT_BALANCE') return 'Payouts are paused for a moment. Your money is safe and will be sent shortly.';
  return r.body?.message || r.body?.detail || `Payment provider error (${r.status})`;
}
