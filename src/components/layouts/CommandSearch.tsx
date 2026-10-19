import { Command as CommandPrimitive } from 'cmdk';
import { Loader2, Search, Trophy, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useDebounce } from '@/hooks/use-debounce';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { formatTimeUntil } from '@/lib/utils';
import type { GameType } from '@/types/database';
import { GAME_INFO } from '@/types/database';
import type { NavItem } from './nav-config';

interface PlayerHit {
  id: string;
  gamertag: string | null;
  avatar_url: string | null;
  wins: number | null;
}

interface TournamentHit {
  id: string;
  name: string;
  game: string;
  prize_pool: number;
  start_time: string;
  status: string;
}

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: NavItem[];
}

/** Escape PostgREST/LIKE wildcards so the search matches literally. */
const likeSafe = (q: string) => q.replace(/[%_\\]/g, (m) => `\\${m}`);

export function CommandSearch({ open, onOpenChange, pages }: CommandSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 250);
  const [players, setPlayers] = useState<PlayerHit[]>([]);
  const [tournaments, setTournaments] = useState<TournamentHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (debounced.length < 2) {
      setPlayers([]);
      setTournaments([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const pattern = `%${likeSafe(debounced)}%`;
    Promise.all([
      supabase.from('profiles').select('id, gamertag, avatar_url, wins').ilike('gamertag', pattern).limit(5),
      supabase
        .from('tournaments')
        .select('id, name, game, prize_pool, start_time, status')
        .ilike('name', pattern)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: false })
        .limit(6),
    ])
      .then(([p, t]) => {
        if (cancelled) return;
        setPlayers((p.data as PlayerHit[]) || []);
        setTournaments((t.data as TournamentHit[]) || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const pageHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => p.name.toLowerCase().includes(q) || p.keywords?.some((k) => k.includes(q)));
  }, [pages, query]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const hasRemote = players.length > 0 || tournaments.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[18vh]">
        <DialogTitle className="sr-only">Search Arena</DialogTitle>
        <DialogDescription className="sr-only">Find players, tournaments and pages</DialogDescription>
        <CommandPrimitive shouldFilter={false} className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search players, tournaments, pages"
              className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          </div>
          <CommandPrimitive.List className="max-h-[60vh] overflow-y-auto p-2">
            {debounced.length >= 2 && !loading && !hasRemote && pageHits.length === 0 && (
              <CommandPrimitive.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
                No players or tournaments match “{debounced}”.
              </CommandPrimitive.Empty>
            )}

            {tournaments.length > 0 && (
              <CommandPrimitive.Group heading="Tournaments" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                {tournaments.map((t) => (
                  <CommandPrimitive.Item
                    key={t.id}
                    value={`t-${t.id}`}
                    onSelect={() => go(`/tournaments/${t.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 aria-selected:bg-accent"
                  >
                    <img
                      src={GAME_INFO[t.game as GameType]?.icon}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-md object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {GAME_INFO[t.game as GameType]?.shortName ?? t.game} ·{' '}
                        {t.status === 'completed' ? 'Finished' : t.status === 'open' ? `Starts in ${formatTimeUntil(t.start_time)}` : 'Live'}
                      </p>
                    </div>
                    <span className="font-score text-sm text-gold">{formatArenaCurrency(t.prize_pool)}</span>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            )}

            {players.length > 0 && (
              <CommandPrimitive.Group heading="Players" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                {players.map((p) => (
                  <CommandPrimitive.Item
                    key={p.id}
                    value={`p-${p.id}`}
                    onSelect={() => go(`/profile/${p.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 aria-selected:bg-accent"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={p.avatar_url || ''} alt="" />
                      <AvatarFallback className="bg-primary/20 text-xs">{p.gamertag?.[0]?.toUpperCase() || <User className="h-4 w-4" />}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.gamertag || 'Player'}</p>
                      <p className="text-xs text-muted-foreground">{p.wins || 0} wins</p>
                    </div>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            )}

            {pageHits.length > 0 && (
              <CommandPrimitive.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                {pageHits.map((p) => {
                  const Icon = p.icon;
                  return (
                    <CommandPrimitive.Item
                      key={p.href}
                      value={`nav-${p.href}`}
                      onSelect={() => go(p.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm aria-selected:bg-accent"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {p.name}
                    </CommandPrimitive.Item>
                  );
                })}
              </CommandPrimitive.Group>
            )}

            {debounced.length < 2 && query.trim().length > 0 && (
              <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" /> Type at least 2 letters to search players and tournaments.
              </p>
            )}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
