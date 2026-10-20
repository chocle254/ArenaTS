/** Normalise whatever a player typed (URL, @handle, spaces) into a Twitch login. */
export function twitchLogin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = raw.trim();
  if (v.includes('twitch.tv/')) v = v.split('twitch.tv/').pop()?.split(/[/?#]/)[0] || '';
  v = v.replace(/^@/, '').toLowerCase();
  return /^[a-z0-9_]{3,25}$/.test(v) ? v : null;
}

/** Embed URL for the official Twitch player. `parent` must be this site's hostname. */
export function twitchEmbed(login: string, opts: { muted?: boolean; autoplay?: boolean } = {}): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const params = new URLSearchParams({ channel: login, parent: host, autoplay: String(opts.autoplay ?? true), muted: String(opts.muted ?? false) });
  return `https://player.twitch.tv/?${params.toString()}`;
}
