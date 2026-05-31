import { motion } from 'framer-motion';
import { 
  ArrowDownLeft, 
  ChevronDown,
  Filter,
  Gamepad2, 
  Plus, 
  RefreshCcw, 
  Trophy,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useCountUp } from '@/hooks/use-count-up';
import { formatLargeNumber, formatUSD } from '@/lib/format-number';
import { formatArenaCurrency } from '@/lib/arena-currency';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
  status: string;
}

const TRANSACTION_FILTERS = ['all', 'wins', 'fees', 'withdrawals', 'deposits'] as const;
type TransactionFilter = typeof TRANSACTION_FILTERS[number];

export default function Wallet() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const arenaCurrency = profile?.arena_currency ?? 0;
  // Cash balance is derived from Arena Currency: 100 AC = $1.00
  const cashBalance = arenaCurrency / 100;

  // Count-up animations
  const animatedAC = useCountUp(arenaCurrency, 1500, 0);
  const animatedCash = useCountUp(cashBalance, 1500, 0);

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async (reset = false) => {
    if (!user) return;

    setLoading(true);
    try {
      const pageSize = 10;
      const from = reset ? 0 : (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filter
      if (filter !== 'all') {
        const typeMap: Record<string, string[]> = {
          wins: ['tournament_win', 'challenge_win'],
          fees: ['tournament_fee', 'challenge_fee'],
          withdrawals: ['withdrawal'],
          deposits: ['credit', 'deposit'],
        };
        query = query.in('type', typeMap[filter] || []);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (reset) {
        setTransactions(data || []);
      } else {
        setTransactions((prev) => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === pageSize);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: TransactionFilter) => {
    setFilter(newFilter);
    setPage(1);
    setTransactions([]);
    setTimeout(() => fetchTransactions(true), 0);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
    setTimeout(() => fetchTransactions(), 0);
  };

  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const CURRENCY_PACKAGES = [
    { name: 'Starter Pack', ac: 500, price: 5.00, icon: '🥉' },
    { name: 'Pro Pack', ac: 1200, price: 10.00, icon: '🥈', popular: true },
    { name: 'Elite Pack', ac: 3000, price: 25.00, icon: '🥇' },
    { name: 'Ultimate Pack', ac: 6500, price: 50.00, icon: '💎' },
  ];

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const handleDeposit = async (price: number, name: string, ac: number) => {
    if (!user) {
      toast.error('Please sign in to add funds');
      return;
    }

    setIsDepositLoading(true);
    setCheckoutUrl(null);

    try {
      console.log('Initiating checkout for:', name, price, 'AC:', ac);
      const { data, error } = await supabase.functions.invoke('create_stripe_checkout', {
        body: {
          items: [{ 
            name: `Arena Currency - ${name}`, 
            price, 
            quantity: 1,
            ac_amount: ac
          }],
          currency: 'usd',
          payment_method_types: ['card']
        }
      });

      if (error) throw error;

      if (data?.code === 'SUCCESS' && data?.data?.url) {
        const url = data.data.url;
        setCheckoutUrl(url);
        
        // Break out of iframe to the top level window to avoid Stripe blocking
        // We use a small timeout to let the state update so the manual button is ready if redirect fails
        setTimeout(() => {
          try {
            if (window.top && window.top !== window) {
              window.top.location.href = url;
            } else {
              window.location.href = url;
            }
          } catch (e) {
            console.warn('Top-level redirect blocked by sandbox, falling back to current window');
            window.location.href = url;
          }
        }, 500);
      } else {
        throw new Error(data?.message || 'Invalid response from payment gateway');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setIsDepositLoading(false);
      
      let message = error.message || 'Failed to initiate deposit';
      if (error?.context) {
        try {
          const body = await error.context.json();
          message = body.error || body.message || message;
        } catch (e) {
          const text = await error.context.text();
          message = text || message;
        }
      }
      toast.error(message);
    }
  };

  const handleAction = async () => {
    if (!user || !profile) return;

    if (!profile.stripe_connect_account_id) {
      // Onboarding flow
      setIsWithdrawLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-connect-account');
        if (error) {
          let message = error.message;
          try {
            const body = await error.context.json();
            message = body.error || body.message || message;
          } catch (e) {
            const text = await error.context.text();
            message = text || message;
          }
          throw new Error(message);
        }
        if (data?.url) {
          toast.success('Redirecting to Stripe for account verification...');
          window.location.href = data.url;
        }
      } catch (error: any) {
        console.error('Error connecting account:', error);
        toast.error(error.message || 'Failed to start account connection');
      } finally {
        setIsWithdrawLoading(false);
      }
      return;
    }

    if (cashBalance <= 0) {
      toast.error('You have no withdrawable balance');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }
    if (amount > cashBalance) {
      toast.error(`Amount exceeds your available balance of $${cashBalance.toFixed(2)}`);
      return;
    }

    setIsWithdrawLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payout', {
        body: { amount, currency: 'usd' }
      });

      if (error) {
        let message = error.message;
        try {
          const body = await error.context.json();
          message = body.error || body.message || message;
        } catch (e) {
          const text = await error.context.text();
          message = text || message;
        }
        throw new Error(message);
      }

      // Deduct the equivalent Arena Currency (100 AC = $1)
      const acToDeduct = Math.round(amount * 100);
      await supabase
        .from('profiles')
        .update({ arena_currency: Math.max(0, arenaCurrency - acToDeduct) })
        .eq('id', user.id);

      toast.success(`Withdrawal of $${amount.toFixed(2)} initiated successfully!`);
      setWithdrawAmount('');
      // Profile will be updated by realtime subscription
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to initiate withdrawal');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'tournament_win':
      case 'challenge_win':
        return <Trophy className="h-5 w-5 text-green-500" />;
      case 'tournament_fee':
      case 'challenge_fee':
        return <Gamepad2 className="h-5 w-5 text-red-500" />;
      case 'withdrawal':
        return <ArrowDownLeft className="h-5 w-5 text-gray-500" />;
      case 'credit':
      case 'deposit':
      case 'payout':
        return <Plus className="h-5 w-5 text-blue-500" />;
      case 'refund':
        return <Plus className="h-5 w-5 text-indigo-500" />;
      default:
        return <Plus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'tournament_win':
      case 'challenge_win':
        return 'bg-green-500/20';
      case 'tournament_fee':
      case 'challenge_fee':
        return 'bg-red-500/20';
      case 'withdrawal':
        return 'bg-gray-500/20';
      case 'credit':
      case 'deposit':
      case 'payout':
        return 'bg-blue-500/20';
      case 'refund':
        return 'bg-indigo-500/20';
      default:
        return 'bg-muted';
    }
  };

  const isIncoming = (type: string) => {
    return type === 'tournament_win' || type === 'challenge_win' || type === 'credit' || type === 'deposit' || type === 'refund' || type === 'payout';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-10">
      {/* Checkout Redirect Overlay */}
      {isDepositLoading && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-5 p-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {checkoutUrl ? 'Redirect Blocked' : 'Preparing Checkout'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              {checkoutUrl
                ? 'Your browser blocked the automatic redirect. Click below to continue to Stripe.'
                : 'Connecting to Stripe. This may take a moment…'}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            {checkoutUrl && (
              <Button onClick={() => { try { (window.top || window).location.href = checkoutUrl; } catch { window.location.href = checkoutUrl; } }} className="w-full">
                Continue to Payment
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsDepositLoading(false)} className="w-full text-muted-foreground">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight">Wallet</h1>
        <p className="text-muted-foreground font-light mt-1">Manage your funds and review your activity</p>
      </div>

      {/* ── Balance Overview ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Arena Currency */}
        <div className="relative overflow-hidden rounded-2xl border border-[hsl(45,90%,60%,0.25)] bg-card h-full">
          {/* Subtle gold corner glow */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[hsl(45,90%,60%,0.08)] blur-2xl pointer-events-none" />
          <div className="relative p-6 md:p-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(45,90%,60%,0.8)]">Arena Currency</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[hsl(45,90%,60%,0.2)] bg-[hsl(45,90%,60%,0.06)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(45,90%,60%)] animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-[hsl(45,90%,60%)]">AC</span>
              </div>
            </div>
            <p className="text-4xl md:text-5xl font-orbitron text-gold tracking-tight leading-none">
              {formatArenaCurrency(animatedAC)}
            </p>
            <p className="text-xs text-muted-foreground">Tournament &amp; challenge entry fees</p>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card h-full">
          {/* Subtle cyan corner glow */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="relative p-6 md:p-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Cash Balance</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary">USD</span>
              </div>
            </div>
            <p className="text-4xl md:text-5xl font-orbitron text-gold tracking-tight leading-none">
              ${animatedCash.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Withdrawable · 100 AC = $1.00</p>
          </div>
        </div>
      </motion.div>

      {/* ── Buy Arena Currency ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Add Arena Currency</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CURRENCY_PACKAGES.map((pkg) => (
            <button
              key={pkg.name}
              type="button"
              onClick={() => handleDeposit(pkg.price, pkg.name, pkg.ac)}
              disabled={isDepositLoading}
              className={`relative flex items-center justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-colors hover:bg-muted/40 disabled:opacity-50 ${
                pkg.popular ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`}
            >
              {pkg.popular && (
                <span className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                  Popular
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xl">{pkg.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{pkg.name}</p>
                  <p className="text-xs text-muted-foreground">{pkg.ac.toLocaleString()} AC</p>
                </div>
              </div>
              <p className="text-sm font-bold text-primary shrink-0">${pkg.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Arena Currency is non-withdrawable and for platform use only.</p>
      </div>

      {/* ── Withdraw Cash ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Withdraw</h2>
        <Card className="border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <p className="text-sm font-medium">
                {!profile?.stripe_connect_account_id ? 'Connect your payout account' : 'Withdraw your cash balance'}
              </p>
              <p className="text-xs text-muted-foreground">
                {!profile?.stripe_connect_account_id
                  ? 'Link a Stripe account to enable withdrawals'
                  : `Available: $${cashBalance.toFixed(2)} · ${formatArenaCurrency(arenaCurrency)}`}
              </p>
            </div>

            {profile?.stripe_connect_account_id ? (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={cashBalance}
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="pl-7 font-mono"
                    disabled={isWithdrawLoading || cashBalance <= 0}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground shrink-0 px-3 h-9"
                  onClick={() => setWithdrawAmount(cashBalance.toFixed(2))}
                  disabled={cashBalance <= 0}
                >
                  Max
                </Button>
                <Button
                  onClick={handleAction}
                  variant="outline"
                  disabled={isWithdrawLoading || !withdrawAmount || cashBalance <= 0}
                  className="shrink-0 gap-2"
                >
                  {isWithdrawLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
                  Withdraw
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleAction}
                variant="outline"
                disabled={isWithdrawLoading}
                className="gap-2"
              >
                {isWithdrawLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
                Connect Stripe
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Order History ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Order History</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchOrders}>
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
        {loadingOrders ? (
          <p className="text-sm text-muted-foreground py-2">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-xl">No orders yet</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {orders.slice(0, 5).map((order, idx) => (
              <div key={`${order.id}-${idx}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-sm font-semibold font-mono">${Number(order.total_amount).toFixed(2)}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    order.status === 'completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                    order.status === 'pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                    'bg-destructive/15 text-destructive'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Transaction History ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Transactions</h2>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {TRANSACTION_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading && transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Loading…</p>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-3">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/tournaments')}>
              Browse Tournaments
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {transactions.map((transaction, idx) => (
                <div
                  key={`${transaction.id}-${idx}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg ${getTransactionColor(transaction.type)} flex items-center justify-center shrink-0`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {new Date(transaction.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className={`text-sm font-bold font-mono shrink-0 ${
                    transaction.type === 'refund' ? 'text-primary' :
                    isIncoming(transaction.type) ? 'text-emerald-500' : 'text-destructive'
                  }`}>
                    {isIncoming(transaction.type) ? '+' : '−'}
                    {transaction.currency === 'AC'
                      ? formatArenaCurrency(Math.abs(transaction.amount))
                      : formatUSD(Math.abs(transaction.amount))}
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="px-5 py-4 border-t border-border">
                <Button onClick={handleLoadMore} variant="ghost" className="w-full text-sm" disabled={loading}>
                  {loading ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
