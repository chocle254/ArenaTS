import { Eye, EyeOff, Loader2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from '@/components/layouts/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { invokeEdgeFunction } from '@/lib/edge-function';

const RESEND_DELAY_SECONDS = 30;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState<'email' | 'reset'>('email');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async () => {
    const typed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed)) {
      toast.error('Enter the email you signed up with');
      return;
    }
    setLoading(true);
    const { error } = await invokeEdgeFunction('send-otp', { body: { email: typed, purpose: 'reset' } });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmail(typed);
    setStep('reset');
    setResendIn(RESEND_DELAY_SECONDS);
    toast.success('If that email has an Arena account, a code is on its way.');
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return toast.error('Enter the 6-digit code from the email');
    if (password.length < 6) return toast.error('Use a password with at least 6 characters');
    if (password !== confirm) return toast.error('The two passwords don’t match');
    setLoading(true);
    const { error } = await invokeEdgeFunction('reset-password', { body: { email, code: code.trim(), password } });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password changed. Sign in with your new password.');
    navigate('/sign-in', { replace: true });
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle={step === 'email' ? 'We’ll email you a 6-digit code.' : `Enter the code we sent to ${email} and choose a new password.`}
      footer={
        <>
          Remembered it?{' '}
          <Link to="/sign-in" className="font-semibold text-primary-soft hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {step === 'email' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-11"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Send code
          </Button>
          <p className="text-center text-xs text-muted-foreground">Signed up with Google? You can also use this to add a password.</p>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="reset-code">Code</Label>
            <Input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              className="h-11 tracking-[0.3em]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Repeat new password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              className="h-11"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Change password
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setStep('email')} disabled={loading}>
              Use another email
            </button>
            <button type="button" className="font-semibold text-primary-soft hover:underline disabled:opacity-50 disabled:no-underline" onClick={sendCode} disabled={loading || resendIn > 0}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
