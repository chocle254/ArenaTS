// Database backups, started from the admin dashboard.
//
// Admins only (JWT verified by Supabase, role checked here):
//   POST { action: 'create' }          copy every public table + auth users into
//                                      backups/arena-<time>.json.gz in the private
//                                      B2 bucket; keeps the newest 30
//   POST { action: 'download', id }    -> { url } 10 minute download link
//
// File format: { created_at, tables: { "public.profiles": [rows], ... } }.
// Private messages stay encrypted (the Vault key is not in the file).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { deleteObject, putObject, viewUrl } from '../_shared/b2.ts';

const KEEP = 30;

function cors(req: Request) {
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function service() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

type Db = ReturnType<typeof service>;

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function create(db: Db, uid: string) {
  const { data: names, error } = await db.rpc('_backup_tables');
  if (error) throw error;

  const parts: string[] = [];
  let rows = 0;
  for (const name of names as string[]) {
    const { data, error: e } = await db.rpc('_backup_table_json', { p_table: name });
    if (e) throw new Error(`Could not read ${name}: ${e.message}`);
    const list = (data as unknown[]) || [];
    rows += list.length;
    parts.push(`${JSON.stringify(name)}:${JSON.stringify(list)}`);
  }
  const createdAt = new Date().toISOString();
  const file = await gzip(`{"created_at":${JSON.stringify(createdAt)},"tables":{${parts.join(',')}}}`);

  const key = `backups/arena-${createdAt.replace(/[:.]/g, '-')}.json.gz`;
  await putObject('private', key, file, 'application/gzip');

  const { data: row, error: insErr } = await db
    .from('db_backups')
    .insert({ file_key: key, size_bytes: file.byteLength, table_count: names.length, row_count: rows, created_by: uid })
    .select('id, file_key, size_bytes, table_count, row_count, created_at')
    .single();
  if (insErr) throw insErr;

  // Keep the newest KEEP backups
  const { data: old } = await db.from('db_backups').select('id, file_key').order('created_at', { ascending: false }).range(KEEP, KEEP + 100);
  for (const o of old || []) {
    try {
      await deleteObject('private', o.file_key);
      await db.from('db_backups').delete().eq('id', o.id);
    } catch (e) {
      console.error('prune failed', o.file_key, e);
    }
  }
  return { backup: row };
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

  try {
    const db = service();
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    });
    const { data: auth } = await userClient.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return reply({ error: 'Sign in first' }, 401);
    const { data: profile } = await db.from('profiles').select('role').eq('id', uid).maybeSingle();
    if (profile?.role !== 'admin') return reply({ error: 'Not allowed' }, 403);

    const body = await req.json().catch(() => ({}));
    if (body.action === 'create') {
      const { data: allowed } = await db.rpc('take_rate_limit', { p_key: `db-backup:${uid}`, p_limit: 6, p_window_seconds: 3600 });
      if (allowed === false) return reply({ error: 'Too many backups this hour. Try again later.' }, 429);
      return reply(await create(db, uid));
    }
    if (body.action === 'download') {
      const { data: b } = await db.from('db_backups').select('file_key').eq('id', String(body.id || '')).maybeSingle();
      if (!b) return reply({ error: 'Backup not found' }, 404);
      return reply({ url: await viewUrl(b.file_key, 600) });
    }
    return reply({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('db-backup error', e);
    return reply({ error: (e as Error).message || 'Something went wrong' }, 500);
  }
});
