// UpesiPay callbacks (deposits and payouts). Deploy with JWT verification OFF.
// UpesiPay doesn't sign callbacks and doesn't retry, so:
//   * the URL carries our secret (?k=...) and anything without it is ignored
//   * a deposit is only credited if it matches a pending deposit WE created
//   * when UpesiPay's status API can confirm, a disagreeing callback is ignored
//   * everything is idempotent; we always answer 200 quickly
import { admin, transactionStatus } from '../_shared/upesi.ts';

const ok = () => new Response('ok', { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return ok();
  const url = new URL(req.url);
  const secret = Deno.env.get('UPESIPAY_CALLBACK_SECRET');
  if (!secret || url.searchParams.get('k') !== secret) return new Response('forbidden', { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return ok();
  const db = admin();
  const status = String(body.status || '').toLowerCase();

  try {
    // Deposit / disbursement top-up callback: { merchant_request_id, checkout_request_id, reference_id, status }
    // (top-up payloads aren't documented, so also accept the id under data and success/completed)
    const checkout = body.checkout_request_id ?? body.data?.checkout_request_id;
    if (checkout) {
      const { data: dep } = await db.from('mpesa_deposits').select('id, status').eq('checkout_request_id', String(checkout)).maybeSingle();
      if (!dep || dep.status !== 'pending') return ok();
      const st = status || String(body.data?.status || '').toLowerCase();
      let final = ['success', 'successful', 'completed'].includes(st) ? 'completed' : ['failed', 'cancelled', 'timeout'].includes(st) ? st : null;
      if (!final) return ok();
      if (final === 'completed') {
        const confirmed = await transactionStatus(String(body.reference_id ?? checkout)).catch(() => null);
        if (confirmed && !['completed', 'success', 'successful'].includes(confirmed)) final = 'failed';
      }
      await db.rpc('complete_mpesa_deposit', { p_deposit_id: dep.id, p_status: final, p_reference: body.reference_id ?? checkout, p_payload: body });
      return ok();
    }

    // Payout callback: { transaction_id, request_id, status: completed|failed, mpesa_receipt }
    const providerId = String(body.request_id || body.withdrawal_id || body.transaction_id || '');
    if (providerId) {
      const { data: w } = await db.from('mpesa_withdrawals').select('id, status')
        .or(`provider_id.eq.${providerId},provider_id.eq.${String(body.transaction_id || '')}`)
        .in('status', ['processing', 'queued']).maybeSingle();
      if (!w) return ok();
      if (status === 'completed' || status === 'success') {
        await db.rpc('finish_mpesa_withdrawal', { p_id: w.id, p_status: 'completed', p_provider_id: providerId, p_receipt: body.mpesa_receipt ?? null, p_reason: null, p_charge: null });
      } else if (status === 'failed') {
        await db.rpc('finish_mpesa_withdrawal', { p_id: w.id, p_status: 'failed', p_provider_id: providerId, p_receipt: null, p_reason: 'M-Pesa payout failed', p_charge: null });
      }
    }
  } catch (e) {
    console.error('mpesa-callback error', e);
  }
  return ok();
});
