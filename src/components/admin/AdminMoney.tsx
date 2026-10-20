import { Download, Loader2, PiggyBank, RefreshCw, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { invokeEdgeFunction } from '@/lib/edge-function';
import { GAME_INFO, type GameType } from '@/types/database';

export interface TournamentRevenue {
  id: string;
  name: string;
  game: string;
  prize_pool: number;
  platform_fee: number;
  start_time: string;
  current_players: number;
}

interface QueuedWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: 'queued' | 'processing' | 'failed';
  failure_reason: string | null;
  created_at: string;
  profiles: { gamertag: string } | null;
}

interface PlatformFloat {
  availableCents: number;
  pendingCents: number;
  queuedWithdrawals: QueuedWithdrawal[];
  queuedTotal: number;
}

function Figure({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'gold' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 font-score text-3xl font-bold leading-none ${tone === 'gold' ? 'text-gold' : tone === 'warn' ? 'text-destructive' : ''}`}>{value}</p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function AdminMoney({
  revenueBalance,
  tournaments,
  onRevenueChanged,
  onQueuedCount,
}: {
  revenueBalance: number;
  tournaments: TournamentRevenue[];
  onRevenueChanged: () => void;
  onQueuedCount?: (n: number) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [float, setFloat] = useState<PlatformFloat>({ availableCents: 0, pendingCents: 0, queuedWithdrawals: [], queuedTotal: 0 });
  const [floatLoading, setFloatLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const fetchFloat = async () => {
    setFloatLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction<PlatformFloat>('get-platform-float', { accessToken: await token(), body: {} });
      if (error) throw error;
      if (data) {
        const next = {
          availableCents: Number(data.availableCents) || 0,
          pendingCents: Number(data.pendingCents) || 0,
          queuedTotal: Number(data.queuedTotal) || 0,
          queuedWithdrawals: Array.isArray(data.queuedWithdrawals) ? data.queuedWithdrawals : [],
        };
        setFloat(next);
        onQueuedCount?.(next.queuedWithdrawals.filter((q) => q.status === 'queued').length);
      }
    } catch (e) {
      console.error('Error fetching platform float:', e);
    } finally {
      setFloatLoading(false);
    }
  };

  useEffect(() => {
    fetchFloat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from a float top-up checkout
  useEffect(() => {
    const topup = searchParams.get('float_topup');
    if (!topup) return;
    if (topup === 'success') {
      toast.success('Float top-up received. It shows up once the payment settles.');
      setTimeout(fetchFloat, 2500);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('float_topup');
    next.delete('session_id');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const retry = async (id: string) => {
    setRetryingId(id);
    try {
      const { error } = await invokeEdgeFunction('retry-queued-withdrawal', { accessToken: await token(), body: { queueId: id } });
      if (error) throw error;
      toast.success('Withdrawal released');
      fetchFloat();
    } catch (e: any) {
      toast.error(e.message || 'Still not enough float. Try again after topping up.');
    } finally {
      setRetryingId(null);
    }
  };

  const withdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return void toast.error('Enter an amount');
    if (amount > revenueBalance) return void toast.error('That is more than the revenue balance');
    setWithdrawing(true);
    try {
      const { error } = await invokeEdgeFunction('admin-withdraw-revenue', { accessToken: await token(), body: { amount: Math.round(amount * 100) / 100 } });
      if (error) throw error;
      toast.success('Revenue withdrawal started');
      setWithdrawAmount('');
      onRevenueChanged();
    } catch (e: any) {
      toast.error(e.message || 'Could not withdraw revenue');
    } finally {
      setWithdrawing(false);
    }
  };

  const deposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return void toast.error('Enter an amount');
    setDepositing(true);
    try {
      const { data, error } = await invokeEdgeFunction<{ url?: string; error?: string }>('create-float-topup-checkout', { accessToken: await token(), body: { amount, currency: 'usd' } });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || 'No checkout link returned');
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || 'Could not start the deposit');
      setDepositing(false);
    }
  };

  const exportCsv = () => {
    const rows = [['Tournament', 'Game', 'Prize pool', 'Platform fee', 'Players', 'Date'], ...tournaments.map((t) => [t.name.replace(/,/g, ' '), t.game, t.prize_pool.toFixed(2), t.platform_fee.toFixed(2), String(t.current_players), new Date(t.start_time).toLocaleDateString()])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `arena-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const queued = float.queuedWithdrawals;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xl">Platform revenue</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
          <Figure label="Ready to withdraw" value={formatArenaCurrency(revenueBalance)} note="Fees collected from tournaments and quick matches." tone="gold" />
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <label className="text-sm text-muted-foreground" htmlFor="rev-amount">
              Withdraw to the platform account
            </label>
            <div className="flex gap-2">
              <Input id="rev-amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} disabled={withdrawing || revenueBalance <= 0} />
              <Button variant="ghost" onClick={() => setWithdrawAmount(revenueBalance.toFixed(2))} disabled={revenueBalance <= 0}>
                Max
              </Button>
              <Button onClick={withdraw} disabled={withdrawing || !withdrawAmount}>
                {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Withdraw
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl">Payout float</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchFloat} disabled={floatLoading}>
              <RefreshCw className={floatLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setDepositOpen(true)}>
              <PiggyBank className="h-4 w-4" /> Top up float
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Figure label="Available now" value={`$${(float.availableCents / 100).toFixed(2)}`} note="Covers player withdrawals immediately." />
          <Figure label="Settling" value={`$${(float.pendingCents / 100).toFixed(2)}`} note="Recent payments, not usable yet." />
          <Figure label="Waiting on float" value={`$${float.queuedTotal.toFixed(2)}`} note={`${queued.filter((q) => q.status === 'queued').length} withdrawals queued`} tone={float.queuedTotal > 0 ? 'warn' : undefined} />
        </div>
        {queued.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {queued.map((q) => (
              <li key={q.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{q.profiles?.gamertag || q.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.status === 'queued' ? 'Queued' : q.status === 'processing' ? 'Processing' : 'Failed'}, {new Date(q.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {q.failure_reason && <p className="text-xs text-destructive">{q.failure_reason}</p>}
                </div>
                <span className="font-score text-lg">${Number(q.amount).toFixed(2)}</span>
                <Button size="sm" variant="outline" onClick={() => retry(q.id)} disabled={retryingId === q.id || q.status === 'processing'}>
                  {retryingId === q.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Retry
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl">Fees by tournament</h2>
          <Button variant="ghost" size="sm" onClick={exportCsv} disabled={tournaments.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
        {tournaments.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No finished tournaments yet.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {tournaments.slice(0, 50).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <img src={GAME_INFO[t.game as GameType]?.icon} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.start_time).toLocaleDateString([], { day: 'numeric', month: 'short' })}, {t.current_players} players, pool {formatArenaCurrency(t.prize_pool)}
                  </p>
                </div>
                <span className="font-score text-lg text-success">+{formatArenaCurrency(t.platform_fee)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={depositOpen} onOpenChange={(o) => !depositing && setDepositOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top up the payout float</DialogTitle>
            <DialogDescription>Adds money used to pay player withdrawals. It doesn't credit any player.</DialogDescription>
          </DialogHeader>
          <Input type="number" min="1" step="0.01" placeholder="Amount (USD)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} disabled={depositing} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDepositOpen(false)} disabled={depositing}>
              Cancel
            </Button>
            <Button onClick={deposit} disabled={depositing || !depositAmount}>
              {depositing && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue to payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
