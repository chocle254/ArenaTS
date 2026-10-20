import { Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { formatArenaAmount } from '@/lib/arena-currency';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType, type Tournament } from '@/types/database';

function shortDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/**
 * Compact results list for finished and cancelled tournaments: one short row
 * each (about 64px on a phone) where a full banner card would fill the screen.
 */
export function FinishedTournamentList({ tournaments, className }: { tournaments: Tournament[]; className?: string }) {
  const [champions, setChampions] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [...new Set(tournaments.map((t) => t.winner_id).filter(Boolean))] as string[];
    const missing = ids.filter((id) => !(id in champions));
    if (missing.length === 0) return;
    let alive = true;
    supabase
      .from('profiles')
      .select('id, gamertag')
      .in('id', missing)
      .then(({ data }) => {
        if (!alive || !data) return;
        setChampions((prev) => ({ ...prev, ...Object.fromEntries((data as { id: string; gamertag: string | null }[]).map((p) => [p.id, p.gamertag || 'Player'])) }));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournaments]);

  return (
    <ul className={cn('grid gap-2 lg:grid-cols-2', className)}>
      {tournaments.map((t) => {
        const game = GAME_INFO[t.game as GameType];
        const cancelled = t.status === 'cancelled';
        const champ = t.winner_id ? champions[t.winner_id] : null;
        return (
          <li key={t.id}>
            <Link
              to={`/tournaments/${t.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src={game?.icon}
                alt=""
                loading="lazy"
                className={cn('h-11 w-11 shrink-0 rounded-xl object-cover', cancelled && 'grayscale')}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight">{t.name}</p>
                <p className="mt-0.5 flex items-center truncate text-xs text-muted-foreground">
                  {cancelled ? (
                    <span className="text-destructive">Cancelled</span>
                  ) : champ ? (
                    <>
                      <Crown className="mr-1 h-3.5 w-3.5 shrink-0 text-gold" />
                      <span className="truncate font-medium text-foreground">{champ}</span>
                    </>
                  ) : (
                    <span>Finished</span>
                  )}
                  <span className="shrink-0">, {shortDate(t.completed_at || t.start_time)}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn('font-score text-lg font-bold leading-none', cancelled ? 'text-muted-foreground line-through' : 'text-gold')}>
                  {formatArenaAmount(t.prize_pool)}
                  <span className="ml-0.5 text-[11px] font-semibold opacity-70">KES</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t.current_players || 0} players</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
