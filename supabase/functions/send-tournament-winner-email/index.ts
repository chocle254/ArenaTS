// "You won" email, called by the notify_tournament_winner_email trigger.
// Anyone holding the public key can reach this URL, so it trusts nothing in
// the request except two ids:
//   * the tournament must be completed and the id must be its real winner
//   * each tournament's email is sent once (claim_email_send)
//   * every value put into the HTML is escaped (tournament names are player text)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function template(o: { gamertag: string; tournament: string; game: string; prize: string; walletUrl: string }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>You won on Arena</title></head>
<body style="margin:0;padding:0;background:#08090E;color:#E5E7EB;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="background:#11121A;border:1px solid #2A2440;border-radius:20px;padding:36px 24px;text-align:center">
      <div style="font-size:28px;font-weight:800;letter-spacing:.08em;color:#A78BFA">ARENA</div>
      <div style="font-size:48px;margin:16px 0">🏆</div>
      <div style="font-size:22px;font-weight:800;color:#F9FAFB;margin-bottom:8px">Congratulations, ${esc(o.gamertag)}!</div>
      <div style="font-size:15px;line-height:1.6;color:#C4C7D0;margin-bottom:24px">You won <strong>${esc(o.tournament)}</strong> (${esc(o.game)}).</div>
      <div style="border:1px solid #372F55;border-radius:14px;padding:20px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#9CA3AF">Prize</div>
        <div style="font-size:32px;font-weight:800;color:#F9FAFB">${esc(o.prize)}</div>
      </div>
      <a href="${esc(o.walletUrl)}" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:10px">Open your wallet</a>
      <div style="font-size:12px;color:#6B7280;margin-top:24px;line-height:1.6">Arena never asks for your M-Pesa PIN or password. Only trust links that open the Arena site you normally use.</div>
    </div>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply({ error: 'POST only' }, 405);
  try {
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');
    if (!gmailUser || !gmailAppPassword) return reply({ error: 'Email is not configured' }, 503);
    const fromEmail = Deno.env.get('SMTP_FROM_EMAIL') || `Arena <${gmailUser}>`;
    const frontendUrl = (Deno.env.get('FRONTEND_URL') || 'https://arena-royal.vercel.app').replace(/\/$/, '');

    const body = await req.json().catch(() => ({}));
    const tournamentId = String(body.tournament_id || '');
    const winnerId = String(body.winner_id || '');
    if (!UUID.test(tournamentId) || !UUID.test(winnerId)) return reply({ error: 'Bad request' }, 400);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    // Only the real winner of a finished tournament
    const { data: t } = await db.from('tournaments').select('name, game, status, winner_id').eq('id', tournamentId).maybeSingle();
    if (!t || t.status !== 'completed' || t.winner_id !== winnerId) return reply({ skipped: 'not the winner of a completed tournament' });

    const { data: p } = await db.from('profiles').select('gamertag, email').eq('id', winnerId).maybeSingle();
    if (!p?.email) return reply({ skipped: 'no email' });

    // Once per tournament, however many times this is called
    const { data: claimed } = await db.rpc('claim_email_send', { p_kind: 'tournament_winner', p_ref: tournamentId });
    if (!claimed) return reply({ skipped: 'already sent' });

    const { data: wins } = await db.from('transactions').select('amount').eq('user_id', winnerId).eq('tournament_id', tournamentId).eq('type', 'tournament_win');
    const total = (wins || []).reduce((s: number, w: { amount: number }) => s + Number(w.amount || 0), 0);
    const prize = total > 0 ? `KES ${total.toLocaleString('en-KE', { maximumFractionDigits: 2 })}` : 'See your wallet';

    const client = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: gmailUser, password: gmailAppPassword } } });
    await client.send({
      from: fromEmail,
      to: p.email,
      subject: 'You won a tournament on Arena',
      html: template({ gamertag: p.gamertag || 'Champion', tournament: t.name, game: t.game, prize, walletUrl: `${frontendUrl}/wallet` }),
      headers: { 'Reply-To': gmailUser },
    });
    await client.close();
    return reply({ success: true });
  } catch (e) {
    console.error('winner email error', (e as Error)?.message);
    return reply({ error: 'Could not send' }, 500);
  }
});
