import { Eye, EyeOff, Loader2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmailOTPVerification } from '@/components/EmailOTPVerification';
import { AuthShell, GoogleIcon } from '@/components/layouts/AuthShell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { safeNextPath } from '@/lib/safe-redirect';
import { cn } from '@/lib/utils';

export default function SignIn() {
  const [usernameOrEmail, setUsernameOrEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [ageConfirmed, setAgeConfirmed] = React.useState(false);
  const [ageError, setAgeError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [showOtpDialog, setShowOtpDialog] = React.useState(false);
  const [pendingEmail, setPendingEmail] = React.useState('');
  // Set before signIn() so the session that arrives during password sign-in
  // can't trigger the redirect before the code dialog opens.
  const otpPendingRef = React.useRef(false);
  const { user, loading: authLoading, signIn, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailConfirmed = searchParams.get('confirmed') === 'true';
  const next = safeNextPath(searchParams.get('next'));

  // Supabase auto-establishes a session when the confirmation link is
  // clicked. Sign that session back out so the user lands on this page
  // and has to explicitly log in, then let them know why they're here.
  React.useEffect(() => {
    if (!emailConfirmed) return;
    signOut().finally(() => {
      toast.success('Email confirmed. You can sign in now.');
      setSearchParams({}, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailConfirmed]);

  React.useEffect(() => {
    if (!authLoading && user && !emailConfirmed && !showOtpDialog && !otpPendingRef.current) {
      navigate(next, { replace: true });
    }
  }, [user, authLoading, navigate, emailConfirmed, showOtpDialog, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      toast.error('Enter your email and password');
      return;
    }
    if (!ageConfirmed) {
      setAgeError(true);
      toast.error('You must confirm you are 18 or older');
      return;
    }
    if (!agreedToTerms) {
      toast.error('Agree to the Terms and Privacy Policy to continue');
      return;
    }

    setLoading(true);
    otpPendingRef.current = true;
    try {
      const resolvedEmail = await signIn(usernameOrEmail, password);
      setPendingEmail(resolvedEmail);
      setShowOtpDialog(true);
    } catch (error: any) {
      otpPendingRef.current = false;
      const msg = String(error?.message || '');
      toast.error(/invalid login credentials/i.test(msg) ? 'That email and password don’t match.' : msg || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to check in, report results and claim your winnings."
      footer={
        <>
          New to Arena?{' '}
          <Link to={`/sign-up${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-primary-soft hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="usernameOrEmail">Email</Label>
          <Input
            id="usernameOrEmail"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            disabled={loading}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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

        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id="age-confirm"
              checked={ageConfirmed}
              onCheckedChange={(checked) => {
                setAgeConfirmed(checked === true);
                if (checked) setAgeError(false);
              }}
              className={cn('mt-0.5', ageError && 'border-destructive')}
            />
            <label htmlFor="age-confirm" className={cn('cursor-pointer text-sm leading-snug', ageError ? 'text-destructive' : 'text-muted-foreground')}>
              I confirm I am <span className="font-semibold text-foreground">18 or older</span>
            </label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked === true)} className="mt-0.5" />
            <label htmlFor="terms" className="cursor-pointer text-sm leading-snug text-muted-foreground">
              I agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener" className="text-foreground underline underline-offset-4">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank" rel="noopener" className="text-foreground underline underline-offset-4">
                Privacy Policy
              </Link>
            </label>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Sign in
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">or</span>
          </div>
        </div>

        <Button type="button" variant="outline" size="lg" className="w-full" onClick={signInWithGoogle} disabled={loading}>
          <GoogleIcon />
          Continue with Google
        </Button>

        <EmailOTPVerification
          email={pendingEmail}
          purpose="signin"
          open={showOtpDialog}
          onOpenChange={setShowOtpDialog}
          onVerified={() => {
            otpPendingRef.current = false;
            setShowOtpDialog(false);
            toast.success('Welcome back to Arena!');
            navigate(next, { replace: true });
          }}
          onCancel={() => {
            // Don't leave a half-authenticated session hanging around
            otpPendingRef.current = false;
            signOut();
            setShowOtpDialog(false);
          }}
        />
      </form>
    </AuthShell>
  );
}
