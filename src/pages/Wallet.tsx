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
import { invokeEdgeFunction } from '@/lib/edge-function';
import KYCVerificationDialog from '@/components/kyc/KYCVerificationDialog';
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
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const arenaCurrency = profile?.arena_currency ?? 0;
  // Cash balance is the withdrawable available_balance, NOT derived from arena currency
  const cashBalance = profile?.available_balance ?? 0;

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
  const [onboardingIncomplete, setOnboardingIncomplete] = useState(false);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      // Fetch deposits and withdrawals in parallel
      const [{ data: orderData, error: orderError }, { data: withdrawalData, error: withdrawalError }] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (orderError) throw orderError;
      if (withdrawalError) throw withdrawalError;

      const combined = [
        ...(orderData || []).map((o) => ({ ...o, record_type: 'order' as const })),
        ...(withdrawalData || []).map((w) => ({ ...w, record_type: 'withdrawal' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(combined);
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
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await invokeEdgeFunction<{ code: string; data?: { url: string }; message?: string }>('create_stripe_checkout', {
        accessToken: token,
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

        // Navigate directly to Stripe Checkout. If running in an iframe, we
        // try to break out to the top window so Stripe doesn't block the frame.
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = url;
          } else {
            window.location.href = url;
          }
        } catch (e) {
          console.warn('Top-level redirect blocked, falling back to current window');
          window.location.href = url;
        }
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
        } catch {
          try {
            const text = await error.context.text();
            message = text || message;
          } catch {
            // ignore
          }
        }
      }
      toast.error(message);
    }
  };

  const handleResumeOnboarding = async () => {
    if (!user) return;
    setIsWithdrawLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await invokeEdgeFunction<{ url?: string }>('create-connect-account', { accessToken: token, body: {} });
      if (error) throw error;
      if (data?.url) {
        toast.success('Redirecting to Stripe to complete setup…');
        try {
          (window.top || window).location.href = data.url;
        } catch {
          window.location.href = data.url;
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to resume onboarding');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const handleAction = async () => {
    if (!user || !profile) return;

    if (!profile.kyc_status || profile.kyc_status !== 'verified') {
      setKycDialogOpen(true);
      return;
    }

    if (!profile.stripe_connect_account_id) {
      // First-time onboarding flow
      setIsWithdrawLoading(true);
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const { data, error } = await invokeEdgeFunction<{ url?: string }>('create-connect-account', { accessToken: token, body: {} });
        if (error) throw error;
        if (data?.url) {
          toast.success('Redirecting to Stripe for account verification...');
          try {
            (window.top || window).location.href = data.url;
          } catch {
            window.location.href = data.url;
          }
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
      // Edge function expects amount in USD dollars
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await invokeEdgeFunction<{ message?: string }>('create-payout', {
        accessToken: token,
        body: { amount: Math.round(amount * 100) / 100, currency: 'usd' }
      });

      if (error) {
        const message = error.message;
        // Detect incomplete onboarding
        if (message.toLowerCase().includes('not fully set up') || message.toLowerCase().includes('payouts_enabled')) {
          setOnboardingIncomplete(true);
        }
        throw error;
      }

      toast.success(`Withdrawal of $${amount.toFixed(2)} initiated successfully!`);
      setWithdrawAmount('');
      setOnboardingIncomplete(false);
      // Refresh profile so the reduced balance is visible immediately
      await refreshProfile();
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
      {/* KYC Dialog */}
      <KYCVerificationDialog open={kycDialogOpen} onOpenChange={setKycDialogOpen} />

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
            <p className="text-xs text-muted-foreground">Withdrawable · from winnings & fees</p>
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
                {(!profile?.kyc_status || profile.kyc_status !== 'verified')
                  ? 'Identity Verification Required'
                  : !profile?.stripe_connect_account_id 
                    ? 'Connect your payout account' 
                    : 'Withdraw your cash balance'}
              </p>
              <p className="text-xs text-muted-foreground">
                {(!profile?.kyc_status || profile.kyc_status !== 'verified')
                  ? 'Complete KYC to enable withdrawals'
                  : !profile?.stripe_connect_account_id
                    ? 'Link a Stripe account to enable withdrawals'
                    : `Available: $${cashBalance.toFixed(2)} (Arena Currency cannot be withdrawn)`}
              </p>
            </div>

            {/* KYC Banner */}
            {profile && profile.kyc_status !== 'verified' && (
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                profile.kyc_status === 'pending' ? 'border-blue-500/25 bg-blue-500/5' :
                profile.kyc_status === 'rejected' ? 'border-red-500/25 bg-red-500/5' :
                'border-amber-500/25 bg-amber-500/5'
              }`}>
                <div className="space-y-0.5">
                  <p className={`text-sm font-medium ${
                    profile.kyc_status === 'pending' ? 'text-blue-500' :
                    profile.kyc_status === 'rejected' ? 'text-red-500' :
                    'text-amber-500'
                  }`}>
                    {profile.kyc_status === 'pending' ? 'Identity Verification Pending' :
                     profile.kyc_status === 'rejected' ? 'Identity Verification Failed' :
                     'Identity Verification Required'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.kyc_status === 'pending' 
                      ? 'Your documents are currently under review. This usually takes 1-2 business days.' 
                      : profile.kyc_status === 'rejected'
                      ? 'We could not verify your identity. Please try again with clearer documents.'
                      : 'You must verify your identity (KYC) before you can withdraw funds.'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setKycDialogOpen(true)}
                  className={`shrink-0 ${
                    profile.kyc_status === 'pending' ? 'border-blue-500/30 text-blue-500 hover:bg-blue-500/10' :
                    profile.kyc_status === 'rejected' ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' :
                    'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                  }`}
                >
                  {profile.kyc_status === 'pending' ? 'Check Status' :
                   profile.kyc_status === 'rejected' ? 'Try Again' :
                   'Verify Identity'}
                </Button>
              </div>
            )}

            {/* Onboarding incomplete banner */}
            {profile?.kyc_status === 'verified' && profile?.stripe_connect_account_id && onboardingIncomplete && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-amber-400">Payout account setup incomplete</p>
                  <p className="text-xs text-muted-foreground">Your Stripe account isn't fully verified yet. Complete onboarding to enable withdrawals.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResumeOnboarding}
                  disabled={isWithdrawLoading}
                  className="shrink-0 gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  {isWithdrawLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Complete Setup
                </Button>
              </div>
            )}

            {profile?.kyc_status === 'verified' && profile?.stripe_connect_account_id && !onboardingIncomplete ? (
              <div className="space-y-4">
                {/* Withdrawal Summary Card */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Available balance</span>
                    <span className="font-mono font-semibold">${cashBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Arena Currency (not withdrawable)</span>
                    <span className="font-mono font-semibold">{formatArenaCurrency(arenaCurrency)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">You withdraw</span>
                    <span className="font-mono font-bold text-lg">${Math.min(parseFloat(withdrawAmount || '0') || 0, cashBalance).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Withdrawal fee</span>
                    <span className="font-mono text-sm">$0.00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-background/60 p-3 border border-border">
                    <span className="text-sm font-semibold">Net payout</span>
                    <span className="font-mono font-bold text-xl text-primary">${Math.min(parseFloat(withdrawAmount || '0') || 0, cashBalance).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Withdrawals are available only from tournament winnings and creator fees. Arena Currency deposits cannot be withdrawn.
                  </p>
                </div>

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
              </div>
            ) : profile?.kyc_status === 'verified' && !profile?.stripe_connect_account_id ? (
              <Button
                onClick={handleAction}
                variant="outline"
                disabled={isWithdrawLoading}
                className="gap-2"
              >
                {isWithdrawLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
                Connect Stripe
              </Button>
            ) : null}
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
            {orders.slice(0, 5).map((order, idx) => {
              const isWithdrawal = order.record_type === 'withdrawal';
              const amount = isWithdrawal ? Number(order.amount) : Number(order.total_amount);
              const label = isWithdrawal ? `Withdrawal #${order.id.slice(0, 8)}` : `Order #${order.id.slice(0, 8)}`;
              const status = isWithdrawal ? order.status : order.status;
              return (
                <div key={`${order.id}-${idx}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className={`text-sm font-semibold font-mono ${isWithdrawal ? 'text-destructive' : ''}`}>
                      {isWithdrawal ? '-' : ''}${amount.toFixed(2)}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      status === 'completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                      status === 'pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                      'bg-destructive/15 text-destructive'
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
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
