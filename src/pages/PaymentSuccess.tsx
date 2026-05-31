import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error'>('success');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
      setStatus('error');
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify_stripe_payment', {
        body: { sessionId }
      });

      if (error) throw error;

      if (data.code === 'SUCCESS' && data.data.verified) {
        setStatus('success');
        setDetails(data.data);
        toast.success('Payment verified successfully!');
      } else {
        setStatus('error');
        toast.error('Payment verification failed');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      setStatus('error');
      toast.error('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-2xl font-bold">Verifying your payment...</h2>
        <p className="text-muted-foreground">Please do not close this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[70vh] font-montserrat">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="text-center overflow-hidden border-border shadow-xl">
          <div className={`h-2 w-full ${status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <CardHeader>
            <div className="flex justify-center mb-4">
              {status === 'success' ? (
                <CheckCircle2 className="h-20 w-20 text-emerald-500" />
              ) : (
                <XCircle className="h-20 w-20 text-rose-500" />
              )}
            </div>
            <CardTitle className="text-3xl font-bold">
              {status === 'success' ? 'Payment Successful!' : 'Payment Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              {status === 'success' 
                ? 'Your Arena Currency has been added to your wallet successfully.' 
                : 'Something went wrong while verifying your payment. Please contact support if the issue persists.'}
            </p>

            {details && (
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session ID</span>
                  <span className="font-mono text-[10px] truncate max-w-[150px]">{details.sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold">{(details.amount / 100).toFixed(2)} {details.currency?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-emerald-500 font-bold uppercase">{details.status}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/wallet')} className="w-full font-bold h-12">
                Back to Wallet
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/tournaments')} className="w-full h-12">
                Browse Tournaments
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
