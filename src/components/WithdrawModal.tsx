import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Building2, CreditCard, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function';

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableBalance: number;
  currency: string;
}

export function WithdrawModal({ open, onOpenChange, onSuccess, availableBalance, currency }: WithdrawModalProps) {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [hasConnectAccount, setHasConnectAccount] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && profile) {
      setHasConnectAccount(!!profile.stripe_connect_account_id);
      setLoading(false);
    }
  }, [open, profile]);

  const handleConnectAccount = async () => {
    setProcessing(true);

    try {
      const { data, error } = await invokeEdgeFunction<{ url?: string }>('create-connect-account', { body: {} });

      if (error) throw error;

      // Redirect to Stripe Connect onboarding
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Connect account error:', err);
      toast.error(err.message || 'Failed to set up payout account');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await invokeEdgeFunction<{ queued?: boolean; message?: string }>('create-payout', {
        body: { amount: withdrawAmount, currency: currency.toLowerCase() },
      });

      if (error) throw error;

      if (data?.queued) {
        toast.success(data.message || 'Your withdrawal has been received and is being processed. This should take about 10 minutes.');
      } else {
        toast.success('Withdrawal initiated — arriving within 2 business days');
      }
      onSuccess();
      onOpenChange(false);
      setAmount('');
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      toast.error(err.message || 'Withdrawal failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !processing && onOpenChange(false)}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          />

          {/* Modal Card - Centered on PC, Slide-up on Mobile */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed md:relative bottom-0 md:bottom-auto left-0 right-0 md:left-auto md:right-auto z-50 bg-background border border-border rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:w-full md:max-w-2xl"
          >
            <div className="p-6 space-y-6">
              {/* Close Button */}
              <button
                onClick={() => onOpenChange(false)}
                disabled={processing}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-6 w-6" />
              </button>

              {loading ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : !hasConnectAccount ? (
                // Onboarding Screen
                <div className="py-8 space-y-6">
                  <h2 
                    className="text-2xl font-bold"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    Set Up Payouts
                  </h2>

                  <p className="text-muted-foreground">
                    Connect your account to receive tournament winnings directly. 
                    Stripe supports bank accounts, debit cards, and mobile money worldwide.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">Bank Account</span>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col items-center gap-2">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">Debit Card</span>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col items-center gap-2">
                      <Smartphone className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">M-Pesa</span>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col items-center gap-2">
                      <Smartphone className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">Airtel Money</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleConnectAccount}
                    disabled={processing}
                    className="sheen-effect w-full py-6 text-lg font-bold gap-2 transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)',
                      border: 0,
                    }}
                  >
                    {processing ? 'CONNECTING...' : 'CONNECT PAYOUT ACCOUNT'}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                // Withdrawal Form
                <div className="space-y-6">
                  <h2 
                    className="text-2xl font-bold pt-2"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    Withdraw Funds
                  </h2>

                  {/* Withdrawal Method */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Withdrawal Method
                    </Label>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-violet-500" />
                        </div>
                        <div>
                          <p className="font-medium">Connected Account</p>
                          <p className="text-xs text-muted-foreground">Stripe Connect</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                        {currency}
                      </span>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-12 py-6 text-lg font-mono"
                        min="0"
                        max={availableBalance}
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available: {currency}{availableBalance.toFixed(2)}
                    </p>
                  </div>

                  {/* Estimated Arrival */}
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      <strong>Estimated arrival:</strong> 1-2 business days for bank transfers, 
                      instant for cards
                    </p>
                  </div>

                  {/* Withdraw Button */}
                  <Button
                    onClick={handleWithdraw}
                    disabled={processing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
                    className="sheen-effect w-full py-6 text-lg font-bold transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)',
                      border: 0,
                    }}
                  >
                    {processing ? 'PROCESSING...' : `WITHDRAW ${currency}${parseFloat(amount || '0').toFixed(2)}`}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
