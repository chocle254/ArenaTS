import { Swords, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SendChallengePanel } from '@/components/SendChallengePanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatCompactNumber } from '@/lib/arena-currency';
import { getLevelInfo } from '@/lib/progression';

interface OnlinePlayer {
  id: string;
  gamertag: string | null;
  avatar_url: string | null;
  wins: number | null;
  losses: number | null;
  tournaments_played: number | null;
  last_seen_at: string;
}

const POLL_MS = 30_000;

export function OnlinePlayers() {
  const { user } = useAuth();
  const userId = user?.id;
  const [players, setPlayers] = useState<OnlinePlayer[] | null>(null);
  const [opponent, setOpponent] = useState<OnlinePlayer | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchOnline = useCallback(async () => {
    if (!userId) return;
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, gamertag, avatar_url, wins, losses, tournaments_played, last_seen_at')
      .neq('id', userId)
      .gt('last_seen_at', since)
      .order('last_seen_at', { ascending: false })
      .limit(12);
    if (error) console.error('Error fetching online players:', error);
    setPlayers((data as OnlinePlayer[]) || []);
  }, [userId]);

  // Poll while the tab is visible. The old realtime subscription listened to
  // every profile change on the platform (each heartbeat), which scales badly.
  useEffect(() => {
    if (!userId) return;
    fetchOnline();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchOnline();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && fetchOnline();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, fetchOnline]);

  return (
    <section className="space-y-3" aria-labelledby="online-title">
      <div className="flex items-center gap-2">
        <h2 id="online-title" className="flex items-center gap-2 text-2xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-live" />
          </span>
          Online now
        </h2>
        {players && players.length > 0 && <span className="font-score text-lg text-live">{players.length}</span>}
      </div>

      {players === null ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[68px] rounded-xl" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <Users className="h-5 w-5 shrink-0" />
          Nobody else is online right now. Invite a friend, or join an open tournament while you wait.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/70 p-3 transition-colors hover:border-primary/40">
              <Link to={`/profile/${p.id}`} className="relative shrink-0" aria-label={`${p.gamertag || 'Player'}'s profile`}>
                <Avatar className="h-11 w-11">
                  <AvatarImage src={p.avatar_url || undefined} alt="" />
                  <AvatarFallback className="font-score">{p.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-live" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/profile/${p.id}`} className="block truncate font-semibold hover:text-primary-soft">
                  {p.gamertag || 'Player'}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Level {getLevelInfo(p as never).level}, {formatCompactNumber(p.wins || 0)}W {formatCompactNumber(p.losses || 0)}L
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOpponent(p);
                  setPanelOpen(true);
                }}
              >
                <Swords /> <span className="hidden sm:inline">Challenge</span>
                <span className="sr-only sm:hidden">Challenge {p.gamertag}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {opponent && (
        <SendChallengePanel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          opponent={{ user_id: opponent.id, gamertag: opponent.gamertag || 'Player', avatar_url: opponent.avatar_url, wins: opponent.wins || 0, losses: opponent.losses || 0 }}
        />
      )}
    </section>
  );
}
