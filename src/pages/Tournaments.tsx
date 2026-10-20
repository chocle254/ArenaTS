import { FinishedTournamentList } from '@/components/arena/FinishedTournamentList';
import { CalendarClock, Plus, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/arena/Rail';
import { getTournamentPhase, TournamentCard, TournamentCardSkeleton } from '@/components/arena/TournamentCard';
import { ConsentModal } from '@/components/ConsentModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useJoinTournament } from '@/hooks/use-join-tournament';
import { cn } from '@/lib/utils';
import type { GameType, Tournament } from '@/types/database';
import { GAME_INFO } from '@/types/database';

type TabKey = 'live' | 'upcoming' | 'joined' | 'past';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Open' },
  { key: 'live', label: 'Live' },
  { key: 'joined', label: 'Registered' },
  { key: 'past', label: 'Finished' },
];

const EMPTY: Record<TabKey, { title: string; description: string }> = {
  live: { title: 'Nothing live right now', description: 'Live brackets show up here the moment they start.' },
  upcoming: { title: 'No open tournaments', description: 'New brackets go up throughout the day. You can also host your own.' },
  joined: { title: "You haven't registered yet", description: 'Join an open tournament and it will appear here with its countdown.' },
  past: { title: 'No finished tournaments', description: 'Results and champions appear here once brackets complete.' },
};

export default function Tournaments() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { startJoin, joiningId, consent, setConsent } = useJoinTournament();

  const [all, setAll] = useState<Tournament[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [reminderIds, setReminderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const game = (params.get('game') as GameType | null) || null;
  const tabParam = params.get('tab') as TabKey | null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (tick === 0) setLoading(true);
      // Background status maintenance (.then() makes sure it actually runs)
      supabase
        .rpc('check_and_update_tournament_status')
        .then(() => supabase.rpc('check_and_cancel_insufficient_tournaments'))
        .then(() => undefined, () => undefined);

      const [{ data: tournaments, error }, participants, reminders] = await Promise.all([
        supabase.from('tournaments').select('*').order('start_time', { ascending: false }).limit(200),
        user ? supabase.from('tournament_participants').select('tournament_id').eq('user_id', user.id) : Promise.resolve({ data: [] as { tournament_id: string }[] }),
        user
          ? supabase.from('tournament_reminders').select('tournament_id, reminder_24h, reminder_1h, reminder_15m').eq('user_id', user.id)
          : Promise.resolve({ data: [] as { tournament_id: string; reminder_24h: boolean; reminder_1h: boolean; reminder_15m: boolean }[] }),
      ]);
      if (cancelled) return;
      if (error) console.error('Error fetching tournaments:', error);
      setAll((tournaments || []) as Tournament[]);
      setJoinedIds(new Set((participants.data || []).map((p) => p.tournament_id)));
      setReminderIds(
        new Set((reminders.data || []).filter((r) => r.reminder_24h || r.reminder_1h || r.reminder_15m).map((r) => r.tournament_id)),
      );
      setLoading(false);
    })().catch((e) => {
      console.error('Error fetching tournaments:', e);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, tick]);

  // Refresh after a join completes
  const [prevJoining, setPrevJoining] = useState<string | null>(null);
  useEffect(() => {
    if (prevJoining && !joiningId) setTick((t) => t + 1);
    setPrevJoining(joiningId);
  }, [joiningId]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const list = game ? all.filter((t) => t.game === game) : all;
    const live: Tournament[] = [];
    const upcoming: Tournament[] = [];
    const past: Tournament[] = [];
    for (const t of list) {
      const phase = getTournamentPhase(t);
      if (phase === 'completed' || phase === 'cancelled') past.push(t);
      else if (phase === 'live' || phase === 'starting') live.push(t);
      else upcoming.push(t);
    }
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const joined = list
      .filter((t) => joinedIds.has(t.id) && !['completed', 'cancelled'].includes(getTournamentPhase(t)))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return { live, upcoming, joined, past };
  }, [all, game, joinedIds]);

  // Default to the first tab that has something in it
  const activeTab: TabKey = useMemo(() => {
    if (tabParam && TABS.some((t) => t.key === tabParam)) return tabParam;
    if (groups.live.length) return 'live';
    if (groups.upcoming.length) return 'upcoming';
    if (groups.joined.length) return 'joined';
    return 'upcoming';
  }, [tabParam, groups]);

  const setTab = (key: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  };
  const setGame = (g: GameType | null) => {
    const next = new URLSearchParams(params);
    if (g) next.set('game', g);
    else next.delete('game');
    setParams(next, { replace: true });
  };

  const items = groups[activeTab];
  const gamesWithTournaments = useMemo(() => [...new Set(all.map((t) => t.game as GameType))].filter((g) => GAME_INFO[g]), [all]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Tournaments</h1>
          <p className="text-muted-foreground">Brackets with referees, check-in and real prize pools.</p>
        </div>
        <Button asChild>
          <Link to={`/game/${game || 'codm'}`}>
            <Plus /> Host a tournament
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/60 p-1 scrollbar-hide" role="tablist" aria-label="Tournament status">
          {TABS.filter((t) => t.key !== 'joined' || user).map((t) => {
            const count = groups[t.key].length;
            const selected = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-4',
                  selected ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.key === 'live' && count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-live" />}
                {t.label}
                <span className={cn('font-score text-sm', selected ? 'text-white/80' : 'text-muted-foreground')}>{count}</span>
              </button>
            );
          })}
        </div>

        {gamesWithTournaments.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Filter by game">
            <button
              type="button"
              onClick={() => setGame(null)}
              className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium', !game ? 'border-primary bg-primary/15 text-white' : 'border-border text-muted-foreground')}
            >
              All games
            </button>
            {gamesWithTournaments.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGame(game === g ? null : g)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium',
                  game === g ? 'border-primary bg-primary/15 text-white' : 'border-border text-muted-foreground',
                )}
              >
                <img src={GAME_INFO[g].icon} alt="" className="h-6 w-6 rounded-full object-cover" loading="lazy" />
                {GAME_INFO[g].shortName}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TournamentCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={activeTab === 'past' ? <Trophy className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
          title={EMPTY[activeTab].title}
          description={game ? `${EMPTY[activeTab].description} Try another game or clear the filter.` : EMPTY[activeTab].description}
          action={
            activeTab === 'live' && groups.upcoming.length > 0 ? (
              <Button variant="outline" onClick={() => setTab('upcoming')}>
                See {groups.upcoming.length} open tournament{groups.upcoming.length === 1 ? '' : 's'}
              </Button>
            ) : activeTab === 'joined' || activeTab === 'upcoming' ? (
              <Button asChild variant="outline">
                <Link to={`/game/${game || 'codm'}`}>Host a tournament</Link>
              </Button>
            ) : undefined
          }
        />
      ) : activeTab === 'past' ? (
        <FinishedTournamentList tournaments={items} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              joined={joinedIds.has(t.id)}
              hasReminder={reminderIds.has(t.id)}
              joining={joiningId === t.id}
              onJoin={user ? startJoin : undefined}
            />
          ))}
        </div>
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
