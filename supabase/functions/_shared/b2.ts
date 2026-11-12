// Backblaze B2 (S3-compatible API) client shared by the media and ai-referee functions.
// Secrets (Supabase > Edge Functions > Secrets):
//   B2_PRIVATE_KEY_ID / B2_PRIVATE_APP_KEY  key for the private bucket (ID photos, dispute evidence)
//   B2_PUBLIC_KEY_ID  / B2_PUBLIC_APP_KEY   key for the public bucket (trailers)
// Requests are signed here with AWS Signature V4, so no SDK is needed.

export const B2_ENDPOINT = 's3.us-east-005.backblazeb2.com';
export const B2_REGION = 'us-east-005';

export type BucketKind = 'private' | 'public';

const BUCKETS: Record<BucketKind, string> = {
  private: 'arena-private-media-7k2x',
  public: 'arena-public-media-7k2x',
};

function creds(kind: BucketKind) {
  const prefix = kind === 'private' ? 'B2_PRIVATE' : 'B2_PUBLIC';
  const id = Deno.env.get(`${prefix}_KEY_ID`);
  const secret = Deno.env.get(`${prefix}_APP_KEY`);
  if (!id || !secret) throw new Error('File storage is not configured yet');
  return { id, secret };
}

export function bucketHost(kind: BucketKind) {
  return `${BUCKETS[kind]}.${B2_ENDPOINT}`;
}

/** Public address of a file in the public bucket */
export function publicUrl(key: string) {
  return `https://${bucketHost('public')}/${encodeKey(key)}`;
}

const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(data)));
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** RFC 3986 encoding as S3 expects */
function rfc3986(s: string) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeKey(key: string) {
  return key.split('/').map(rfc3986).join('/');
}

/**
 * A pre-signed URL for one request. Headers passed in `signHeaders` must be
 * sent with exactly these values (used server-side for PUT).
 */
export async function presign(
  kind: BucketKind,
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE',
  key: string,
  expiresSeconds = 600,
  signHeaders: Record<string, string> = {},
): Promise<string> {
  const { id, secret } = creds(kind);
  const host = bucketHost(kind);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // YYYYMMDDTHHMMSSZ
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${B2_REGION}/s3/aws4_request`;

  const headers: Record<string, string> = { host };
  for (const [k, v] of Object.entries(signHeaders)) headers[k.toLowerCase()] = String(v).trim();
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map((k) => `${k}:${headers[k]}\n`).join('');

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${id}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const canonicalQuery = Object.keys(query).sort().map((k) => `${rfc3986(k)}=${rfc3986(query[k])}`).join('&');
  const path = `/${encodeKey(key)}`;

  const canonicalRequest = [method, path, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256Hex(canonicalRequest)].join('\n');

  let k = await hmac(enc.encode(`AWS4${secret}`), date);
  k = await hmac(k, B2_REGION);
  k = await hmac(k, 's3');
  k = await hmac(k, 'aws4_request');
  const signature = hex(await hmac(k, stringToSign));

  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Uploads bytes to a bucket (server-side). */
export async function putObject(kind: BucketKind, key: string, body: Uint8Array, contentType: string) {
  const url = await presign(kind, 'PUT', key, 300, { 'content-type': contentType });
  const res = await fetch(url, { method: 'PUT', body, headers: { 'content-type': contentType } });
  if (!res.ok) {
    console.error('B2 put failed', res.status, (await res.text()).slice(0, 300));
    throw new Error('Could not save the file. Please try again.');
  }
}

/** True if the file exists */
export async function headObject(kind: BucketKind, key: string): Promise<boolean> {
  const res = await fetch(await presign(kind, 'HEAD', key, 120), { method: 'HEAD' });
  return res.ok;
}

export async function deleteObject(kind: BucketKind, key: string) {
  const res = await fetch(await presign(kind, 'DELETE', key, 120), { method: 'DELETE' });
  // S3 answers 204 for deleted and missing files alike
  if (!res.ok && res.status !== 404) {
    console.error('B2 delete failed', res.status, (await res.text()).slice(0, 300));
    throw new Error('Could not delete the file');
  }
}

/** Short-lived link to view a private file */
export function viewUrl(key: string, seconds = 600) {
  return presign('private', 'GET', key, seconds);
}
