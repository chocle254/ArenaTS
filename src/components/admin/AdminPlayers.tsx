import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { isOnline } from '@/lib/profile-columns';
import { cn } from '@/lib/utils';

interface PlayerRow {
  id: string;
  gamertag: string | null;
  avatar_url: string | null;
  role: string | null;
  arena_currency: number | null;
  total_earnings: number | null;
  wins: number | null;
  losses: number | null;
  kyc_status: string | null;
  last_seen_at: string | null;
  created_at: string;
  organizer_verified: boolean | null;
}

const FILTERS = [
  { id: 'all', label: 'Everyone' },
  { id: 'online', label: 'Online' },
  { id: 'staff', label: 'Admins and referees' },
  { id: 'kyc', label: 'KYC pending' },
  { id: 'organizers', label: 'Organizers' },
] as const;
type Filter = (typeof FILTERS)[number]['id'];

const PAGE = 30;

export function AdminPlayers() {
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      let q = supabase
        .from('profiles')
        .select('id, gamertag, avatar_url, role, arena_currency, total_earnings, wins, losses, kyc_status, last_seen_at, created_at, organizer_verified')
        .order(filter === 'online' ? 'last_seen_at' : 'created_at', { ascending: false, nullsFirst: false })
        .limit(limit + 1);
      const term = query.trim();
      if (term) q = q.ilike('gamertag', `%${term.replace(/[%_]/g, '')}%`);
      if (filter === 'online') q = q.gte('last_seen_at', new Date(Date.now() - 5 * 60_000).toISOString());
      if (filter === 'staff') q = q.in('role', ['admin', 'referee']);
      if (filter === 'kyc') q = q.eq('kyc_status', 'pending');
      if (filter === 'organizers') q = q.eq('organizer_verified', true);
      const { data } = await q;
      if (!alive) return;
      const list = (data || []) as PlayerRow[];
      setHasMore(list.length > limit);
      setRows(list.slice(0, limit));
      setLoading(false);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, filter, limit]);

  const toggleOrganizer = async (p: PlayerRow) => {
    const next = !p.organizer_verified;
    const { error } = await supabase.from('profiles').update({ organizer_verified: next }).eq('id', p.id);
    if (error) return void toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === p.id ? { ...x, organizer_verified: next } : x)));
    toast.success(next ? `${p.gamertag} can now host sponsored prize tournaments` : 'Organizer status removed');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-10 w-full items-center gap-2 rounded-full bg-secondary px-3 text-sm focus-within:ring-2 focus-within:ring-ring sm:w-72">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search by gamertag"
            aria-label="Search players"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setLimit(PAGE);
              }}
              className={cn('h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold', filter === f.id ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Header row only where there's room for columns */}
        <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-3 border-b border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
          <span>Player</span>
          <span className="text-right">Wallet</span>
          <span className="text-right">Earned</span>
          <span className="text-center">Record</span>
          <span className="text-right">Joined</span>
        </div>
        {loading && rows.length === 0 ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No players match.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.id} className="flex items-center">
                <Link to={`/profile/${p.id}`} className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-secondary/40 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr]">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="relative shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback>{p.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      {isOnline(p.last_seen_at) && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" aria-label="Online" />}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-semibold">
                        <span className="truncate">{p.gamertag || 'No gamertag'}</span>
                        {p.role === 'admin' && <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary-soft">Admin</span>}
                        {p.role === 'referee' && <span className="rounded-full bg-gold/15 px-1.5 text-[10px] font-semibold text-gold">Referee</span>}
                        {p.organizer_verified && <span className="rounded-full bg-success/15 px-1.5 text-[10px] font-semibold text-success">Organizer</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.kyc_status === 'verified' ? 'KYC verified' : p.kyc_status === 'pending' ? 'KYC pending' : 'Not verified'}
                      </p>
                    </div>
                  </div>
                  <span className="text-right font-score text-base md:text-lg">{formatArenaCurrency(p.arena_currency || 0)}</span>
                  <span className="hidden text-right font-score text-lg text-gold md:block">{formatArenaCurrency(p.total_earnings || 0)}</span>
                  <span className="hidden text-center font-score text-lg md:block">
                    {p.wins || 0}
                    <span className="text-muted-foreground">-</span>
                    {p.losses || 0}
                  </span>
                  <span className="hidden text-right text-sm text-muted-foreground md:block">{new Date(p.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleOrganizer(p)}
                  className={cn('mr-3 shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold', p.organizer_verified ? 'border-success/50 text-success' : 'border-border text-muted-foreground hover:text-foreground')}
                  aria-pressed={!!p.organizer_verified}
                  title="Verified organizers (sponsors, brands) can run prize tournaments without caps"
                >
                  {p.organizer_verified ? 'Organizer ✓' : 'Make organizer'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {hasMore && (
        <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + PAGE)} disabled={loading}>
          Show more players
        </Button>
      )}
    </div>
  );
}
