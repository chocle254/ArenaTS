import { useEffect, useRef, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';

interface EmailOTPVerificationProps {
  email: string;
  purpose?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  onCancel?: () => void;
}

const RESEND_DELAY_SECONDS = 30;

export function EmailOTPVerification({
  email,
  purpose = 'signup',
  open,
  onOpenChange,
  onVerified,
  onCancel,
}: EmailOTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY_SECONDS);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setOtp('');
      setSent(false);
      setResendTimer(RESEND_DELAY_SECONDS);
      if (email) {
        sendCode(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, email]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const invokeEdgeFunction = async (name: string, body: object) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: sessionData.session ? `Bearer ${sessionData.session.access_token}` : '',
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }
    return result;
  };

  const sendCode = async (silent = false) => {
    if (!email) {
      toast.error('Email is required');
      return;
    }
    setSending(true);
    try {
      await invokeEdgeFunction('send-otp', { email, purpose });
      setSent(true);
      setResendTimer(RESEND_DELAY_SECONDS);
      if (!silent) {
        toast.success('Verification code sent to your email');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await invokeEdgeFunction('verify-otp', { email, code: otp, purpose, markVerified: true });
      toast.success('Email verified successfully');
      onVerified();
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      onCancel?.();
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
            Verify your email
          </DialogTitle>
          <DialogDescription className="text-center">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">{email}</span>. Enter it below to
            continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <Label htmlFor="otp-input" className="sr-only">
              Verification code
            </Label>
            <InputOTP
              id="otp-input"
              ref={inputRef}
              maxLength={6}
              value={otp}
              onChange={setOtp}
              disabled={loading || sending}
              className="gap-2"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Input type="hidden" value={email} />

          <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Code
          </Button>

          <div className="text-center text-sm">
            Didn't receive it?{' '}
            <button
              type="button"
              onClick={() => sendCode()}
              disabled={sending || resendTimer > 0}
              className="text-primary hover:underline disabled:opacity-50 disabled:hover:no-underline"
            >
              {sending ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
            </button>
          </div>

          {!sent && sending && (
            <p className="text-center text-xs text-muted-foreground">Sending verification code...</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
