import { motion, useReducedMotion } from 'framer-motion';
import { Bell, CalendarClock, ChevronRight, Crown, Flame, Share2, Swords, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LevelRing } from '@/components/arena/LevelRing';
import { OnboardingChecklist } from '@/components/arena/OnboardingChecklist';
import { EmptyState, Rail, SectionHeader } from '@/components/arena/Rail';
import { getTournamentPhase, TournamentCard, TournamentCardSkeleton } from '@/components/arena/TournamentCard';
import { ConsentModal } from '@/components/ConsentModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { LiveBadge } from '@/components/ui/live-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useJoinTournament } from '@/hooks/use-join-tournament';
import { usePlayerProgress } from '@/hooks/use-player-progress';
import { formatArenaAmount, formatArenaCurrency, formatEarnings } from '@/lib/arena-currency';
import { recordVisit, type VisitStreak } from '@/lib/progression';
import { shareLink } from '@/lib/share';
import { cn } from '@/lib/utils';
import type { GameType, Tournament } from '@/types/database';
import { GAME_INFO } from '@/types/database';

const GAMES: GameType[] = ['codm', 'efootball', 'pubg_mobile', 'fifa', 'warzone', 'fortnite', 'valorant', 'apex', 'mortal_kombat', 'injustice'];

interface TopPlayer {
  id: string;
  gamertag: string | null;
  avatar_url: string | null;
  wins: number | null;
  total_earnings: number | null;
}

interface Champion {
  tournament: Tournament;
  winner: { id: string; gamertag: string | null; avatar_url: string | null } | null;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Late night grind';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { level } = usePlayerProgress();
  const { startJoin, joiningId, consent, setConsent } = useJoinTournament();
  const reduce = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<Tournament[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Tournament[]>([]);
  const [live, setLive] = useState<Tournament[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [streak, setStreak] = useState<VisitStreak | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const prevJoining = useRef<string | null>(null);

  // Reload once a join attempt finishes so "Registered" and counts are fresh
  useEffect(() => {
    if (prevJoining.current && !joiningId) setRefreshTick((t) => t + 1);
    prevJoining.current = joiningId;
  }, [joiningId]);

  useEffect(() => {
    if (user) setStreak(recordVisit(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // Only show skeletons on first load; refreshes update in place
      if (refreshTick === 0) setLoading(true);
      // Status maintenance runs in the background. (.then() is required:
      // an un-awaited Supabase query builder is never sent.)
      supabase
        .rpc('check_and_update_tournament_status')
        .then(() => supabase.rpc('check_and_cancel_insufficient_tournaments'))
        .then(() => undefined, () => undefined);

      const nowIso = new Date().toISOString();
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString();

      const [participations, upcoming, inPlay, leaders, finished] = await Promise.all([
        supabase.from('tournament_participants').select('tournament_id, tournaments(*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('tournaments').select('*').eq('status', 'open').gt('start_time', nowIso).order('start_time', { ascending: true }).limit(16),
        supabase.from('tournaments').select('*').in('status', ['active', 'open']).lte('start_time', nowIso).order('start_time', { ascending: false }).limit(10),
        supabase.from('profiles').select('id, gamertag, avatar_url, wins, total_earnings').order('total_earnings', { ascending: false }).limit(5),
        supabase.from('tournaments').select('*').eq('status', 'completed').not('winner_id', 'is', null).gte('start_time', since).order('start_time', { ascending: false }).limit(4),
      ]);
      if (cancelled) return;

      const mine = ((participations.data || []) as Array<{ tournament_id: string; tournaments: Tournament | Tournament[] | null }>)
        .map((p) => (Array.isArray(p.tournaments) ? p.tournaments[0] : p.tournaments))
        .filter((t): t is Tournament => !!t);
      setJoinedIds(new Set(((participations.data || []) as Array<{ tournament_id: string }>).map((p) => p.tournament_id)));
      setJoined(mine);

      // "Started but still open" counts as live only within the last 3 hours
      const liveList = ((inPlay.data || []) as Tournament[]).filter(
        (t) => t.status === 'active' || Date.now() - new Date(t.start_time).getTime() < 3 * 3_600_000,
      );
      setLive(liveList);
      setOpen((upcoming.data || []) as Tournament[]);
      setTopPlayers((leaders.data || []) as TopPlayer[]);

      const done = (finished.data || []) as Tournament[];
      if (done.length) {
        const ids = [...new Set(done.map((t) => t.winner_id).filter(Boolean))] as string[];
        const { data: winners } = await supabase.from('profiles').select('id, gamertag, avatar_url').in('id', ids);
        if (!cancelled) {
          setChampions(done.map((t) => ({ tournament: t, winner: (winners || []).find((w) => w.id === t.winner_id) || null })));
        }
      } else {
        setChampions([]);
      }
      setLoading(false);
    })().catch((error) => {
      console.error('Error loading dashboard:', error);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshTick]);

  // Next match: the soonest live or upcoming tournament you're registered for
  const nextUp = useMemo(() => {
    const active = joined.filter((t) => ['live', 'open', 'starting'].includes(getTournamentPhase(t)));
    return active.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null;
  }, [joined]);

  const featured = useMemo(() => {
    if (nextUp) return null;
    return [...open].filter((t) => !joinedIds.has(t.id)).sort((a, b) => Number(b.featured) - Number(a.featured) || b.prize_pool - a.prize_pool)[0] || null;
  }, [nextUp, open, joinedIds]);

  const openSorted = useMemo(() => [...open].sort((a, b) => Number(joinedIds.has(b.id)) - Number(joinedIds.has(a.id))), [open, joinedIds]);

  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* ── Greeting + progress ─────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <HeroMatch
          loading={loading}
          tournament={nextUp || featured}
          isRegistered={!!nextUp}
          onJoin={(t) => startJoin(t)}
          joining={!!featured && joiningId === featured.id}
          name={profile?.gamertag}
          reduceMotion={!!reduce}
        />

        <div className="surface flex flex-col gap-5 p-5">
          <div className="flex items-center gap-4">
            <LevelRing level={level.level} progress={level.progress} size={84} stroke={6}>
              <Avatar className="h-full w-full">
                <AvatarImage src={profile?.avatar_url || ''} alt="" />
                <AvatarFallback className="bg-primary/20 font-score text-2xl">{profile?.gamertag?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
              </Avatar>
            </LevelRing>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Level {level.level}</p>
              <p className="truncate font-score text-2xl leading-tight">{profile?.gamertag || 'Player'}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-score text-sm text-foreground">{level.toNext.toLocaleString()}</span> XP to level {level.level + 1}
              </p>
            </div>
            <Link to="/achievements" className="hidden shrink-0 text-sm font-semibold text-primary-soft hover:underline sm:block">
              Achievements
            </Link>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background/40">
            <div className="p-3 text-center">
              <dt className="text-[11px] text-muted-foreground">Wins</dt>
              <dd className="font-score text-2xl leading-tight">{wins}</dd>
            </div>
            <div className="p-3 text-center">
              <dt className="text-[11px] text-muted-foreground">Win rate</dt>
              <dd className="font-score text-2xl leading-tight">{winRate}%</dd>
            </div>
            <div className="p-3 text-center">
              <dt className="text-[11px] text-muted-foreground">Streak</dt>
              <dd className="flex items-center justify-center gap-1 font-score text-2xl leading-tight">
                {(profile?.current_streak ?? 0) > 1 && <Flame className="h-4 w-4 text-gold" />}
                {profile?.current_streak ?? 0}
              </dd>
            </div>
          </dl>

          {streak && (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Daily visits</span>
                <span className="font-semibold">
                  {streak.current > 1 ? (
                    <span className="text-gold">{streak.current}-day streak</span>
                  ) : (
                    'Come back tomorrow to start a streak'
                  )}
                </span>
              </div>
              <ol className="grid grid-cols-7 gap-1.5" aria-label="Visits in the last 7 days">
                {streak.week.map((d, i) => (
                  <li key={i} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'h-2 w-full rounded-full',
                        d.visited ? (d.isToday ? 'bg-gold' : 'bg-primary') : 'bg-muted',
                      )}
                      title={d.visited ? 'Visited' : 'Missed'}
                    />
                    <span className={cn('text-[10px]', d.isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{d.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      <OnboardingChecklist />

      {/* ── Live now ───────────────────────────────────────── */}
      {live.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Live now"
            icon={<LiveBadge size="sm" className="ml-1 align-middle" />}
            action={<Link to="/streams" className="text-sm font-semibold text-primary-soft hover:underline">Watch streams</Link>}
          />
          <Rail label="Live tournaments">
            {live.map((t) => (
              <TournamentCard key={t.id} tournament={t} layout="rail" joined={joinedIds.has(t.id)} />
            ))}
          </Rail>
        </section>
      )}

      {/* ── Open tournaments ───────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Open for registration"
          description="Lock in your spot before check-in opens."
          action={
            <Link to="/tournaments" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline">
              All tournaments <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />
        {loading ? (
          <Rail label="Loading tournaments">
            {[0, 1, 2, 3].map((i) => (
              <TournamentCardSkeleton key={i} layout="rail" />
            ))}
          </Rail>
        ) : openSorted.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title="No open tournaments right now"
            description="New brackets go up throughout the day. Host your own and invite your squad."
            action={
              <Button asChild>
                <Link to="/game/codm">Create a tournament</Link>
              </Button>
            }
          />
        ) : (
          <Rail label="Open tournaments">
            {openSorted.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                layout="rail"
                joined={joinedIds.has(t.id)}
                joining={joiningId === t.id}
                onJoin={startJoin}
              />
            ))}
          </Rail>
        )}
      </section>

      {/* ── Browse by game ─────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader title="Browse by game" />
        <Rail label="Games">
          {GAMES.map((g) => {
            const info = GAME_INFO[g];
            return (
              <Link
                key={g}
                to={`/game/${g}`}
                className="group interactive-lift relative aspect-[3/4] w-[120px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border sm:w-[148px]"
              >
                <img src={info.banner} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <span className="absolute inset-x-2 bottom-2 text-center font-score text-base leading-tight">{info.name}</span>
              </Link>
            );
          })}
        </Rail>
      </section>

      {/* ── Leaders + champions ────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <SectionHeader
            title="Top earners"
            action={<Link to="/leaderboard" className="text-sm font-semibold text-primary-soft hover:underline">Leaderboard</Link>}
          />
          <ol className="mt-4 space-y-1">
            {topPlayers.length === 0 && !loading && <li className="py-6 text-center text-sm text-muted-foreground">Rankings appear after the first payouts.</li>}
            {topPlayers.map((p, i) => (
              <li key={p.id}>
                <Link to={p.id === user?.id ? '/profile' : `/profile/${p.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]">
                  <span className={cn('w-6 text-center font-score text-lg', i === 0 ? 'text-gold' : 'text-muted-foreground')}>{i + 1}</span>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.avatar_url || ''} alt="" />
                    <AvatarFallback className="bg-primary/20 text-xs">{p.gamertag?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {p.gamertag || 'Player'}
                      {p.id === user?.id && <span className="ml-1.5 text-xs font-normal text-primary-soft">you</span>}
                    </span>
                    <span className="block text-xs text-muted-foreground">{p.wins || 0} wins</span>
                  </span>
                  <span className="font-score text-base text-gold">{formatEarnings(p.total_earnings)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="surface p-5">
          <SectionHeader title="Recent champions" />
          <ul className="mt-4 space-y-2">
            {champions.length === 0 && !loading && (
              <li className="py-6 text-center text-sm text-muted-foreground">No tournaments finished in the last two weeks.</li>
            )}
            {champions.map(({ tournament: t, winner }) => (
              <li key={t.id}>
                <Link to={`/tournaments/${t.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]">
                  <span className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-gold/50">
                      <AvatarImage src={winner?.avatar_url || ''} alt="" />
                      <AvatarFallback className="bg-gold/15 text-gold">{winner?.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <Crown className="absolute -right-1.5 -top-2 h-4 w-4 rotate-12 text-gold" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{winner?.gamertag || 'Champion'}</span>
                    <span className="block truncate text-xs text-muted-foreground">won {t.name}</span>
                  </span>
                  <span className="font-score text-sm text-gold">{formatArenaCurrency(t.prize_pool)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {consent && (
        <ConsentModal
          open={!!consent}
          onOpenChange={(o) => !o && setConsent(null)}
          title={consent.title}
          description={consent.description}
          amount={consent.amount}
          onConfirm={consent.onConfirm}
          loading={!!joiningId}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: your next match as a scoreboard                                */
/* ------------------------------------------------------------------ */

function HeroMatch({
  loading,
  tournament,
  isRegistered,
  onJoin,
  joining,
  name,
  reduceMotion,
}: {
  loading: boolean;
  tournament: Tournament | null;
  isRegistered: boolean;
  onJoin: (t: Tournament) => void;
  joining: boolean;
  name?: string | null;
  reduceMotion: boolean;
}) {
  if (loading) {
    return <div className="surface-raised min-h-[260px] animate-pulse" aria-busy="true" />;
  }

  if (!tournament) {
    return (
      <div className="surface-raised relative flex min-h-[260px] flex-col justify-end overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full" style={{ background: 'radial-gradient(circle, hsl(262 83% 60% / 0.35), transparent 70%)' }} />
        <p className="text-sm text-muted-foreground">{greeting()}{name ? `, ${name}` : ''}</p>
        <h1 className="mt-1 text-4xl leading-none sm:text-5xl">Find your next match</h1>
        <p className="mt-2 max-w-md text-muted-foreground">Challenge someone who is online right now, or start a tournament for your squad.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link to="/quick-match">
              <Swords /> Quick match
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/tournaments">Browse tournaments</Link>
          </Button>
        </div>
      </div>
    );
  }

  const game = GAME_INFO[tournament.game as GameType];
  const phase = getTournamentPhase(tournament);
  const share = () =>
    shareLink({
      title: tournament.name,
      text: `${isRegistered ? "I'm playing in" : 'Join me in'} ${tournament.name} on Arena — ${formatArenaCurrency(tournament.prize_pool)} prize pool.`,
      url: `${window.location.origin}/tournaments/${tournament.id}`,
    });

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-[260px] overflow-hidden rounded-2xl border border-primary/30"
    >
      <img src={game?.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

      <div className="relative flex h-full flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {greeting()}
            {name ? `, ${name}` : ''}
          </p>
          <button
            type="button"
            onClick={share}
            className="flex h-9 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 text-xs font-semibold backdrop-blur-sm hover:bg-black/50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary-soft">
            {isRegistered ? 'Your next match' : 'Featured tournament'}
            {phase === 'live' && <LiveBadge size="sm" />}
          </p>
          <h1 className="max-w-xl text-4xl leading-[0.95] sm:text-5xl">
            <Link to={`/tournaments/${tournament.id}`} className="hover:underline decoration-2 underline-offset-4">
              {tournament.name}
            </Link>
          </h1>
          <p className="text-sm text-muted-foreground">
            {game?.name ?? tournament.game}
            {(tournament.team_size || 1) > 1 ? ` · ${tournament.team_size}v${tournament.team_size}` : ' · Solo'}
            {' · '}
            <Users className="-mt-0.5 inline h-3.5 w-3.5" /> {tournament.current_players}/{tournament.max_players}
          </p>
        </div>

        {/* Scoreboard strip */}
        <div className="mt-auto flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-xs text-muted-foreground">{phase === 'open' ? 'Starts in' : 'Status'}</p>
            <CountdownTimer targetDate={new Date(tournament.start_time)} status={tournament.status} className="text-4xl leading-none sm:text-5xl" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prize pool</p>
            <p className="font-score text-4xl leading-none text-gold sm:text-5xl">
              {formatArenaAmount(tournament.prize_pool)}
              <span className="ml-1 text-lg text-gold/70">AC</span>
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {isRegistered ? (
              <Button asChild size="lg">
                <Link to={`/tournaments/${tournament.id}`}>
                  {phase === 'open' ? (
                    <>
                      <Bell /> Check-in details
                    </>
                  ) : (
                    <>
                      <Trophy /> Open bracket
                    </>
                  )}
                </Link>
              </Button>
            ) : (
              <Button size="lg" onClick={() => onJoin(tournament)} disabled={joining}>
                {joining ? 'Joining…' : (tournament.entry_fee || 0) > 0 ? `Join · ${formatArenaCurrency(tournament.entry_fee)}` : 'Join free'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
