// M-Pesa for signed-in users (KES).
// POST { action: 'deposit', phone, amount, purpose? }   -> STK prompt on the phone
// POST { action: 'deposit_status', id }                 -> pending | completed | failed | cancelled | timeout
// POST { action: 'withdraw', amount }                   -> pays out to the linked number, or queues for review
// Admin only:
// POST { action: 'approve_withdrawal', id }             -> approve a reviewed withdrawal and pay it
// POST { action: 'retry_withdrawal', id }               -> retry a queued payout (e.g. after a low-balance pause)
// POST { action: 'balances' }                           -> UpesiPay wallet balances
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { admin, balances, checkoutId, clientIp, cors, json, payout, payoutId, providerError, stkPush, transactionStatus } from '../_shared/upesi.ts';

async function sendPayout(db: ReturnType<typeof admin>, id: string) {
  const { data: w } = await db.from('mpesa_withdrawals').select('*').eq('id', id).single();
  if (!w || w.status !== 'queued') return { status: w?.status || 'missing' };
  // Claim it so two calls can't pay twice
  const { data: claimed } = await db.from('mpesa_withdrawals').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'queued').select('id');
  if (!claimed?.length) return { status: 'processing' };
  // Send the net amount; the player's withdrawal already covers UpesiPay's fee
  const r = await payout(w.phone, Number(w.send_amount ?? w.amount), id);
  console.log('payout response', r.status, JSON.stringify(r.body));
  if (r.ok) {
    await db.rpc('finish_mpesa_withdrawal', { p_id: id, p_status: 'processing', p_provider_id: payoutId(r.body) || id, p_receipt: null, p_reason: null, p_charge: Number(r.body?.data?.charge ?? 0) || null });
    return { status: 'processing' };
  }
  if (r.body?.error_code === 'INSUFFICIENT_BALANCE') {
    // Keep the money reserved and retry later. Record which balance UpesiPay checked.
    const d = r.body?.details || {};
    const why = `Waiting for payout wallet top-up (UpesiPay: ${d.balance_type ?? 'balance'} ${d.current_balance ?? '?'}, needs ${d.required_amount ?? '?'})`;
    console.error('payout insufficient balance', JSON.stringify(r.body));
    await db.from('mpesa_withdrawals').update({ status: 'queued', failure_reason: why.slice(0, 300), updated_at: new Date().toISOString() }).eq('id', id);
    return { status: 'queued', message: providerError(r) };
  }
  console.error('payout failed', r.status, JSON.stringify(r.body));
  await db.rpc('finish_mpesa_withdrawal', { p_id: id, p_status: 'failed', p_provider_id: null, p_receipt: null, p_reason: `${providerError(r)} [${r.status}]`, p_charge: null });
  return { status: 'failed', message: providerError(r) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    });
    const { data: auth } = await userClient.auth.getUser();
    const user = auth?.user;
    if (!user) return json(req, { error: 'Sign in first' }, 401);

    const db = admin();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'deposit') {
      const amount = Math.round(Number(body.amount));
      const { data: dep, error } = await db.rpc('start_mpesa_deposit', { p_user: user.id, p_phone: String(body.phone || ''), p_amount: amount, p_purpose: String(body.purpose || 'wallet'), p_ip: clientIp(req) });
      if (error) return json(req, { error: error.message }, 400);
      const r = await stkPush(dep.phone, Number(dep.amount));
      if (!r.ok) {
        await db.rpc('complete_mpesa_deposit', { p_deposit_id: dep.id, p_status: 'failed', p_reference: null, p_payload: r.body });
        return json(req, { error: providerError(r) }, 502);
      }
      await db.from('mpesa_deposits').update({ checkout_request_id: checkoutId(r.body), merchant_request_id: r.body?.merchant_request_id ?? r.body?.data?.merchant_request_id ?? null }).eq('id', dep.id);
      // checkout ids stay on the server; the app only gets our own deposit id
      return json(req, { id: dep.id, amount: dep.amount, fee: dep.fee, credit: dep.credit, phone: dep.phone });
    }

    if (action === 'deposit_status') {
      const { data } = await db.from('mpesa_deposits').select('id, status, amount, credit, created_at, checkout_request_id').eq('id', String(body.id || '')).eq('user_id', user.id).maybeSingle();
      if (!data) return json(req, { error: 'Not found' }, 404);
      // No callback yet after 20s: ask UpesiPay directly (top-up callbacks aren't documented)
      if (data.status === 'pending' && data.checkout_request_id && Date.now() - new Date(data.created_at).getTime() > 20_000) {
        const s = await transactionStatus(data.checkout_request_id).catch(() => null);
        const final = s && ['success', 'successful', 'completed'].includes(s) ? 'completed' : s && ['failed', 'cancelled', 'canceled', 'timeout', 'expired'].includes(s) ? (s === 'canceled' ? 'cancelled' : s === 'expired' ? 'timeout' : s) : null;
        if (final) {
          await db.rpc('complete_mpesa_deposit', { p_deposit_id: data.id, p_status: final, p_reference: data.checkout_request_id, p_payload: { source: 'status_poll', status: s } });
          data.status = final;
        }
      }
      const { checkout_request_id: _c, ...out } = data;
      return json(req, out);
    }

    if (action === 'withdraw') {
      const { data: w, error } = await db.rpc('request_mpesa_withdrawal', { p_user: user.id, p_amount: Math.round(Number(body.amount)), p_ip: clientIp(req) });
      if (error) return json(req, { error: error.message }, 400);
      const quote = { send: w.send ?? w.amount, fee: w.fee ?? 0, total: w.amount };
      if (w.status === 'review') {
        return json(req, { id: w.id, status: 'review', ...quote, message: 'Your withdrawal is being checked. This usually takes a few hours.' });
      }
      const sent = await sendPayout(db, w.id);
      return json(req, { id: w.id, ...quote, ...sent });
    }

    // ---- admin ----
    const { data: me } = await db.from('profiles').select('role').eq('id', user.id).single();
    if (me?.role !== 'admin') return json(req, { error: 'Admins only' }, 403);

    if (action === 'approve_withdrawal') {
      const { error } = await userClient.rpc('admin_review_withdrawal', { p_id: String(body.id), p_approve: true, p_reason: null });
      if (error) return json(req, { error: error.message }, 400);
      return json(req, await sendPayout(db, String(body.id)));
    }
    if (action === 'retry_withdrawal') {
      return json(req, await sendPayout(db, String(body.id)));
    }
    if (action === 'balances') {
      const r = await balances();
      if (!r.ok) return json(req, { error: providerError(r) }, 502);
      return json(req, r.body?.data ?? {});
    }

    return json(req, { error: 'Unknown action' }, 400);
  } catch (e) {
    return json(req, { error: (e as Error).message || 'Something went wrong' }, 500);
  }
});
