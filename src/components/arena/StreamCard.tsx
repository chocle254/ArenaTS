import { Play, Swords, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type LiveMatch, liveMatchHref } from '@/hooks/use-live-streams';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

export function StreamCard({ match, layout = 'rail' }: { match: LiveMatch; layout?: 'rail' | 'grid' }) {
  const game = GAME_INFO[match.game as GameType];
  const [a, b] = match.players;
  // Game artwork, not Twitch's preview: offline channels get a grey placeholder
  // we can't detect from the page, and art always reads as a match.
  const thumb = game?.banner;

  return (
    <Link
      to={liveMatchHref(match)}
      className={cn(
        'group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50',
        layout === 'rail' ? 'w-[264px] shrink-0 snap-start sm:w-[300px]' : 'w-full',
      )}
    >
      <div className="relative aspect-video bg-black">
        {thumb && (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn('h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]', !match.streamer && 'opacity-60')}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-live px-1.5 py-0.5 text-[11px] font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
        </span>
        {match.streamer && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            <Play className="h-3 w-3 fill-current" /> {match.streamer.twitch}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span className="flex -space-x-2">
            {[a, b].map((p, i) => (
              <Avatar key={i} className="h-7 w-7 ring-2 ring-card">
                <AvatarImage src={p?.avatar_url || undefined} alt="" />
                <AvatarFallback className="text-[10px]">{p?.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
            ))}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {a?.gamertag || 'TBD'} <span className="font-normal text-muted-foreground">vs</span> {b?.gamertag || 'TBD'}
          </p>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {match.kind === 'quick' ? <Swords className="h-3.5 w-3.5 shrink-0" /> : <Trophy className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">
            {match.kind === 'quick' && match.stake ? `${formatArenaCurrency(match.stake)} quick match` : match.title}
            {game ? `, ${game.shortName}` : ''}
          </span>
        </p>
      </div>
    </Link>
  );
}
