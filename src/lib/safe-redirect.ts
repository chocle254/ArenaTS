/**
 * Returns a same-origin path from a ?next= value, or the fallback.
 * Rejects absolute URLs and protocol-relative paths (open-redirect protection).
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/^\/(sign-in|sign-up|auth\/callback)(\/|\?|$)/.test(value)) return fallback;
  return value;
}
