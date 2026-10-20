import { Bell, Check, Loader2, Users } from 'lucide-react';
import { isSliding, livePrizePool } from '@/lib/prize';
import type React from 'react';
import { Link } from 'react-router-dom';
import { LiveBadge } from '@/components/ui/live-badge';
import { formatArenaAmount } from '@/lib/arena-currency';
import { cn, formatTimeUntil } from '@/lib/utils';
import type { GameType, Tournament } from '@/types/database';
import { GAME_INFO } from '@/types/database';

export type TournamentPhase = 'live' | 'open' | 'starting' | 'completed' | 'cancelled';

export function getTournamentPhase(t: Pick<Tournament, 'status' | 'start_time'>): TournamentPhase {
  if (t.status === 'cancelled') return 'cancelled';
  if (t.status === 'completed') return 'completed';
  if (t.status === 'active' || t.status === 'live') return 'live';
  if (t.status === 'open' && new Date(t.start_time).getTime() <= Date.now()) return 'starting';
  return 'open';
}

interface TournamentCardProps {
  tournament: Tournament;
  joined?: boolean;
  hasReminder?: boolean;
  joining?: boolean;
  onJoin?: (tournament: Tournament) => void;
  /** Width behaviour: 'rail' for horizontal scrollers, 'grid' fills its cell */
  layout?: 'rail' | 'grid';
  className?: string;
}

export function TournamentCard({
  tournament,
  joined = false,
  hasReminder = false,
  joining = false,
  onJoin,
  layout = 'grid',
  className,
}: TournamentCardProps) {
  const game = GAME_INFO[tournament.game as GameType];
  const phase = getTournamentPhase(tournament);
  const max = Math.max(1, tournament.max_players || 1);
  const filled = Math.min(1, (tournament.current_players || 0) / max);
  const isFull = (tournament.current_players || 0) >= max;
  const ended = phase === 'completed' || phase === 'cancelled';
  const canJoin = phase === 'open' && !joined && !!onJoin;
  const teamSize = tournament.team_size || 1;

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJoin?.(tournament);
  };

  return (
    <article
      className={cn(
        'group surface interactive-lift relative flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-ring',
        layout === 'rail' ? 'w-[260px] shrink-0 snap-start sm:w-[280px]' : 'w-full',
        ended && 'opacity-70',
        className,
      )}
    >
      {/* Banner */}
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
        {game?.banner && (
          <img
            src={game.banner}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn(
              'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105',
              phase === 'cancelled' && 'grayscale',
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {game?.shortName ?? tournament.game}
            {teamSize > 1 && <span className="text-white/70"> · {teamSize}v{teamSize}</span>}
          </span>
          {phase === 'live' && <LiveBadge size="sm" className="bg-black/55 backdrop-blur-sm" />}
          {phase === 'starting' && (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">Starting</span>
          )}
          {phase === 'cancelled' && (
            <span className="rounded-full bg-destructive/90 px-2.5 py-1 text-[11px] font-semibold text-white">Cancelled</span>
          )}
          {phase === 'completed' && (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-sm">Finished</span>
          )}
          {phase === 'open' && hasReminder && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm" title="Reminder on">
              <Bell className="h-3.5 w-3.5 text-white" />
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-1">
        <h3 className="line-clamp-2 min-h-[2.5em] text-xl leading-tight">
          {/* Stretched link: the whole card is clickable, the join button stays a separate control */}
          <Link to={`/tournaments/${tournament.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {tournament.name}
          </Link>
        </h3>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{isSliding(tournament) ? 'Prize pool, growing' : 'Prize pool'}</p>
            <p className="font-score text-3xl leading-none text-gold">
              {formatArenaAmount(livePrizePool(tournament))}
              <span className="ml-1 text-sm text-gold/70">KES</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Entry</p>
            <p className="font-score text-lg leading-none">
              {(tournament.entry_fee || 0) > 0 ? (
                <>
                  {formatArenaAmount(tournament.entry_fee)}
                  <span className="ml-1 text-xs text-muted-foreground">KES</span>
                </>
              ) : (
                'Free'
              )}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="font-score text-sm text-foreground">
                {tournament.current_players || 0}/{tournament.max_players}
              </span>
              {isFull && phase === 'open' && <span>· standby</span>}
            </span>
            <span>
              {phase === 'open' ? (
                <>
                  Starts in <span className="font-score text-sm text-foreground">{formatTimeUntil(tournament.start_time)}</span>
                </>
              ) : phase === 'live' ? (
                'In progress'
              ) : phase === 'starting' ? (
                'Bracket forming'
              ) : (
                new Date(tournament.start_time).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
              )}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className={cn('h-full rounded-full', isFull ? 'bg-gold' : 'bg-primary')}
              style={{ width: `${Math.max(4, filled * 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-auto">
          {joined ? (
            <div className="flex h-10 items-center justify-center gap-2 rounded-lg bg-success/15 text-sm font-semibold text-success">
              <Check className="h-4 w-4" />
              Registered
            </div>
          ) : canJoin ? (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="relative z-10 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {joining && <Loader2 className="h-4 w-4 animate-spin" />}
              {joining ? 'Joining…' : teamSize > 1 ? 'Register team' : isFull ? 'Join standby' : 'Join tournament'}
            </button>
          ) : (
            <div className="flex h-10 items-center justify-center rounded-lg border border-border text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
              {phase === 'live' || phase === 'starting' ? 'Watch bracket' : 'View results'}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function TournamentCardSkeleton({ layout = 'grid' }: { layout?: 'rail' | 'grid' }) {
  return (
    <div className={cn('surface overflow-hidden', layout === 'rail' ? 'w-[260px] shrink-0 sm:w-[280px]' : 'w-full')}>
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
      <div className="space-y-4 p-4">
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="flex justify-between">
          <div className="h-8 w-24 rounded bg-muted" />
          <div className="h-6 w-12 rounded bg-muted" />
        </div>
        <div className="h-1.5 rounded bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
