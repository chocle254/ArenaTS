import { motion, useReducedMotion } from 'framer-motion';
import { Crown, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/arena/Rail';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatCompactNumber, formatEarnings } from '@/lib/arena-currency';
import { getLevelInfo } from '@/lib/progression';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database';

type Board = 'earnings' | 'wins' | 'streak';

const BOARDS: { key: Board; label: string; column: string; describe: string }[] = [
  { key: 'earnings', label: 'Top earners', column: 'total_earnings', describe: 'Lifetime prize money won on Arena.' },
  { key: 'wins', label: 'Most wins', column: 'wins', describe: 'Total match wins across quick matches and tournaments.' },
  { key: 'streak', label: 'Hot streaks', column: 'current_streak', describe: 'Players on the longest active win streak.' },
];

const COLUMNS = 'id, gamertag, avatar_url, role, wins, losses, total_earnings, current_streak, tournaments_played';

type Row = Pick<Profile, 'id' | 'gamertag' | 'avatar_url' | 'role' | 'wins' | 'losses' | 'total_earnings' | 'current_streak' | 'tournaments_played'>;

function metric(board: Board, p: Row): { value: string; className?: string } {
  if (board === 'earnings') return { value: formatEarnings(p.total_earnings), className: 'text-gold' };
  if (board === 'wins') return { value: `${formatCompactNumber(p.wins || 0)} W` };
  return { value: `${p.current_streak || 0} 🔥` };
}

const PODIUM = {
  1: { ring: 'ring-gold', bar: 'from-gold/60 to-gold/5', h: 'h-28 md:h-36', label: 'text-gold' },
  2: { ring: 'ring-slate-300', bar: 'from-slate-300/40 to-slate-300/5', h: 'h-20 md:h-24', label: 'text-slate-200' },
  3: { ring: 'ring-amber-600', bar: 'from-amber-600/50 to-amber-600/5', h: 'h-14 md:h-16', label: 'text-amber-500' },
} as const;

export default function Leaderboard() {
  const { user, profile } = useAuth();
  const reduceMotion = useReducedMotion();
  const [board, setBoard] = useState<Board>('earnings');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  const config = BOARDS.find((b) => b.key === board)!;

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setMyRank(null);
    supabase
      .from('profiles')
      .select(COLUMNS)
      .order(config.column, { ascending: false, nullsFirst: false })
      .order('wins', { ascending: false, nullsFirst: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Error fetching leaderboard:', error);
        setRows(((data as Row[]) || []).filter((r) => board !== 'streak' || (r.current_streak || 0) > 0));
      });
    return () => {
      cancelled = true;
    };
  }, [board, config.column]);

  // Where the signed-in player stands when they're outside the top 50
  useEffect(() => {
    if (!rows || !user || !profile || rows.some((r) => r.id === user.id)) return;
    const mine = Number((profile as unknown as Record<string, unknown>)[config.column]) || 0;
    if (mine <= 0) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gt(config.column, mine)
      .then(({ count }) => {
        if (!cancelled && typeof count === 'number') setMyRank(count + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [rows, user, profile, config.column]);

  const podium = useMemo(() => (rows || []).slice(0, 3), [rows]);
  const rest = useMemo(() => (rows || []).slice(3), [rows]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Leaderboard</h1>
          <p className="text-muted-foreground">{config.describe}</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/60 p-1 scrollbar-hide sm:w-fit" role="tablist" aria-label="Leaderboard">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            type="button"
            role="tab"
            aria-selected={board === b.key}
            onClick={() => setBoard(b.key)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none',
              board === b.key ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="space-y-3">
          <Skeleton className="h-56 w-full rounded-2xl" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Trophy className="h-5 w-5" />} title="Nobody here yet" description="Win a match to put your name on the board." />
      ) : (
        <>
          {/* Podium: 2 · 1 · 3 */}
          <section className="surface overflow-hidden px-3 pt-6 md:px-8" aria-label="Top three">
            <div className="grid grid-cols-3 items-end gap-2 md:gap-6">
              {[podium[1], podium[0], podium[2]].map((p, i) => {
                if (!p) return <div key={`empty-${i}`} />;
                const rank = (i === 1 ? 1 : i === 0 ? 2 : 3) as 1 | 2 | 3;
                const style = PODIUM[rank];
                const m = metric(board, p);
                return (
                  <motion.div
                    key={p.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rank === 1 ? 0.25 : rank === 2 ? 0.1 : 0.4, type: 'spring', damping: 20 }}
                    className="flex min-w-0 flex-col items-center"
                  >
                    <Link to={`/profile/${p.id}`} className="group flex min-w-0 max-w-full flex-col items-center text-center">
                      {rank === 1 && <Crown className="mb-1 h-6 w-6 text-gold" aria-hidden />}
                      <Avatar className={cn('ring-2 ring-offset-2 ring-offset-card', style.ring, rank === 1 ? 'h-20 w-20 md:h-24 md:w-24' : 'h-14 w-14 md:h-20 md:w-20')}>
                        <AvatarImage src={p.avatar_url || undefined} alt="" />
                        <AvatarFallback className="font-score text-xl">{p.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="mt-2 w-full truncate font-score text-base font-bold group-hover:text-primary-soft md:text-xl">{p.gamertag || 'Player'}</span>
                      <span className={cn('font-score text-lg font-bold md:text-2xl', m.className)}>{m.value}</span>
                    </Link>
                    <div className={cn('mt-3 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b pt-2', style.bar, style.h)}>
                      <span className={cn('font-score text-3xl font-bold md:text-4xl', style.label)}>{rank}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {rest.length > 0 && (
            <ol className="space-y-2" start={4}>
              {rest.map((p, idx) => (
                <LeaderRow key={p.id} rank={idx + 4} player={p} board={board} isMe={p.id === user?.id} />
              ))}
            </ol>
          )}

          {myRank && profile && (
            <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4">
              <LeaderRow rank={myRank} player={profile as unknown as Row} board={board} isMe />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LeaderRow({ rank, player, board, isMe }: { rank: number; player: Row; board: Board; isMe?: boolean }) {
  const m = metric(board, player);
  const level = getLevelInfo(player).level;
  return (
    <li className="list-none">
      <Link
        to={`/profile/${player.id}`}
        className={cn(
          'flex items-center gap-3 rounded-xl border p-3 transition-colors',
          isMe ? 'border-primary/60 bg-primary/15 backdrop-blur' : 'border-border bg-card/70 hover:border-primary/40',
        )}
      >
        <span className="w-8 shrink-0 text-center font-score text-lg font-bold text-muted-foreground">{rank}</span>
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={player.avatar_url || undefined} alt="" />
          <AvatarFallback className="font-score">{player.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {player.gamertag || 'Player'}
            {isMe && <span className="ml-2 text-xs font-normal text-primary-soft">You</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Level {level}, {formatCompactNumber(player.wins || 0)}W {formatCompactNumber(player.losses || 0)}L
          </p>
        </div>
        <span className={cn('shrink-0 font-score text-lg font-bold', m.className)}>{m.value}</span>
      </Link>
    </li>
  );
}
