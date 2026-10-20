import { Eye, Radio, Share2, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { shareLink } from '@/lib/share';
import { twitchEmbed, twitchLogin } from '@/lib/twitch';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

interface Player {
  id: string | null;
  gamertag: string;
  avatar_url: string | null;
  twitch: string | null;
}

interface MatchInfo {
  title: string;
  game: string | null;
  tournamentId: string | null;
  players: Player[];
  finished: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPlayers(ids: (string | null)[], names: string[]): Promise<Player[]> {
  const realIds = ids.filter((x): x is string => !!x);
  let rows: { id: string; gamertag: string | null; avatar_url: string | null; twitch_handle: string | null }[] = [];
  if (realIds.length) {
    const { data } = await supabase.from('profiles').select('id, gamertag, avatar_url, twitch_handle').in('id', realIds);
    rows = data || [];
  } else if (names.some(Boolean)) {
    const { data } = await supabase.from('profiles').select('id, gamertag, avatar_url, twitch_handle').in('gamertag', names.filter(Boolean));
    rows = data || [];
  }
  const slots = realIds.length ? ids : names;
  return slots.map((key, i) => {
    const r = rows.find((p) => (realIds.length ? p.id === key : p.gamertag === key));
    return { id: r?.id ?? null, gamertag: r?.gamertag || names[i] || `Player ${i + 1}`, avatar_url: r?.avatar_url ?? null, twitch: twitchLogin(r?.twitch_handle) };
  });
}

/** Resolves the match from a quick-match id, a match_results id, or a bracket code + tournament id. */
async function loadMatch(matchId: string, params: URLSearchParams): Promise<MatchInfo | null> {
  const kind = params.get('kind');
  const tid = params.get('tid');
  const names = [params.get('p1') || '', params.get('p2') || ''];

  if (kind === 'quick') {
    const { data } = await supabase.from('challenges').select('id, game, challenger_id, opponent_id, status, stake_amount').eq('id', matchId).maybeSingle();
    if (!data) return null;
    return { title: 'Quick match', game: data.game, tournamentId: null, players: await loadPlayers([data.challenger_id, data.opponent_id], names), finished: ['completed', 'cancelled', 'expired', 'declined'].includes(data.status) };
  }

  let q = supabase.from('match_results').select('id, tournament_id, player1_id, player2_id, status, tournaments(name, game)');
  q = UUID.test(matchId) ? q.eq('id', matchId) : tid ? q.eq('tournament_id', tid).eq('match_id', matchId) : q.eq('id', '00000000-0000-0000-0000-000000000000');
  const { data } = await q.maybeSingle();
  if (data) {
    const t = (Array.isArray(data.tournaments) ? data.tournaments[0] : data.tournaments) as { name?: string; game?: string } | null;
    return { title: t?.name || 'Tournament match', game: t?.game || null, tournamentId: data.tournament_id, players: await loadPlayers([data.player1_id, data.player2_id], names), finished: data.status === 'confirmed' };
  }
  // Older links carry only gamertags
  if (names.some(Boolean)) {
    return { title: params.get('tournamentName') || 'Live match', game: params.get('game'), tournamentId: tid, players: await loadPlayers([null, null], names), finished: false };
  }
  return null;
}

export default function LiveStream() {
  const { matchId = '' } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [info, setInfo] = useState<MatchInfo | null | undefined>(undefined);
  const [selected, setSelected] = useState<number | null>(null);
  const [split, setSplit] = useState(false);
  const [watching, setWatching] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInfo(undefined);
    loadMatch(matchId, params)
      .then((m) => !cancelled && setInfo(m))
      .catch((e) => {
        console.error('Error loading stream:', e);
        if (!cancelled) setInfo(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, params.toString()]);

  // Spectators: one presence channel per match, so a join only notifies people watching this match
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase.channel(`spectators:${matchId}`, { config: { presence: { key: user?.id || crypto.randomUUID() } } });
    channel
      .on('presence', { event: 'sync' }, () => setWatching(Object.keys(channel.presenceState()).length))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ at: Date.now() });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user?.id]);

  const streamers = useMemo(() => (info?.players || []).map((p, i) => ({ p, i })).filter((x) => x.p.twitch), [info]);
  const active = selected ?? streamers[0]?.i ?? null;
  const game = info?.game ? GAME_INFO[info.game as GameType] : undefined;
  const canSplit = streamers.length > 1;

  if (info === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-secondary" />
        <div className="aspect-video animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (info === null) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Radio className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h1 className="mt-4 text-3xl">Stream not found</h1>
        <p className="mt-2 text-muted-foreground">This match may have finished or the link is out of date.</p>
        <Button asChild className="mt-6">
          <Link to="/streams">See live streams</Link>
        </Button>
      </div>
    );
  }

  const [a, b] = info.players;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {!info.finished && (
              <span className="flex items-center gap-1 rounded-md bg-live px-1.5 py-0.5 text-[11px] font-bold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
              </span>
            )}
            {game?.name ?? info.game ?? 'Match'}
            {watching !== null && (
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {watching} watching
              </span>
            )}
          </p>
          <h1 className="mt-1 truncate text-3xl sm:text-4xl">
            {a?.gamertag} <span className="text-muted-foreground">vs</span> {b?.gamertag}
          </h1>
          {info.tournamentId ? (
            <Link to={`/tournaments/${info.tournamentId}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary-soft hover:underline">
              <Trophy className="h-4 w-4" /> {info.title}
            </Link>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{info.title}</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => shareLink({ title: `${a?.gamertag} vs ${b?.gamertag}`, text: `Watch ${a?.gamertag} vs ${b?.gamertag} live on Arena`, url: window.location.href })}
        >
          <Share2 /> Share
        </Button>
      </div>

      {streamers.length === 0 ? (
        <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
          <Radio className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-lg font-semibold">Neither player is streaming</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Players add their Twitch channel in Settings. You can still follow the result on the bracket.</p>
          {info.tournamentId && (
            <Button asChild variant="outline" className="mt-5">
              <Link to={`/tournaments/${info.tournamentId}`}>Open the bracket</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Point of view: one player at a time keeps phones smooth; split is optional on large screens */}
          <div className="flex flex-wrap items-center gap-2">
            {info.players.map((p, i) => (
              <button
                key={i}
                type="button"
                disabled={!p.twitch}
                onClick={() => {
                  setSelected(i);
                  setSplit(false);
                }}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full border pl-1 pr-3 text-sm font-semibold disabled:opacity-40',
                  !split && active === i ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground',
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={p.avatar_url || undefined} alt="" />
                  <AvatarFallback className="text-xs">{p.gamertag[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                {p.gamertag}
                {!p.twitch && <span className="text-xs font-normal">(not streaming)</span>}
              </button>
            ))}
            {canSplit && (
              <button
                type="button"
                onClick={() => setSplit((s) => !s)}
                aria-pressed={split}
                className={cn('hidden h-10 rounded-full border px-4 text-sm font-semibold lg:block', split ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground')}
              >
                Both views
              </button>
            )}
          </div>

          <div className={cn('grid gap-3', split && canSplit ? 'lg:grid-cols-2' : 'grid-cols-1')}>
            {(split && canSplit ? streamers : streamers.filter((s) => s.i === active)).map(({ p, i }, k) => (
              <div key={`${p.twitch}-${i}`} className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
                <iframe
                  title={`${p.gamertag} on Twitch`}
                  src={twitchEmbed(p.twitch as string, { muted: split ? k > 0 : false })}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Stream not loading? Firefox’s tracking protection can block Twitch embeds. You can also{' '}
            <a href={`https://www.twitch.tv/${info.players[active ?? 0]?.twitch ?? ''}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-soft hover:underline">
              watch on Twitch
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
