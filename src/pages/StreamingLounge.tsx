import { Radio, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/arena/Rail';
import { StreamCard } from '@/components/arena/StreamCard';
import { Button } from '@/components/ui/button';
import { useLiveMatches } from '@/hooks/use-live-streams';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

export default function StreamingLounge() {
  const { matches, loading } = useLiveMatches();
  const [query, setQuery] = useState('');
  const [onlyStreams, setOnlyStreams] = useState(true);
  const [game, setGame] = useState<GameType | null>(null);

  const all = matches || [];
  const games = useMemo(() => [...new Set(all.map((m) => m.game as GameType))].filter((g) => GAME_INFO[g]), [all]);
  const q = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      all.filter(
        (m) =>
          (!onlyStreams || m.streamer) &&
          (!game || m.game === game) &&
          (!q || m.title.toLowerCase().includes(q) || m.players.some((p) => p?.gamertag?.toLowerCase().includes(q))),
      ),
    [all, onlyStreams, game, q],
  );
  const streaming = all.filter((m) => m.streamer).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Streams</h1>
          <p className="text-muted-foreground">
            {loading ? 'Finding live matches…' : `${all.length} live match${all.length === 1 ? '' : 'es'}, ${streaming} streaming on Twitch.`}
          </p>
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-full bg-secondary px-3 text-sm focus-within:ring-2 focus-within:ring-ring sm:w-72">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players or tournaments"
            aria-label="Search streams"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:px-0">
        <button
          type="button"
          onClick={() => setOnlyStreams((v) => !v)}
          aria-pressed={onlyStreams}
          className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold', onlyStreams ? 'border-live/60 bg-live/10 text-foreground' : 'border-border text-muted-foreground')}
        >
          <Radio className="h-4 w-4 text-live" /> Streaming now
        </button>
        {games.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGame(game === g ? null : g)}
            aria-pressed={game === g}
            className={cn('flex h-9 shrink-0 items-center gap-2 rounded-full border pl-1 pr-3.5 text-sm font-semibold', game === g ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground')}
          >
            <img src={GAME_INFO[g].icon} alt="" className="h-7 w-7 rounded-full object-cover" loading="lazy" />
            {GAME_INFO[g].shortName}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-video animate-pulse bg-secondary" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Radio className="h-5 w-5" />}
          title={all.length === 0 ? 'Nothing live right now' : onlyStreams ? 'No one is streaming these matches' : 'No matches found'}
          description={
            all.length === 0
              ? 'Matches show up here the moment both players are ready. Link your Twitch in Settings so others can watch you.'
              : onlyStreams
                ? 'Turn off “Streaming now” to see every live match.'
                : 'Try another player name or game.'
          }
          action={
            all.length > 0 && onlyStreams ? (
              <Button variant="outline" onClick={() => setOnlyStreams(false)}>
                Show all live matches
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/settings">Link your Twitch</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((m) => (
            <StreamCard key={`${m.kind}-${m.id}`} match={m} layout="grid" />
          ))}
        </div>
      )}
    </div>
  );
}
