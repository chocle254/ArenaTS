import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw, ShieldAlert, Snowflake } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { maskPhone } from '@/components/wallet/mpesa';
import { supabase } from '@/db/supabase';
import { formatKES } from '@/lib/arena-currency';
import { invokeEdgeFunction } from '@/lib/edge-function';
import { cn } from '@/lib/utils';
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

interface Withdrawal {
  id: string;
  user_id: string;
  phone: string;
  amount: number;
  status: string;
  flags: string[];
  failure_reason: string | null;
  created_at: string;
  profiles: { gamertag: string | null; kyc_status: string | null; created_at: string } | null;
}
interface Hold {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  reason: string | null;
  created_at: string;
  profiles: { gamertag: string | null } | null;
}
interface Flag {
  id: string;
  user_id: string;
  kind: string;
  severity: string;
  detail: Record<string, unknown>;
  created_at: string;
  profiles: { gamertag: string | null } | null;
}

const FLAG_LABEL: Record<string, string> = {
  large_amount: 'Large amount',
  new_account: 'New account',
  fraud_flag: 'Account flagged',
  open_aml_flag: 'Open laundering flag',
  single_opponent_source: 'Mostly won from one opponent',
  shared_ip_with_opponent: 'Same network as that opponent',
  one_sided_pair: 'Same opponent always loses',
  deposit_and_lose: 'Opponent deposited and lost it straight away',
  legacy_balance_mismatch: 'Old balance bigger than earnings',
  payout_number_changed: 'Payout number changed',
};

async function mpesaAdmin<T>(body: Record<string, unknown>) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const { data, error } = await invokeEdgeFunction<T & { error?: string }>('mpesa', { accessToken: token, body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
  return data as T;
}

function Figure({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'gold' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-score text-3xl font-bold leading-none', tone === 'gold' && 'text-gold', tone === 'warn' && 'text-destructive')}>{value}</p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function AdminMoney({ revenueBalance, tournaments, currentUserId, onChanged }: { revenueBalance: number; tournaments: TournamentRevenue[]; currentUserId: string; onChanged: () => void }) {
  const [wallet, setWallet] = useState<{ payments_wallet_balance?: number; service_wallet_balance?: number } | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [owed, setOwed] = useState({ winnings: 0, held: 0, play: 0 });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<Withdrawal | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const [w, h, f, totals] = await Promise.all([
      supabase.from('mpesa_withdrawals').select('id, user_id, phone, amount, status, flags, failure_reason, created_at, profiles!mpesa_withdrawals_user_id_fkey(gamertag, kyc_status, created_at)').in('status', ['review', 'queued', 'processing']).order('created_at', { ascending: true }).limit(100),
      supabase.from('held_winnings').select('id, user_id, amount, source, reason, created_at, profiles(gamertag)').eq('status', 'frozen').order('created_at', { ascending: true }).limit(100),
      supabase.from('aml_flags').select('id, user_id, kind, severity, detail, created_at, profiles!aml_flags_user_id_fkey(gamertag)').is('resolved_at', null).neq('severity', 'info').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('available_balance, pending_balance, arena_currency').limit(10000),
    ]);
    setWithdrawals((w.data || []) as unknown as Withdrawal[]);
    setHolds((h.data || []) as unknown as Hold[]);
    setFlags((f.data || []) as unknown as Flag[]);
    const rows = (totals.data || []) as { available_balance: number | null; pending_balance: number | null; arena_currency: number | null }[];
    setOwed({
      winnings: rows.reduce((s, r) => s + Number(r.available_balance || 0), 0),
      held: rows.reduce((s, r) => s + Number(r.pending_balance || 0), 0),
      play: rows.reduce((s, r) => s + Number(r.arena_currency || 0), 0),
    });
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      setWalletError(null);
      setWallet(await mpesaAdmin<{ payments_wallet_balance?: number; service_wallet_balance?: number }>({ action: 'balances' }));
    } catch (e) {
      setWalletError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    loadWallet();
  }, [load, loadWallet]);

  const act = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(done);
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const approve = (w: Withdrawal) => act(w.id, () => mpesaAdmin({ action: 'approve_withdrawal', id: w.id }), 'Approved and sent to M-Pesa');
  const retry = (w: Withdrawal) => act(w.id, () => mpesaAdmin({ action: 'retry_withdrawal', id: w.id }), 'Payout retried');
  const decline = () => {
    if (!declining) return;
    const w = declining;
    act(
      w.id,
      async () => {
        const { error } = await supabase.rpc('admin_review_withdrawal', { p_id: w.id, p_approve: false, p_reason: reason || 'Declined after review' });
        if (error) throw error;
      },
      'Declined. The money went back to their winnings.',
    ).then(() => {
      setDeclining(null);
      setReason('');
    });
  };
  const resolveHold = (h: Hold, release: boolean) =>
    act(
      h.id,
      async () => {
        const { error } = await supabase.rpc('admin_resolve_hold', { p_hold_id: h.id, p_release: release, p_note: release ? 'Released after review' : 'Reversed: laundering or collusion' });
        if (error) throw error;
      },
      release ? 'Released to their winnings' : 'Reversed to platform',
    );
  const resolveFlag = (f: Flag) =>
    act(
      f.id,
      async () => {
        const { error } = await supabase.rpc('admin_resolve_flag', { p_flag_id: f.id, p_note: 'Reviewed, no action' });
        if (error) throw error;
      },
      'Flag cleared',
    );

  const exportCsv = () => {
    const rows = [['Tournament', 'Game', 'Prize pool (KES)', 'Platform fee (KES)', 'Players', 'Date'], ...tournaments.map((t) => [t.name.replace(/,/g, ' '), t.game, t.prize_pool.toFixed(2), t.platform_fee.toFixed(2), String(t.current_players), new Date(t.start_time).toLocaleDateString()])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `arena-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const review = withdrawals.filter((w) => w.status === 'review');
  const stuck = withdrawals.filter((w) => w.status !== 'review');
  const walletBal = Number(wallet?.payments_wallet_balance || 0);
  const liabilities = owed.winnings + owed.held + owed.play;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl">Balances</h2>
          <Button variant="ghost" size="sm" onClick={() => { load(); loadWallet(); }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="UpesiPay wallet" value={wallet ? formatKES(walletBal) : walletError ? 'Not set up' : '…'} note={walletError || `Service wallet ${formatKES(Number(wallet?.service_wallet_balance || 0))}`} tone={wallet && walletBal < owed.winnings ? 'warn' : undefined} />
          <Figure label="Players can withdraw" value={formatKES(owed.winnings)} note={`${formatKES(owed.held)} more on hold`} />
          <Figure label="Play balances" value={formatKES(owed.play)} note="Deposits not yet played" />
          <Figure label="Platform revenue" value={formatKES(revenueBalance)} note="Your fees, inside the wallet" tone="gold" />
        </div>
        {wallet && walletBal < liabilities && (
          <p className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            The wallet holds less than players are owed ({formatKES(liabilities)}). Payouts can pause until it’s topped up.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl">Withdrawals to review</h2>
        {review.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" /> Nothing waiting.
          </p>
        ) : (
          <ul className="space-y-2">
            {review.map((w) => {
              const own = w.user_id === currentUserId;
              return (
                <li key={w.id} className="space-y-3 rounded-2xl border border-gold/30 bg-card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Link to={`/profile/${w.user_id}`} className="font-semibold hover:underline">
                        {w.profiles?.gamertag || 'Player'}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {maskPhone(w.phone)}, {w.profiles?.kyc_status === 'verified' ? 'ID verified' : 'ID not verified'}, asked {new Date(w.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="font-score text-2xl font-bold">{formatKES(w.amount)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {w.flags.map((f) => (
                      <span key={f} className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">
                        {FLAG_LABEL[f] || f}
                      </span>
                    ))}
                  </div>
                  {own ? (
                    <p className="text-xs text-muted-foreground">This is your own withdrawal. Another admin has to review it.</p>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approve(w)} disabled={busy === w.id}>
                        {busy === w.id && <Loader2 className="h-4 w-4 animate-spin" />} Approve and pay
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setDeclining(w)} disabled={busy === w.id}>
                        Decline
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {stuck.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl">Payouts in flight</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {stuck.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{w.profiles?.gamertag || 'Player'}</p>
                  <p className="text-xs text-muted-foreground">{w.status === 'queued' ? w.failure_reason || 'Queued' : 'Sending to M-Pesa'}</p>
                </div>
                <span className="font-score text-lg">{formatKES(w.amount)}</span>
                {w.status === 'queued' && (
                  <Button size="sm" variant="outline" onClick={() => retry(w)} disabled={busy === w.id}>
                    Retry
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl">
          <Snowflake className="h-5 w-5 text-primary-soft" /> Frozen winnings
        </h2>
        {holds.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">No winnings frozen.</p>
        ) : (
          <ul className="space-y-2">
            {holds.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${h.user_id}`} className="font-semibold hover:underline">
                    {h.profiles?.gamertag || 'Player'}
                  </Link>
                  <p className="text-xs text-muted-foreground">{h.reason || h.source}</p>
                </div>
                <span className="font-score text-xl">{formatKES(h.amount)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => resolveHold(h, true)} disabled={busy === h.id}>
                    Release
                  </Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => resolveHold(h, false)} disabled={busy === h.id}>
                    Reverse
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl">
          <ShieldAlert className="h-5 w-5 text-live" /> Laundering flags
        </h2>
        {flags.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">No open flags.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {flags.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    <Link to={`/profile/${f.user_id}`} className="hover:underline">
                      {f.profiles?.gamertag || 'Player'}
                    </Link>
                    <span className={cn('ml-2 rounded-full px-2 py-0.5 text-[11px]', f.severity === 'block' ? 'bg-live/15 text-live' : 'bg-gold/15 text-gold')}>{f.severity === 'block' ? 'Blocks payouts' : 'Review'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {FLAG_LABEL[f.kind] || f.kind}, {new Date(f.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => resolveFlag(f)} disabled={busy === f.id}>
                  Clear
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">While a player has an open flag their winnings stay on hold and withdrawals go to review.</p>
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
                    {new Date(t.start_time).toLocaleDateString([], { day: 'numeric', month: 'short' })}, {t.current_players} players, pool {formatKES(t.prize_pool)}
                  </p>
                </div>
                <span className="font-score text-lg text-success">+{formatKES(t.platform_fee)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!declining} onOpenChange={(o) => !o && setDeclining(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline {declining ? formatKES(declining.amount) : ''}?</DialogTitle>
            <DialogDescription>The money goes back to their winnings. Tell them why.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Reason, e.g. verify your ID first" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeclining(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={decline} disabled={busy === declining?.id}>
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
