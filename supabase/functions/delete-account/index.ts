// Deletes the signed-in player's account (POST, player's JWT).
//
// The database does the work in one transaction (_delete_account): it refuses
// while the player has winnings or anything in progress, then removes personal
// data and private content, closes the login and keeps money records under an
// anonymous "Deleted player". This function then removes their ID photos from B2.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { deleteObject } from '../_shared/b2.ts';

function cors(req: Request) {
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return reply({ error: 'Use POST' }, 405);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: auth } = await userClient.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return reply({ error: 'Sign in first' }, 401);

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== 'DELETE') return reply({ error: 'Type DELETE to confirm' }, 400);

  const { data: allowed } = await db.rpc('take_rate_limit', { p_key: `delete-account:${uid}`, p_limit: 5, p_window_seconds: 3600 });
  if (allowed === false) return reply({ error: 'Too many attempts. Try again later.' }, 429);

  const { data, error } = await db.rpc('_delete_account', { p_uid: uid });
  if (error) return reply({ error: error.message }, 409);

  // ID photos: best effort, and anything that fails is recorded for an admin to retry
  const keys: string[] = data?.media_keys || [];
  for (const key of keys) {
    try {
      await deleteObject('private', key);
    } catch (e) {
      await db.from('media_delete_failures').insert({ object_key: key, error: String((e as Error).message).slice(0, 300) });
    }
  }
  return reply({ ok: true });
});
