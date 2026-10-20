// Which Twitch channels are live right now. Read-only.
// POST { logins: string[] } -> { configured: boolean, live: string[] }
// Needs TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET (free app at dev.twitch.tv).
// Without them it answers { configured: false } and the app trusts the
// players' "Stream this match" toggle.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

let token: { value: string; until: number } | null = null;
// Short cache so many viewers polling the Streams page make one Twitch call
const cache = new Map<string, { live: boolean; at: number }>();
const CACHE_MS = 60_000;

async function appToken(id: string, secret: string) {
  if (token && token.until > Date.now() + 60_000) return token.value;
  const r = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
  });
  if (!r.ok) throw new Error(`twitch token ${r.status}`);
  const d = await r.json();
  token = { value: d.access_token, until: Date.now() + Number(d.expires_in || 3600) * 1000 };
  return token.value;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const id = Deno.env.get('TWITCH_CLIENT_ID');
  const secret = Deno.env.get('TWITCH_CLIENT_SECRET');
  if (!id || !secret) return json({ configured: false, live: [] });

  const body = await req.json().catch(() => ({}));
  const logins = [...new Set(((body?.logins as unknown[]) || []).map((l) => String(l).toLowerCase()).filter((l) => /^[a-z0-9_]{3,25}$/.test(l)))].slice(0, 100);
  if (logins.length === 0) return json({ configured: true, live: [] });

  const now = Date.now();
  const stale = logins.filter((l) => !(cache.get(l)?.at && now - cache.get(l)!.at < CACHE_MS));
  if (stale.length) {
    try {
      const t = await appToken(id, secret);
      const qs = stale.map((l) => `user_login=${encodeURIComponent(l)}`).join('&');
      const r = await fetch(`https://api.twitch.tv/helix/streams?first=100&${qs}`, { headers: { 'Client-Id': id, Authorization: `Bearer ${t}` } });
      if (r.status === 401) token = null;
      if (!r.ok) throw new Error(`twitch streams ${r.status}`);
      const d = await r.json();
      const liveNow = new Set(((d.data || []) as { user_login: string; type: string }[]).filter((s) => s.type === 'live').map((s) => s.user_login.toLowerCase()));
      for (const l of stale) cache.set(l, { live: liveNow.has(l), at: now });
    } catch (e) {
      console.error(e);
      // Twitch unreachable: don't hide streams, let the app fall back to the toggle
      return json({ configured: false, live: [] });
    }
  }
  return json({ configured: true, live: logins.filter((l) => cache.get(l)?.live) });
});
