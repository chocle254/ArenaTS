import { useReducedMotion } from 'framer-motion';
import { livePrizePool } from '@/lib/prize';
import { CalendarClock, ChevronRight, Plus, Radio, Swords, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { OnboardingChecklist } from '@/components/arena/OnboardingChecklist';
import { EmptyState, Rail, SectionHeader } from '@/components/arena/Rail';
import { StreamCard } from '@/components/arena/StreamCard';
import { getTournamentPhase, TournamentCard, TournamentCardSkeleton } from '@/components/arena/TournamentCard';
import { ConsentModal } from '@/components/ConsentModal';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useJoinTournament } from '@/hooks/use-join-tournament';
import { useLiveMatches } from '@/hooks/use-live-streams';
import { formatArenaAmount, formatArenaCurrency } from '@/lib/arena-currency';
import { recordVisit } from '@/lib/progression';
import { cn } from '@/lib/utils';
import type { GameType, Tournament } from '@/types/database';
import { GAME_INFO } from '@/types/database';

export default function Dashboard() {
  const { user } = useAuth();
  const { startJoin, joiningId, consent, setConsent } = useJoinTournament();
  const { matches: liveMatches } = useLiveMatches();

  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<Tournament[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Tournament[]>([]);
  const [live, setLive] = useState<Tournament[]>([]);
  const [gameFilter, setGameFilter] = useState<GameType | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const prevJoining = useRef<string | null>(null);

  // Reload once a join attempt finishes so "Registered" and counts are fresh
  useEffect(() => {
    if (prevJoining.current && !joiningId) setRefreshTick((t) => t + 1);
    prevJoining.current = joiningId;
  }, [joiningId]);

  useEffect(() => {
    if (user) recordVisit(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (refreshTick === 0) setLoading(true);
      // Background status maintenance (.then() is required or the request is never sent)
      supabase
        .rpc('check_and_update_tournament_status')
        .then(() => supabase.rpc('check_and_cancel_insufficient_tournaments'))
        .then(() => undefined, () => undefined);

      const nowIso = new Date().toISOString();
      const [participations, upcoming, inPlay] = await Promise.all([
        supabase.from('tournament_participants').select('tournament_id, tournaments(*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('tournaments').select('*').eq('status', 'open').gt('start_time', nowIso).order('start_time', { ascending: true }).limit(30),
        supabase.from('tournaments').select('*').in('status', ['active', 'open']).lte('start_time', nowIso).order('start_time', { ascending: false }).limit(12),
      ]);
      if (cancelled) return;

      const rows = (participations.data || []) as Array<{ tournament_id: string; tournaments: Tournament | Tournament[] | null }>;
      setJoinedIds(new Set(rows.map((p) => p.tournament_id)));
      setJoined(rows.map((p) => (Array.isArray(p.tournaments) ? p.tournaments[0] : p.tournaments)).filter((t): t is Tournament => !!t));
      setLive(((inPlay.data || []) as Tournament[]).filter((t) => t.status === 'active' || Date.now() - new Date(t.start_time).getTime() < 3 * 3_600_000));
      setOpen((upcoming.data || []) as Tournament[]);
      setLoading(false);
    })().catch((error) => {
      console.error('Error loading home:', error);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshTick]);

  // Your soonest registered match that hasn't finished
  const nextUp = useMemo(
    () =>
      joined
        .filter((t) => ['live', 'open', 'starting'].includes(getTournamentPhase(t)))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null,
    [joined],
  );

  // Promoted tournaments: admin-featured first, then the biggest prize pools
  const featured = useMemo(
    () => [...open].filter((t) => !joinedIds.has(t.id)).sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.prize_pool) - Number(a.prize_pool)).slice(0, 5),
    [open, joinedIds],
  );

  const gamesWithOpen = useMemo(() => [...new Set(open.map((t) => t.game as GameType))].filter((g) => GAME_INFO[g]), [open]);
  const upcoming = useMemo(() => (gameFilter ? open.filter((t) => t.game === gameFilter) : open), [open, gameFilter]);
  const streams = useMemo(() => (liveMatches || []).filter((m) => m.streamer).slice(0, 12), [liveMatches]);
  const liveMatchCount = liveMatches?.length ?? 0;

  return (
    <div className="space-y-9">
      <h1 className="sr-only">Home</h1>

      {nextUp && <NextMatch tournament={nextUp} />}

      <FeaturedCarousel loading={loading} tournaments={featured} onJoin={startJoin} joiningId={joiningId} />

      <OnboardingChecklist />

      {/* Live on Twitch: the best players in matches right now */}
      {(streams.length > 0 || liveMatchCount > 0) && (
        <section className="space-y-4">
          <SectionHeader
            title="Live on Twitch"
            description={streams.length ? 'Top players in matches right now.' : `${liveMatchCount} match${liveMatchCount === 1 ? '' : 'es'} in progress. Nobody is streaming yet.`}
            icon={<Radio className="ml-1 inline h-5 w-5 text-live" />}
            action={
              <Link to="/streams" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline">
                All streams <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
          {streams.length > 0 && (
            <Rail label="Live streams">
              {streams.map((m) => (
                <StreamCard key={`${m.kind}-${m.id}`} match={m} />
              ))}
            </Rail>
          )}
        </section>
      )}

      {/* Upcoming tournaments */}
      <section className="space-y-4">
        <SectionHeader
          title="Upcoming tournaments"
          description="Register before check-in opens."
          action={
            <Link to="/tournaments?tab=upcoming" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline">
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />
        {gamesWithOpen.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:px-0" role="tablist" aria-label="Filter by game">
            <button
              type="button"
              role="tab"
              aria-selected={!gameFilter}
              onClick={() => setGameFilter(null)}
              className={cn('h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold', !gameFilter ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground')}
            >
              All games
            </button>
            {gamesWithOpen.map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={gameFilter === g}
                onClick={() => setGameFilter(gameFilter === g ? null : g)}
                className={cn(
                  'flex h-9 shrink-0 items-center gap-2 rounded-full border pl-1 pr-3.5 text-sm font-semibold',
                  gameFilter === g ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground',
                )}
              >
                <img src={GAME_INFO[g].icon} alt="" className="h-7 w-7 rounded-full object-cover" loading="lazy" />
                {GAME_INFO[g].shortName}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <Rail label="Loading tournaments">
            {[0, 1, 2, 3].map((i) => (
              <TournamentCardSkeleton key={i} layout="rail" />
            ))}
          </Rail>
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title={gameFilter ? `No upcoming ${GAME_INFO[gameFilter].shortName} tournaments` : 'No upcoming tournaments yet'}
            description="New brackets go up throughout the day. You can also host your own and invite your squad."
            action={
              <Button asChild>
                <Link to={`/game/${gameFilter || 'codm'}`}>
                  <Plus /> Host a tournament
                </Link>
              </Button>
            }
          />
        ) : (
          <Rail label="Upcoming tournaments">
            {upcoming.map((t) => (
              <TournamentCard key={t.id} tournament={t} layout="rail" joined={joinedIds.has(t.id)} joining={joiningId === t.id} onJoin={startJoin} />
            ))}
          </Rail>
        )}
      </section>

      {/* Happening now */}
      {live.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Happening now"
            description="Brackets in progress. Follow along live."
            action={
              <Link to="/tournaments?tab=live" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline">
                See all <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
          <Rail label="Live tournaments">
            {live.map((t) => (
              <TournamentCard key={t.id} tournament={t} layout="rail" joined={joinedIds.has(t.id)} />
            ))}
          </Rail>
        </section>
      )}

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
/* Your next match: a compact, always-first reminder                   */
/* ------------------------------------------------------------------ */

function NextMatch({ tournament }: { tournament: Tournament }) {
  const game = GAME_INFO[tournament.game as GameType];
  const phase = getTournamentPhase(tournament);
  return (
    <Link
      to={`/tournaments/${tournament.id}`}
      className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3 transition-colors hover:bg-primary/15"
    >
      <img src={game?.icon} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-primary-soft">{phase === 'live' ? 'You’re playing now' : 'Your next match'}</p>
        <p className="truncate font-semibold">{tournament.name}</p>
      </div>
      <div className="shrink-0 text-right">
        <CountdownTimer targetDate={new Date(tournament.start_time)} status={tournament.status} className="text-xl leading-none" />
        <p className="mt-0.5 text-[11px] text-muted-foreground">{phase === 'open' ? 'Check-in opens 15 min before' : 'Open the bracket'}</p>
      </div>
      <ChevronRight className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Featured tournaments: the promo box                                 */
/* ------------------------------------------------------------------ */

function FeaturedCarousel({
  loading,
  tournaments,
  onJoin,
  joiningId,
}: {
  loading: boolean;
  tournaments: Tournament[];
  onJoin: (t: Tournament) => void;
  joiningId: string | null;
}) {
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const count = tournaments.length;

  const goTo = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);

  // Track which slide is showing as the player swipes
  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  // Auto-advance every 7 s unless the player is interacting or prefers less motion
  useEffect(() => {
    if (count < 2 || reduce) return;
    const t = setInterval(() => {
      if (paused.current || document.visibilityState !== 'visible') return;
      goTo((index + 1) % count);
    }, 7000);
    return () => clearInterval(t);
  }, [count, index, goTo, reduce]);

  if (loading) return <div className="h-[230px] animate-pulse rounded-3xl bg-card sm:h-[280px]" aria-busy="true" />;

  if (count === 0) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8" aria-label="Get started">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <p className="text-sm font-semibold text-primary-soft">Be the first today</p>
        <h2 className="mt-1 max-w-lg text-4xl leading-[0.95] sm:text-5xl">Host a tournament or jump into a 1v1</h2>
        <p className="mt-2 max-w-md text-muted-foreground">No open brackets right now. Start one for your squad, or challenge someone who is online.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link to="/game/codm">
              <Plus /> Host a tournament
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/quick-match">
              <Swords /> Quick match
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured tournaments"
      className="relative"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <div ref={scroller} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl scrollbar-hide">
        {tournaments.map((t, i) => {
          const game = GAME_INFO[t.game as GameType];
          const fee = Number(t.entry_fee) || 0;
          const spotsLeft = Math.max(0, (t.max_players || 0) - (t.current_players || 0));
          return (
            <article
              key={t.id}
              className="relative h-[250px] w-full shrink-0 snap-center overflow-hidden rounded-3xl border border-border sm:h-[280px]"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${t.name}`}
            >
              <img src={game?.banner} alt="" className="absolute inset-0 h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              <div className="relative flex h-full flex-col p-5 sm:p-7">
                <p className="flex items-center gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-gold/15 px-2 py-0.5 text-gold">{t.featured ? 'Featured' : i === 0 ? 'Biggest prize' : 'Coming up'}</span>
                  <span className="text-muted-foreground">
                    {game?.name ?? t.game}, {(t.team_size || 1) > 1 ? `${t.team_size}v${t.team_size}` : 'solo'}
                  </span>
                </p>
                <h2 className="mt-2 max-w-[18ch] text-3xl leading-[0.95] sm:max-w-xl sm:text-5xl">
                  <Link to={`/tournaments/${t.id}`} className="hover:underline decoration-2 underline-offset-4">
                    {t.name}
                  </Link>
                </h2>
                <div className="mt-auto flex flex-wrap items-end gap-x-6 gap-y-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Prize pool</p>
                    <p className="font-score text-3xl font-bold leading-none text-gold sm:text-4xl">
                      {formatArenaAmount(livePrizePool(t))}
                      <span className="ml-1 text-base text-gold/70">KES</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Starts in</p>
                    <CountdownTimer targetDate={new Date(t.start_time)} status={t.status} className="text-3xl leading-none sm:text-4xl" />
                  </div>
                  <p className="flex items-center gap-1 pb-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left
                  </p>
                  <div className="ml-auto flex gap-2">
                    <Button asChild variant="outline" className="hidden bg-background/40 backdrop-blur sm:inline-flex">
                      <Link to={`/tournaments/${t.id}`}>Details</Link>
                    </Button>
                    <Button onClick={() => onJoin(t)} disabled={joiningId === t.id || spotsLeft === 0}>
                      {joiningId === t.id ? 'Joining…' : spotsLeft === 0 ? 'Full' : fee > 0 ? `Join for ${formatArenaCurrency(fee)}` : 'Join free'}
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Choose featured tournament">
          {tournaments.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={index === i}
              aria-label={`Show ${t.name}`}
              onClick={() => goTo(i)}
              className={cn('h-1.5 rounded-full transition-all', index === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground')}
            />
          ))}
        </div>
      )}
    </section>
  );
}
