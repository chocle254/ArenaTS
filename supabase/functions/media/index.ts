// Files on Backblaze B2. Avatars stay in Supabase Storage; everything else is here.
//
// Signed-in users (JWT verified by Supabase):
//   POST ?action=upload&kind=kyc&name=id-front.jpg|selfie.jpg      body: the photo
//   POST ?action=upload&kind=evidence&dispute=<id>&file=<ts>[-fN].<ext>  body: photo/video/frame
//   POST ?action=upload&kind=trailer|poster                         body: video/image (admins, verified organizers)
//   POST { action: 'view', kind: 'kyc'|'evidence', paths: [...] }   -> { urls: { path: url } } (10 min links)
//   POST { action: 'trailers' }                                     -> reusable trailers library
// Scheduled (x-cron-key header = private.app_secrets media_cron):
//   POST { action: 'cleanup' }   delete trailers whose tournaments ended over a day ago (unless kept for reuse),
//                                and ID photos of deleted accounts after their 7-year retention
//   POST { action: 'migrate' }   copy ID photos and evidence from Supabase Storage to B2
//   POST { action: 'selftest' }  write, read and delete a test file in each bucket
//
// Paths stay the same as before (kyc: <user>/<name>, evidence: <dispute>/<user>/<file>),
// so the database's ownership checks still apply. In B2 they live under kyc/ and evidence/.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { deleteObject, headObject, presign, publicUrl, putObject, viewUrl } from '../_shared/b2.ts';

const MB = 1024 * 1024;
const LIMITS = {
  kyc: 10 * MB,
  evidenceImage: 10 * MB,
  evidenceVideo: 50 * MB,
  trailer: 40 * MB,
  poster: 3 * MB,
};
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cors(req: Request) {
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Reads the request body, refusing anything over `max` bytes */
async function readBody(req: Request, max: number): Promise<Uint8Array> {
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > max) throw new HttpError(413, `That file is too big (max ${Math.round(max / MB)} MB)`);
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > max) throw new HttpError(413, `That file is too big (max ${Math.round(max / MB)} MB)`);
  if (buf.byteLength === 0) throw new HttpError(400, 'The file is empty');
  return buf;
}

function baseType(req: Request) {
  return (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
}

async function isStaff(db: ReturnType<typeof admin>, uid: string) {
  const { data } = await db.from('profiles').select('role, organizer_verified').eq('id', uid).maybeSingle();
  return { admin: data?.role === 'admin', organizer: data?.role === 'admin' || !!data?.organizer_verified };
}

async function upload(req: Request, url: URL, uid: string, db: ReturnType<typeof admin>) {
  const kind = url.searchParams.get('kind');
  const type = baseType(req);

  if (kind === 'kyc') {
    const name = url.searchParams.get('name');
    if (name !== 'id-front.jpg' && name !== 'selfie.jpg') throw new HttpError(400, 'Unknown ID photo');
    if (!IMAGE_TYPES.includes(type)) throw new HttpError(400, 'ID photos must be images');
    const body = await readBody(req, LIMITS.kyc);
    const path = `${uid}/${name}`;
    await putObject('private', `kyc/${path}`, body, type);
    return { path };
  }

  if (kind === 'evidence') {
    const dispute = url.searchParams.get('dispute') || '';
    const file = url.searchParams.get('file') || '';
    if (!UUID.test(dispute) || !/^\d{10,16}(-f\d{1,2})?\.[a-z0-9]{1,5}$/.test(file)) throw new HttpError(400, 'Invalid file');
    const { data: d } = await db.from('match_disputes').select('player1_id, player2_id, status').eq('id', dispute).maybeSingle();
    if (!d || ![d.player1_id, d.player2_id].includes(uid)) throw new HttpError(403, 'Only the players in this match can add evidence');
    if (d.status !== 'collecting') throw new HttpError(400, 'Evidence is closed for this dispute');
    const isVideo = VIDEO_TYPES.includes(type);
    if (!isVideo && !IMAGE_TYPES.includes(type)) throw new HttpError(400, 'Upload a photo or a video');
    const body = await readBody(req, isVideo ? LIMITS.evidenceVideo : LIMITS.evidenceImage);
    const path = `${dispute}/${uid}/${file}`;
    await putObject('private', `evidence/${path}`, body, type);
    return { path };
  }

  if (kind === 'trailer' || kind === 'poster') {
    if (!(await isStaff(db, uid)).organizer) throw new HttpError(403, 'Only Arena and verified organizers can add trailers');
    const isTrailer = kind === 'trailer';
    if (isTrailer ? !['video/mp4', 'video/webm'].includes(type) : !IMAGE_TYPES.includes(type)) {
      throw new HttpError(400, isTrailer ? 'Trailers must be MP4 or WebM videos' : 'Covers must be JPG, PNG or WebP images');
    }
    // A cover belongs to a trailer the same person uploaded (so cleanup removes both)
    let trailerId: string | null = null;
    if (!isTrailer) {
      trailerId = url.searchParams.get('trailer');
      if (!trailerId || !UUID.test(trailerId)) throw new HttpError(400, 'Upload the trailer first');
      const { data: t } = await db.from('media_trailers').select('uploaded_by, poster_key').eq('id', trailerId).is('deleted_at', null).maybeSingle();
      if (!t || (t.uploaded_by !== uid && !(await isStaff(db, uid)).admin)) throw new HttpError(403, 'Not your trailer');
    }
    const body = await readBody(req, isTrailer ? LIMITS.trailer : LIMITS.poster);
    const ext = type.split('/')[1].replace('jpeg', 'jpg');
    const key = `trailers/${crypto.randomUUID()}.${ext}`;
    await putObject('public', key, body, type);
    const fileUrl = publicUrl(key);
    if (!isTrailer) {
      const { data: old } = await db.from('media_trailers').select('poster_key').eq('id', trailerId!).single();
      await db.from('media_trailers').update({ poster_key: key, poster_url: fileUrl }).eq('id', trailerId!);
      if (old?.poster_key) await deleteObject('public', old.poster_key).catch(() => {});
      return { url: fileUrl };
    }
    const title = (url.searchParams.get('title') || '').slice(0, 80) || null;
    const reusable = url.searchParams.get('reusable') === '1';
    const { data, error } = await db.from('media_trailers')
      .insert({ key, url: fileUrl, title, reusable, uploaded_by: uid, size_bytes: body.byteLength })
      .select('id').single();
    if (error) {
      await deleteObject('public', key).catch(() => {});
      throw new Error('Could not save the trailer');
    }
    return { id: data.id, url: fileUrl };
  }

  throw new HttpError(400, 'Unknown upload');
}

/** B2 link, or Supabase Storage for files not copied over yet */
async function linkFor(db: ReturnType<typeof admin>, key: string, oldBucket: string, oldPath: string) {
  if (await headObject('private', key)) return viewUrl(key);
  const { data } = await db.storage.from(oldBucket).createSignedUrl(oldPath, 600);
  return data?.signedUrl || null;
}

async function view(body: { kind?: string; paths?: unknown }, uid: string, db: ReturnType<typeof admin>) {
  const paths = Array.isArray(body.paths) ? body.paths.map(String).slice(0, 30) : [];
  const staff = await isStaff(db, uid);
  const urls: Record<string, string> = {};

  if (body.kind === 'kyc') {
    for (const p of paths) {
      if (p.includes('..') || !(staff.admin || p.startsWith(`${uid}/`))) continue;
      const url = await linkFor(db, `kyc/${p}`, 'kyc-documents', p);
      if (url) urls[p] = url;
    }
    return { urls };
  }

  if (body.kind === 'evidence') {
    const allowed = new Map<string, boolean>();
    for (const p of paths) {
      const dispute = p.split('/')[0];
      if (p.includes('..') || !UUID.test(dispute)) continue;
      if (!allowed.has(dispute)) {
        const { data } = await db.rpc('can_view_dispute', { p_uid: uid, p_dispute: dispute });
        allowed.set(dispute, !!data);
      }
      if (!allowed.get(dispute)) continue;
      const url = await linkFor(db, `evidence/${p}`, 'match-evidence', p);
      if (url) urls[p] = url;
    }
    return { urls };
  }

  throw new HttpError(400, 'Unknown file type');
}

/** Trailers whose tournaments are over (and not kept for reuse) are deleted a day later */
async function cleanup(db: ReturnType<typeof admin>) {
  const { data: rows } = await db.rpc('media_trailers_to_delete');
  let deleted = 0;
  for (const r of (rows || []) as { id: string; key: string; poster_key: string | null }[]) {
    try {
      await deleteObject('public', r.key);
      if (r.poster_key) await deleteObject('public', r.poster_key).catch(() => {});
      await db.from('media_trailers').update({ deleted_at: new Date().toISOString() }).eq('id', r.id);
      deleted++;
    } catch (e) {
      console.error('trailer cleanup failed', r.id, e);
    }
  }

  // ID photos of deleted accounts, once their 7-year retention is over
  let kycDeleted = 0;
  const { data: kyc } = await db.rpc('retained_kyc_to_delete');
  for (const r of (kyc || []) as { id: number; object_keys: string[] }[]) {
    try {
      for (const key of r.object_keys || []) await deleteObject('private', key);
      await db.from('retained_kyc_records').update({ files_deleted_at: new Date().toISOString() }).eq('id', r.id);
      kycDeleted++;
    } catch (e) {
      console.error('retained ID photo cleanup failed', r.id, e);
    }
  }
  return { deleted, kycDeleted };
}

/** Copies existing ID photos and evidence from Supabase Storage into B2 (safe to run again) */
async function migrate(db: ReturnType<typeof admin>) {
  const out = { copied: 0, skipped: 0, failed: 0 };
  const jobs: [string, string][] = [['kyc-documents', 'kyc'], ['match-evidence', 'evidence']];
  for (const [bucket, prefix] of jobs) {
    const { data: objects } = await db.rpc('media_storage_objects', { p_bucket: bucket });
    for (const o of (objects || []) as { name: string; mimetype: string | null }[]) {
      const key = `${prefix}/${o.name}`;
      try {
        if (await headObject('private', key)) {
          out.skipped++;
          continue;
        }
        const { data: file, error } = await db.storage.from(bucket).download(o.name);
        if (error || !file) throw error || new Error('download failed');
        await putObject('private', key, new Uint8Array(await file.arrayBuffer()), o.mimetype || file.type || 'application/octet-stream');
        out.copied++;
      } catch (e) {
        console.error('migrate failed', bucket, o.name, e);
        out.failed++;
      }
    }
  }
  return out;
}

async function selftest() {
  const result: Record<string, string> = {};
  for (const kind of ['private', 'public'] as const) {
    const key = `selftest/${crypto.randomUUID()}.txt`;
    try {
      await putObject(kind, key, new TextEncoder().encode('ok'), 'text/plain');
      const read = await fetch(kind === 'public' ? publicUrl(key) : await presign('private', 'GET', key, 60));
      const anon = kind === 'private' ? (await fetch(`https://${new URL(await presign('private', 'GET', key, 60)).host}/${key}`)).status : null;
      await deleteObject(kind, key);
      result[kind] = `write ok, read ${read.status} (${await read.text()})${anon !== null ? `, without link ${anon}` : ''}, delete ok`;
    } catch (e) {
      result[kind] = `failed: ${(e as Error).message}`;
    }
  }
  return result;
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

  try {
    const url = new URL(req.url);
    const db = admin();

    // Scheduled jobs: the key lives in private.app_secrets ('media_cron'), read with the service role
    const sentKey = req.headers.get('x-cron-key');
    const cronKey = sentKey ? (await db.rpc('_app_secret', { p_name: 'media_cron' })).data : null;
    if (cronKey && sentKey === cronKey) {
      const body = await req.json().catch(() => ({}));
      if (body.action === 'cleanup') return reply(await cleanup(db));
      if (body.action === 'migrate') return reply(await migrate(db));
      if (body.action === 'selftest') return reply(await selftest());
      return reply({ error: 'Unknown action' }, 400);
    }

    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    });
    const { data: auth } = await userClient.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return reply({ error: 'Sign in first' }, 401);

    if (url.searchParams.get('action') === 'upload') {
      const { data: allowed } = await db.rpc('take_rate_limit', { p_key: `media:upload:${uid}`, p_limit: 40, p_window_seconds: 3600 });
      if (allowed === false) return reply({ error: 'Too many uploads. Try again later.' }, 429);
      return reply(await upload(req, url, uid, db));
    }

    const body = await req.json().catch(() => ({}));
    if (body.action === 'view') return reply(await view(body, uid, db));
    if (body.action === 'trailers') {
      if (!(await isStaff(db, uid)).organizer) return reply({ error: 'Not allowed' }, 403);
      const { data } = await db.from('media_trailers').select('id, url, title, poster_url, reusable, created_at').eq('reusable', true).is('deleted_at', null).order('created_at', { ascending: false }).limit(50);
      return reply({ trailers: data || [] });
    }
    return reply({ error: 'Unknown action' }, 400);
  } catch (e) {
    if (e instanceof HttpError) return reply({ error: e.message }, e.status);
    console.error('media error', e);
    return reply({ error: (e as Error).message || 'Something went wrong' }, 500);
  }
});
