import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Clock, Loader2, Plus, ShieldCheck, Smartphone, Ticket, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import KYCVerificationDialog from '@/components/kyc/KYCVerificationDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { WITHDRAW_MIN, maskPhone } from '@/components/wallet/mpesa';
import { TopUpDialog } from '@/components/wallet/TopUpDialog';
import { WithdrawDialog } from '@/components/wallet/WithdrawDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatKES } from '@/lib/arena-currency';
import { cn } from '@/lib/utils';

interface Tx {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string | null;
  created_at: string;
}

interface Payout {
  id: string;
  kind: 'deposit' | 'withdrawal';
  amount: number;
  status: string;
  created_at: string;
}

const FILTERS = [
  { id: 'all', label: 'All', types: null },
  { id: 'money', label: 'M-Pesa', types: ['deposit', 'withdrawal'] },
  { id: 'wins', label: 'Wins', types: ['tournament_win', 'challenge_win', 'payout'] },
  { id: 'play', label: 'Entries and stakes', types: ['tournament_fee', 'challenge_fee', 'refund'] },
] as const;
type FilterId = (typeof FILTERS)[number]['id'];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Waiting for PIN',
  completed: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
  timeout: 'Timed out',
  review: 'Being checked',
  queued: 'Queued',
  processing: 'Sending',
  rejected: 'Declined',
};

function when(iso: string) {
  return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Wallet() {
  const { profile, user, refreshProfile } = useAuth();
  const [topUp, setTopUp] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [move, setMove] = useState(false);
  const [kyc, setKyc] = useState(false);
  const [tx, setTx] = useState<Tx[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [usedWithoutKyc, setUsedWithoutKyc] = useState(0);
  const [filter, setFilter] = useState<FilterId>('all');
  const [limit, setLimit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const play = Number(profile?.arena_currency || 0);
  const winnings = Number(profile?.available_balance || 0);
  const held = Number(profile?.pending_balance || 0);
  const verified = profile?.kyc_status === 'verified';

  const loadTx = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const f = FILTERS.find((x) => x.id === filter)!;
    let q = supabase.from('transactions').select('id, type, amount, description, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit + 1);
    if (f.types) q = q.in('type', f.types as unknown as string[]);
    const { data } = await q;
    const rows = (data || []) as Tx[];
    setHasMore(rows.length > limit);
    setTx(rows.slice(0, limit));
    setLoading(false);
  }, [user, filter, limit]);

  const loadPayouts = useCallback(async () => {
    if (!user) return;
    const [d, w] = await Promise.all([
      supabase.from('mpesa_deposits').select('id, amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('mpesa_withdrawals').select('id, amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ]);
    const ws = (w.data || []) as Omit<Payout, 'kind'>[];
    const monthAgo = Date.now() - 30 * 86_400_000;
    setUsedWithoutKyc(ws.filter((x) => !['rejected', 'failed'].includes(x.status) && new Date(x.created_at).getTime() > monthAgo).reduce((s, x) => s + Number(x.amount), 0));
    setPayouts(
      [...((d.data || []) as Omit<Payout, 'kind'>[]).map((x) => ({ ...x, kind: 'deposit' as const })), ...ws.slice(0, 5).map((x) => ({ ...x, kind: 'withdrawal' as const }))]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    );
  }, [user]);

  useEffect(() => {
    loadTx();
  }, [loadTx]);
  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const refreshAll = () => {
    loadTx();
    loadPayouts();
    refreshProfile();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">Wallet</h1>
          <p className="text-muted-foreground">
            {profile?.mpesa_phone ? `M-Pesa ${maskPhone(profile.mpesa_phone)}` : 'Top up with M-Pesa to start playing for money.'}
          </p>
        </div>
      </div>

      {/* Balances */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/[0.12] to-card p-5">
          <div>
            <p className="text-sm text-muted-foreground">Play balance</p>
            <p className="mt-1 font-score text-4xl font-bold leading-none text-gold">{formatKES(play)}</p>
            <p className="mt-2 text-xs text-muted-foreground">For entry fees and stakes. Can’t be withdrawn.</p>
          </div>
          <Button onClick={() => setTopUp(true)} className="h-11">
            <Plus className="h-4 w-4" /> Top up with M-Pesa
          </Button>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-5">
          <div>
            <p className="text-sm text-muted-foreground">Winnings</p>
            <p className="mt-1 font-score text-4xl font-bold leading-none">{formatKES(winnings)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {held > 0 ? (
                <>
                  <Clock className="h-3.5 w-3.5" /> {formatKES(held)} arriving soon (wins of KES 1,000+ clear in 24h)
                </>
              ) : (
                'Withdraw to M-Pesa or use them to play.'
              )}
            </p>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button className="h-11" onClick={() => setWithdraw(true)} disabled={winnings < WITHDRAW_MIN}>
                <ArrowUpRight className="h-4 w-4" /> Withdraw
              </Button>
              <Button variant="outline" className="h-11" onClick={() => setMove(true)} disabled={winnings <= 0}>
                <ArrowRightLeft className="h-4 w-4" /> Use to play
              </Button>
            </div>
            {winnings > 0 && winnings < WITHDRAW_MIN && (
              <p className="text-xs text-muted-foreground">You can withdraw from {formatKES(WITHDRAW_MIN)}. Win a bit more, or use it to play.</p>
            )}
          </div>
        </div>
      </section>

      {Number(profile?.entry_credit || 0) > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 gap-3">
            <Ticket className="mt-0.5 h-6 w-6 shrink-0 text-primary-soft" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Welcome ticket: {formatKES(Number(profile?.entry_credit || 0))}</p>
              <p className="text-sm text-muted-foreground">Free entry to tournaments hosted by Arena or our sponsors. It's used automatically when you join one.</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
            <Link to="/tournaments">Find a tournament</Link>
          </Button>
        </section>
      )}

      {!verified && (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/60 p-4">
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary-soft" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{profile?.kyc_status === 'pending' ? 'ID check in progress' : 'Want bigger withdrawals?'}</p>
            <p className="text-sm text-muted-foreground">
              {profile?.kyc_status === 'pending'
                ? 'We’ll let you know once it’s approved.'
                : 'You can play and withdraw up to KES 20,000 a month without ID. Verify once to remove the limit.'}
            </p>
          </div>
          {profile?.kyc_status !== 'pending' && (
            <Button variant="outline" onClick={() => setKyc(true)}>
              Verify ID
            </Button>
          )}
        </section>
      )}

      {payouts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl">M-Pesa activity</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {payouts.map((p) => (
              <li key={`${p.kind}-${p.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', p.kind === 'deposit' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary-soft')}>
                  <Smartphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.kind === 'deposit' ? 'Top up' : 'Withdrawal'}</p>
                  <p className="text-xs text-muted-foreground">{when(p.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-score text-lg">{formatKES(p.amount)}</p>
                  <p className={cn('text-xs', ['failed', 'rejected', 'cancelled', 'timeout'].includes(p.status) ? 'text-destructive' : p.status === 'completed' ? 'text-success' : 'text-gold')}>
                    {STATUS_LABEL[p.status] || p.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl">History</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setLimit(15);
              }}
              className={cn('h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold', filter === f.id ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground')}
            >
              {f.label}
            </button>
          ))}
        </div>
        {loading && tx.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : tx.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {tx.map((t) => {
              const value = Number(t.amount) || 0;
              const win = ['tournament_win', 'challenge_win', 'payout'].includes(t.type);
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', win ? 'bg-gold/15 text-gold' : value >= 0 ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground')}>
                    {win ? <Trophy className="h-4 w-4" /> : value >= 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.description || t.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {when(t.created_at)}
                      {t.status && t.status !== 'completed' ? `, ${STATUS_LABEL[t.status] || t.status}` : ''}
                    </p>
                  </div>
                  <span className={cn('shrink-0 font-score text-lg', value >= 0 ? 'text-success' : '')}>
                    {value >= 0 ? '+' : '-'}
                    {formatKES(Math.abs(value))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {hasMore && (
          <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + 15)} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Show more
          </Button>
        )}
      </section>

      <TopUpDialog open={topUp} onOpenChange={setTopUp} onPaid={refreshAll} />
      <WithdrawDialog
        open={withdraw}
        onOpenChange={setWithdraw}
        usedWithoutKyc={usedWithoutKyc}
        onVerify={() => {
          setWithdraw(false);
          setKyc(true);
        }}
        onDone={refreshAll}
      />
      <MoveDialog open={move} onOpenChange={setMove} max={winnings} onDone={refreshAll} />
      <KYCVerificationDialog open={kyc} onOpenChange={setKyc} />
    </div>
  );
}

function MoveDialog({ open, onOpenChange, max, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; max: number; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const value = Math.round(Number(amount)) || 0;

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('transfer_cash_to_arena_currency', { p_amount_usd: value });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(`Moved ${formatKES(value)} to your play balance`);
    setAmount('');
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Use winnings to play</DialogTitle>
          <DialogDescription>Moves winnings into your play balance. Play balance can’t be withdrawn, so this is one way.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input inputMode="numeric" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          <Button variant="ghost" onClick={() => setAmount(String(Math.floor(max)))}>
            Max
          </Button>
        </div>
        <Button onClick={submit} disabled={busy || value <= 0 || value > max}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Move {value ? formatKES(value) : ''}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
