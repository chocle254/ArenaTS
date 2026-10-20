import { Loader2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getTournamentPhase, type TournamentPhase } from '@/components/arena/TournamentCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType, type Tournament } from '@/types/database';

const FILTERS: { id: 'upcoming' | 'live' | 'finished'; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'live', label: 'Live' },
  { id: 'finished', label: 'Finished' },
];

const PHASE_LABEL: Record<TournamentPhase, string> = {
  open: 'Open',
  starting: 'Starting',
  live: 'Live',
  completed: 'Finished',
  cancelled: 'Cancelled',
};

export function AdminTournaments() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('upcoming');
  const [rows, setRows] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<Tournament | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('tournaments').select('*').limit(60);
    if (filter === 'upcoming') q = q.eq('status', 'open').order('start_time', { ascending: true });
    if (filter === 'live') q = q.eq('status', 'active').order('start_time', { ascending: false });
    if (filter === 'finished') q = q.in('status', ['completed', 'cancelled']).order('start_time', { ascending: false });
    const { data, error } = await q;
    if (error) toast.error('Could not load tournaments');
    setRows((data || []) as Tournament[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const toggleFeatured = async (t: Tournament) => {
    setBusy(t.id);
    const { error } = await supabase.from('tournaments').update({ featured: !t.featured }).eq('id', t.id);
    setBusy(null);
    if (error) return void toast.error(error.message || 'Could not update');
    setRows((r) => r.map((x) => (x.id === t.id ? { ...x, featured: !t.featured } : x)));
    toast.success(t.featured ? 'Removed from the home page' : 'Featured on the home page');
  };

  const cancel = async () => {
    if (!cancelling) return;
    setBusy(cancelling.id);
    const { error } = await supabase.from('tournaments').update({ status: 'cancelled' }).eq('id', cancelling.id);
    setBusy(null);
    if (error) return void toast.error(error.message || 'Could not cancel');
    toast.success('Tournament cancelled. Entry fees are being refunded.');
    setCancelling(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn('h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold', filter === f.id ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground')}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filter === 'upcoming' && <p className="text-sm text-muted-foreground">Featured tournaments lead the carousel on everyone's home page.</p>}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nothing here right now.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => {
            const game = GAME_INFO[t.game as GameType];
            const phase = getTournamentPhase(t);
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 sm:flex-nowrap">
                <img src={game?.icon} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" loading="lazy" />
                <Link to={`/tournaments/${t.id}`} className="min-w-0 flex-1 hover:underline">
                  <p className="truncate font-semibold">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {PHASE_LABEL[phase]}, {new Date(t.start_time).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}, {t.current_players}/{t.max_players} players
                  </p>
                </Link>
                <span className="font-score text-lg text-gold">{formatArenaCurrency(t.prize_pool)}</span>
                <div className="ml-auto flex shrink-0 gap-1.5">
                  {(phase === 'open' || phase === 'starting' || phase === 'live') && (
                    <Button
                      size="sm"
                      variant={t.featured ? 'default' : 'outline'}
                      onClick={() => toggleFeatured(t)}
                      disabled={busy === t.id}
                      aria-pressed={t.featured}
                      className="gap-1.5"
                    >
                      {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className={cn('h-4 w-4', t.featured && 'fill-current')} />}
                      {t.featured ? 'Featured' : 'Feature'}
                    </Button>
                  )}
                  {phase === 'open' && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setCancelling(t)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {cancelling?.name}?</DialogTitle>
            <DialogDescription>Everyone who joined gets their entry fee back. This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={busy === cancelling?.id}>
              {busy === cancelling?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel tournament
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
