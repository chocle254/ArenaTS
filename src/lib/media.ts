import { supabase } from '@/db/supabase';

/**
 * Files on Backblaze B2, through the `media` edge function (it checks who may
 * upload or view what, and holds the B2 keys). Avatars stay in Supabase.
 */

type UploadKind = 'kyc' | 'evidence' | 'trailer' | 'poster';

async function token() {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error('Sign in first');
  return t;
}

function endpoint(params?: Record<string, string>) {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media`);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  return url.toString();
}

async function call<T>(url: string, init: RequestInit): Promise<T> {
  // window.fetch: skips the dev proxy that rewrites Supabase URLs (see lib/edge-function.ts)
  const res = await window.fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Upload failed (${res.status})`);
  return body as T;
}

/** Uploads one file. Returns what the server stored (a path for private files, a url for trailers). */
export async function uploadMedia<T = { path?: string; url?: string; id?: string }>(
  kind: UploadKind,
  file: Blob,
  params: Record<string, string> = {},
): Promise<T> {
  return call<T>(endpoint({ action: 'upload', kind, ...params }), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await token()}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
}

/** 10-minute links to private files the signed-in user may see. Missing entries = not allowed. */
export async function viewLinks(kind: 'kyc' | 'evidence', paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { urls } = await call<{ urls: Record<string, string> }>(endpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await token()}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'view', kind, paths }),
  });
  return urls || {};
}

export interface LibraryTrailer {
  id: string;
  url: string;
  title: string | null;
  poster_url: string | null;
}

/** Trailers kept for reuse (Arena and verified organizers) */
export async function reusableTrailers(): Promise<LibraryTrailer[]> {
  const { trailers } = await call<{ trailers: LibraryTrailer[] }>(endpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await token()}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'trailers' }),
  });
  return trailers || [];
}
