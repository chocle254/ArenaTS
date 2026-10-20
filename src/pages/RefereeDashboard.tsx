import { AlertTriangle, CheckCircle2, Clock, Search, ShieldAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/arena/Rail';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { debounce } from '@/lib/debounce';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

type Status = 'pending' | 'confirmed' | 'disputed';

interface Row {
  id: string;
  match_id: string;
  round: number;
  tournament_id: string;
  player1_id: string | null;
  player2_id: string | null;
  player1_reported_winner: string | null;
  player2_reported_winner: string | null;
  status: Status;
  winner_id: string | null;
  admin_override: boolean | null;
  screenshot_url: string | null;
  updated_at: string | null;
  created_at: string;
  tournaments: { name: string; game: GameType } | null;
}

const TABS: { id: Status; label: string; empty: string }[] = [
  { id: 'disputed', label: 'Needs a decision', empty: 'No disputes right now. Matches land here when the two reports disagree.' },
  { id: 'pending', label: 'In progress', empty: 'No matches are being played in your games right now.' },
  { id: 'confirmed', label: 'Decided', empty: 'Decided matches from your games show up here.' },
];

function ago(iso: string | null) {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function RefereeDashboard() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [games, setGames] = useState<GameType[] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status>('disputed');
  const [query, setQuery] = useState('');

  // Which games this official covers (admins cover every game)
  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      setGames([]);
      return;
    }
    supabase
      .from('referee_assignments')
      .select('game')
      .eq('user_id', user.id)
      .then(({ data }) => setGames(((data || []) as { game: GameType }[]).map((r) => r.game)));
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || games === null) return;
    let alive = true;

    const load = async () => {
      let q = supabase
        .from('match_results')
        .select('id, match_id, round, tournament_id, player1_id, player2_id, player1_reported_winner, player2_reported_winner, status, winner_id, admin_override, screenshot_url, updated_at, created_at, tournaments!inner(name, game)')
        .order('updated_at', { ascending: false })
        .limit(300);
      if (!isAdmin) q = q.in('tournaments.game', games.length ? games : ['__none__']);
      const { data, error } = await q;
      if (!alive) return;
      if (error) {
        console.error('Error loading matches:', error);
        setLoading(false);
        return;
      }
      const list = (data || []) as unknown as Row[];
      setRows(list);
      const ids = [...new Set(list.flatMap((r) => [r.player1_id, r.player2_id]).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: people } = await supabase.from('profiles').select('id, gamertag').in('id', ids);
        if (alive) setNames(Object.fromEntries(((people || []) as { id: string; gamertag: string | null }[]).map((p) => [p.id, p.gamertag || 'Player'])));
      }
      setLoading(false);
    };

    load();
    const refetch = debounce(load, 1000, 5000);
    const channel = supabase
      .channel(`referee_matches_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_results' }, () => refetch())
      .subscribe();
    return () => {
      alive = false;
      refetch.cancel();
      supabase.removeChannel(channel);
    };
  }, [user, games, isAdmin]);

  // Matches you're playing in are someone else's call
  const own = useMemo(() => rows.filter((r) => user && (r.player1_id === user.id || r.player2_id === user.id)), [rows, user]);
  const mine = useMemo(() => rows.filter((r) => !own.includes(r)), [rows, own]);
  const counts = useMemo(
    () => ({ disputed: mine.filter((r) => r.status === 'disputed').length, pending: mine.filter((r) => r.status === 'pending').length, confirmed: mine.filter((r) => r.status === 'confirmed').length }),
    [mine],
  );

  const q = query.trim().toLowerCase();
  const list = mine.filter(
    (r) =>
      r.status === tab &&
      (!q ||
        r.tournaments?.name.toLowerCase().includes(q) ||
        [r.player1_id, r.player2_id].some((id) => id && names[id]?.toLowerCase().includes(q))),
  );
  const current = TABS.find((t) => t.id === tab)!;
  const noGames = !isAdmin && games !== null && games.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Referee center</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Every game. Settle disputes and keep brackets moving.'
              : games?.length
                ? `You referee ${games.map((g) => GAME_INFO[g]?.shortName || g).join(', ')}.`
                : 'Settle disputes and keep brackets moving.'}
          </p>
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-full bg-secondary px-3 text-sm focus-within:ring-2 focus-within:ring-ring sm:w-72">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players or tournaments"
            aria-label="Search matches"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors',
              tab === t.id ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span
              className={cn(
                'min-w-5 rounded-full px-1.5 text-center font-score text-xs',
                t.id === 'disputed' && counts.disputed > 0 ? 'bg-live text-white' : 'bg-secondary text-muted-foreground',
              )}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {own.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-card/60 p-3 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {own.length === 1 ? 'One match you are playing in is hidden.' : `${own.length} matches you are playing in are hidden.`} Another referee or an admin decides those.
        </p>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : noGames ? (
        <EmptyState icon={<ShieldAlert className="h-5 w-5" />} title="No games assigned yet" description="An admin assigns the games you referee. Matches from those games will show up here." />
      ) : list.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={q ? 'No matches found' : 'All clear'} description={q ? 'Try another player or tournament name.' : current.empty} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const game = r.tournaments ? GAME_INFO[r.tournaments.game] : null;
            const p1 = r.player1_id ? names[r.player1_id] || 'Player' : 'TBD';
            const p2 = r.player2_id ? names[r.player2_id] || 'Player' : 'TBD';
            const said = (id: string | null) => (id ? (id === r.player1_id ? p1 : p2) : '—');
            return (
              <li key={r.id}>
                <Link
                  to={`/tournaments/${r.tournament_id}?match=${r.match_id}`}
                  className={cn(
                    'group flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    r.status === 'disputed' ? 'border-live/50' : 'border-border',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {game && <img src={game.icon} alt="" className="h-8 w-8 rounded-lg object-cover" loading="lazy" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.tournaments?.name || 'Tournament'}</p>
                      <p className="text-xs text-muted-foreground">Round {r.round}, {ago(r.updated_at || r.created_at)}</p>
                    </div>
                    {r.status === 'disputed' && <AlertTriangle className="h-4 w-4 shrink-0 text-live" aria-label="Disputed" />}
                    {r.status === 'pending' && <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="In progress" />}
                    {r.status === 'confirmed' && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Decided" />}
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-score text-lg font-bold">
                    <span className={cn('truncate', r.winner_id && r.winner_id === r.player1_id && 'text-gold')}>{p1}</span>
                    <span className="text-xs font-semibold text-muted-foreground">VS</span>
                    <span className={cn('truncate text-right', r.winner_id && r.winner_id === r.player2_id && 'text-gold')}>{p2}</span>
                  </div>

                  {r.status === 'disputed' && (
                    <dl className="grid grid-cols-2 gap-2 rounded-xl bg-live/10 p-2.5 text-xs">
                      <div>
                        <dt className="text-muted-foreground">{p1} says</dt>
                        <dd className="font-semibold">{said(r.player1_reported_winner)} won</dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-muted-foreground">{p2} says</dt>
                        <dd className="font-semibold">{said(r.player2_reported_winner)} won</dd>
                      </div>
                    </dl>
                  )}

                  <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <span>{r.screenshot_url ? 'Screenshot attached' : 'No screenshot yet'}</span>
                    <span className="font-semibold text-primary-soft group-hover:text-foreground">
                      {r.status === 'disputed' ? 'Review and decide' : r.status === 'confirmed' ? (r.admin_override ? 'Decided by an official' : 'Both players agreed') : 'Open match'}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
