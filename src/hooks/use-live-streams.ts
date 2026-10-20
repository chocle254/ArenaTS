import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { twitchLogin } from '@/lib/twitch';

export interface StreamPlayer {
  id: string;
  gamertag: string | null;
  avatar_url: string | null;
  wins: number | null;
  twitch: string | null;
}

export interface LiveMatch {
  /** match_results.id for tournaments, challenges.id for quick matches */
  id: string;
  kind: 'tournament' | 'quick';
  game: string;
  title: string;
  tournamentId: string | null;
  players: [StreamPlayer | null, StreamPlayer | null];
  /** The player whose Twitch we feature (best record among those streaming) */
  streamer: StreamPlayer | null;
  stake: number | null;
}

/**
 * One shared, polled snapshot of live matches for the whole app.
 *
 * Every open screen used to subscribe to *all* match changes and refetch on
 * each one, so traffic grew with viewers × matches. Here a single request
 * every 45 s (only while the tab is visible) feeds every component, and
 * concurrent callers share the same in-flight request.
 */
const TTL = 45_000;
let cache: { at: number; data: LiveMatch[] } | null = null;
let inflight: Promise<LiveMatch[]> | null = null;
const listeners = new Set<(d: LiveMatch[]) => void>();

async function load(): Promise<LiveMatch[]> {
  const [tm, qm] = await Promise.all([
    supabase
      .from('match_results')
      .select('id, tournament_id, player1_id, player2_id, status, both_players_ready, tournaments(name, game)')
      .eq('both_players_ready', true)
      .neq('status', 'confirmed')
      .order('updated_at', { ascending: false })
      .limit(40),
    supabase
      .from('challenges')
      .select('id, game, challenger_id, opponent_id, stake_amount, match_started_at, status')
      .eq('status', 'accepted')
      .not('match_started_at', 'is', null)
      .order('match_started_at', { ascending: false })
      .limit(40),
  ]);

  type TRow = { id: string; tournament_id: string; player1_id: string | null; player2_id: string | null; tournaments: { name: string; game: string } | { name: string; game: string }[] | null };
  type QRow = { id: string; game: string; challenger_id: string; opponent_id: string; stake_amount: number };
  const tRows = (tm.data || []) as TRow[];
  const qRows = (qm.data || []) as QRow[];

  const ids = new Set<string>();
  tRows.forEach((r) => [r.player1_id, r.player2_id].forEach((x) => x && ids.add(x)));
  qRows.forEach((r) => [r.challenger_id, r.opponent_id].forEach((x) => x && ids.add(x)));
  if (ids.size === 0) return [];

  const { data: people } = await supabase.from('profiles').select('id, gamertag, avatar_url, wins, twitch_handle').in('id', [...ids]);
  const byId = new Map<string, StreamPlayer>(
    ((people || []) as { id: string; gamertag: string | null; avatar_url: string | null; wins: number | null; twitch_handle: string | null }[]).map((p) => [
      p.id,
      { id: p.id, gamertag: p.gamertag, avatar_url: p.avatar_url, wins: p.wins, twitch: twitchLogin(p.twitch_handle) },
    ]),
  );

  const pick = (a: StreamPlayer | null, b: StreamPlayer | null) => {
    const streaming = [a, b].filter((p): p is StreamPlayer => !!p?.twitch);
    return streaming.sort((x, y) => (y.wins || 0) - (x.wins || 0))[0] || null;
  };

  const list: LiveMatch[] = [
    ...tRows.map((r) => {
      const t = Array.isArray(r.tournaments) ? r.tournaments[0] : r.tournaments;
      const a = r.player1_id ? byId.get(r.player1_id) || null : null;
      const b = r.player2_id ? byId.get(r.player2_id) || null : null;
      return { id: r.id, kind: 'tournament' as const, game: t?.game || '', title: t?.name || 'Tournament match', tournamentId: r.tournament_id, players: [a, b] as [StreamPlayer | null, StreamPlayer | null], streamer: pick(a, b), stake: null };
    }),
    ...qRows.map((r) => {
      const a = byId.get(r.challenger_id) || null;
      const b = byId.get(r.opponent_id) || null;
      return { id: r.id, kind: 'quick' as const, game: r.game, title: 'Quick match', tournamentId: null, players: [a, b] as [StreamPlayer | null, StreamPlayer | null], streamer: pick(a, b), stake: Number(r.stake_amount) || null };
    }),
  ];

  // Best players first: the streamer's record, then the stronger player in the match
  const rank = (m: LiveMatch) => (m.streamer ? 1_000_000 : 0) + Math.max(m.players[0]?.wins || 0, m.players[1]?.wins || 0);
  return list.sort((x, y) => rank(y) - rank(x));
}

function refresh(force = false): Promise<LiveMatch[]> {
  if (!force && cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  inflight = load()
    .then((data) => {
      cache = { at: Date.now(), data };
      listeners.forEach((l) => l(data));
      return data;
    })
    .catch((e) => {
      console.error('Error loading live matches:', e);
      return cache?.data ?? [];
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function liveMatchHref(m: LiveMatch) {
  return `/live/${m.id}?kind=${m.kind}`;
}

export function useLiveMatches() {
  const [data, setData] = useState<LiveMatch[] | null>(cache?.data ?? null);

  useEffect(() => {
    let alive = true;
    const listener = (d: LiveMatch[]) => alive && setData(d);
    listeners.add(listener);
    refresh().then((d) => alive && setData(d));
    const tick = () => document.visibilityState === 'visible' && refresh();
    const t = setInterval(tick, TTL);
    document.addEventListener('visibilitychange', tick);
    return () => {
      alive = false;
      listeners.delete(listener);
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  return { matches: data, loading: data === null, refresh: () => refresh(true) };
}
