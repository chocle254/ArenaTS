import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightLeft, Check, CreditCard, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';
import { CURRENCIES, type CurrencyCode, convertFromUSD, convertToUSD, formatCurrencyAmount } from '@/lib/currency';

interface AddFundsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currency: CurrencyCode;
}

const QUICK_AMOUNTS_USD = [5, 10, 25, 50, 100];

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: '"Inter", sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      backgroundColor: '#0F1118',
      '::placeholder': {
        color: '#6b7280',
      },
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
};

export function AddFundsModal({ open, onOpenChange, onSuccess, currency }: AddFundsModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [selectedAmountUSD, setSelectedAmountUSD] = useState(25);
  const [customAmountLocal, setCustomAmountLocal] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // Calculate amounts in both currencies
  const amountInLocalCurrency = customAmountLocal 
    ? parseFloat(customAmountLocal) 
    : convertFromUSD(selectedAmountUSD, currency);
  
  const amountInUSD = customAmountLocal 
    ? convertToUSD(parseFloat(customAmountLocal), currency)
    : selectedAmountUSD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (amountInUSD < 5) {
      const minInLocal = convertFromUSD(5, currency);
      setError(`Minimum amount is ${formatCurrencyAmount(minInLocal, currency)} (≈ $5 USD)`);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Create payment intent (always in USD for Stripe)
      const { data, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount: amountInUSD, currency: 'usd' },
      });

      if (intentError) throw intentError;

      const { clientSecret } = data;

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Show success animation
      setShowSuccess(true);
      
      // Wait for animation then close
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        onOpenChange(false);
        toast.success('Funds added successfully');
        
        // Reset form
        setSelectedAmountUSD(25);
        setCustomAmountLocal('');
      }, 2000);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getQuickAmountInLocalCurrency = (usdAmount: number) => {
    return convertFromUSD(usdAmount, currency);
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
            {showSuccess ? (
              // Success Animation
              <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                  className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6"
                >
                  <motion.div
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Check className="w-12 h-12 text-green-500" strokeWidth={3} />
                  </motion.div>
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-green-500"
                >
                  Payment Successful!
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mt-2"
                >
                  Your balance has been updated
                </motion.p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={processing}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Title */}
                <h2 
                  className="text-2xl font-bold pt-2"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Add Funds
                </h2>

                {/* Currency Info Banner */}
                {currency !== 'USD' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <ArrowRightLeft className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Amounts will be converted to USD for processing. Current rate: 1 USD = {formatCurrencyAmount(CURRENCIES[currency].rate, currency)}
                    </p>
                  </div>
                )}

                {/* Amount Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Select Amount (USD)</Label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS_USD.map((usdAmt) => {
                      return (
                        <button
                          key={usdAmt}
                          type="button"
                          onClick={() => {
                            setSelectedAmountUSD(usdAmt);
                            setCustomAmountLocal('');
                          }}
                          className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                            selectedAmountUSD === usdAmt && !customAmountLocal
                              ? 'bg-violet-600 text-white border-2 border-violet-500'
                              : 'bg-muted text-foreground border-2 border-transparent hover:border-border'
                          }`}
                        >
                          ${usdAmt}
                        </button>
                      );
                    })}
                    <Input
                      type="number"
                      placeholder="Custom"
                      value={customAmountLocal}
                      onChange={(e) => setCustomAmountLocal(e.target.value)}
                      className={`w-32 px-6 py-2.5 rounded-full font-medium ${
                        customAmountLocal
                          ? 'border-2 border-violet-500 bg-violet-600/10'
                          : 'border-2 border-transparent bg-muted'
                      }`}
                      min="5"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum: $5 USD
                  </p>
                </div>

                {/* Conversion Display */}
                {currency !== 'USD' && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">You pay:</span>
                      <span className="font-bold">{formatCurrencyAmount(amountInLocalCurrency, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Converted to USD:</span>
                      <span className="font-bold text-primary">${amountInUSD.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Card Input */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Card Details</Label>
                  <div 
                    className="p-4 rounded-xl border-2 transition-colors"
                    style={{
                      backgroundColor: '#0F1118',
                      borderColor: 'rgba(124, 58, 237, 0.4)',
                    }}
                  >
                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                  </div>
                </div>

                {/* Payment Icons */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Accepted:</span>
                  <div className="flex gap-2">
                    <div className="px-2 py-1 bg-muted rounded text-xs font-semibold">VISA</div>
                    <div className="px-2 py-1 bg-muted rounded text-xs font-semibold">MC</div>
                    <div className="px-2 py-1 bg-muted rounded text-xs font-semibold">AMEX</div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!stripe || processing || amountInUSD < 5}
                  className="sheen-effect w-full py-6 text-lg font-bold transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)',
                    border: 0,
                  }}
                >
                  {processing ? 'PROCESSING...' : currency !== 'USD' ? `PAY ${formatCurrencyAmount(amountInLocalCurrency, currency)}` : `PAY $${amountInUSD.toFixed(2)}`}
                </Button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
