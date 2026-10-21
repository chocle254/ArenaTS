import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmailOTPVerification } from '@/components/EmailOTPVerification';
import { AuthShell, GoogleIcon } from '@/components/layouts/AuthShell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { savePendingGameAccounts } from '@/lib/pending-game-accounts';
import { clearRefCode, normalizeRefCode, readRefCode, saveRefCode } from '@/lib/referral';
import { safeNextPath } from '@/lib/safe-redirect';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gamertag, setGamertag] = useState('');
  const [twitchHandle, setTwitchHandle] = useState('');
  const [selectedGames, setSelectedGames] = useState<GameType[]>([]);
  const [gameAccounts, setGameAccounts] = useState<Partial<Record<GameType, string>>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageError, setAgeError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const { user, loading: authLoading, signUpWithProfile, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const refParam = normalizeRefCode(searchParams.get('ref'));
  const [refCode, setRefCode] = useState(() => refParam || readRefCode());

  // Keep the invite code on this device in case they sign up with Google
  useEffect(() => {
    if (refParam) saveRefCode(refParam);
  }, [refParam]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(next, { replace: true });
    }
  }, [user, authLoading, navigate, next]);

  const toggleGame = (game: GameType) => {
    if (selectedGames.includes(game)) {
      setSelectedGames(selectedGames.filter((g) => g !== game));
      const updated = { ...gameAccounts };
      delete updated[game];
      setGameAccounts(updated);
    } else {
      setSelectedGames([...selectedGames, game]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) return toast.error('Enter your full name');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email address');
    if (password.length < 6) return toast.error('Use a password with at least 6 characters');
    if (!gamertag.trim()) return toast.error('Choose a gamertag');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(gamertag.trim())) return toast.error('Gamertags are 3–20 letters, numbers or underscores');
    if (selectedGames.length === 0) return toast.error('Pick at least one game you play');
    const missing = selectedGames.filter((g) => !gameAccounts[g]?.trim());
    if (missing.length > 0) return toast.error(`Add your in-game name for ${missing.map((g) => GAME_INFO[g].name).join(', ')}`);
    if (!ageConfirmed) {
      setAgeError(true);
      return toast.error('You must confirm you are 18 or older');
    }
    if (!agreedToTerms) return toast.error('Agree to the Terms and Privacy Policy to continue');

    if (!otpVerified) {
      setShowOtpDialog(true);
      return;
    }

    setLoading(true);
    try {
      let sanitizedTwitch = twitchHandle.trim();
      if (sanitizedTwitch.includes('twitch.tv/')) {
        sanitizedTwitch = sanitizedTwitch.split('twitch.tv/').pop()?.split('/')[0] || sanitizedTwitch;
      }
      sanitizedTwitch = sanitizedTwitch.replace(/^@/, '');

      const gameAccountsArray = selectedGames.map((game) => ({ game, inGameName: (gameAccounts[game] || '').trim() }));

      // If email confirmation is required there's no session yet, so the
      // game_accounts insert inside signUpWithProfile is rejected by RLS.
      // Keep them on this device and save them on first sign-in.
      savePendingGameAccounts(email, gameAccountsArray);

      await signUpWithProfile({
        fullName: fullName.trim(),
        username: gamertag.trim(),
        email: email.trim(),
        password,
        gamertag: gamertag.trim(),
        twitchHandle: sanitizedTwitch,
        efootballId: gameAccounts.efootball || '',
        pubgId: gameAccounts.pubg_mobile || '',
        // Arena is Kenya-only for now
        location: 'Kenya',
        timezone: 'Africa/Nairobi',
        favoriteGames: selectedGames,
        gameAccounts: gameAccountsArray,
        referralCode: normalizeRefCode(refCode) || undefined,
      });
      clearRefCode();

      toast.success('Account created. Welcome to Arena!');
      navigate(next);
    } catch (error: any) {
      toast.error(error.message || 'Could not create your account');
    } finally {
      setLoading(false);
    }
  };

  const games = Object.entries(GAME_INFO) as [GameType, (typeof GAME_INFO)[GameType]][];

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your gamer profile once. Arena is for players in Kenya, with prizes in KES paid to M-Pesa."
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/sign-in${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-primary-soft hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gamertag">Gamertag</Label>
            <Input id="gamertag" autoComplete="username" value={gamertag} onChange={(e) => setGamertag(e.target.value)} disabled={loading} className="h-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); setOtpVerified(false); }} disabled={loading} className="h-11" />
          <p className="text-xs text-muted-foreground">We send match alerts and a sign-in code here.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              minLength={6}
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
          <p className="text-xs text-muted-foreground">At least 6 characters.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="refCode">Invite code (optional)</Label>
          <Input
            id="refCode"
            autoComplete="off"
            autoCapitalize="characters"
            value={refCode}
            onChange={(e) => {
              setRefCode(e.target.value.toUpperCase());
              if (e.target.value.trim()) saveRefCode(e.target.value);
              else clearRefCode();
            }}
            disabled={loading}
            maxLength={12}
            className="h-11 uppercase tracking-widest"
          />
          <p className="text-xs text-muted-foreground">
            {refCode ? 'You and your friend both get tournament ticket credit after your first M-Pesa deposit.' : 'Got a code from a friend? Add it here.'}
          </p>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="twitchHandle">
              Twitch <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="twitchHandle" placeholder="your_channel" value={twitchHandle} onChange={(e) => setTwitchHandle(e.target.value)} disabled={loading} className="h-11" />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Games you play</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {games.map(([key, info]) => {
              const selected = selectedGames.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleGame(key)}
                  disabled={loading}
                  aria-pressed={selected}
                  className={cn(
                    'relative flex min-h-[52px] items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors',
                    selected ? 'border-primary bg-primary/15' : 'border-border hover:border-primary/50',
                  )}
                >
                  <img src={info.icon} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" loading="lazy" />
                  <span className="min-w-0 flex-1 text-sm font-medium leading-tight">{info.name}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary-soft" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {selectedGames.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">In-game names</p>
            <p className="text-xs text-muted-foreground">Opponents and referees use these to find you in the match lobby.</p>
            {selectedGames.map((game) => (
              <div key={game} className="flex items-center gap-3">
                <img src={GAME_INFO[game].icon} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                <Input
                  aria-label={`${GAME_INFO[game].name} in-game name`}
                  placeholder={`${GAME_INFO[game].name} name or ID`}
                  value={gameAccounts[game] || ''}
                  onChange={(e) => setGameAccounts({ ...gameAccounts, [game]: e.target.value })}
                  disabled={loading}
                  className="h-11 flex-1"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
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
          {otpVerified ? 'Create account' : 'Verify email and continue'}
        </Button>

        <EmailOTPVerification
          email={email}
          purpose="signup"
          open={showOtpDialog}
          onOpenChange={setShowOtpDialog}
          onVerified={() => {
            setOtpVerified(true);
            setShowOtpDialog(false);
            toast.success('Email verified. Tap “Create account” to finish.');
          }}
          onCancel={() => setOtpVerified(false)}
        />

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
      </form>
    </AuthShell>
  );
}
