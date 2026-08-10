import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { EmailOTPVerification } from '@/components/EmailOTPVerification';

const gameImages = [
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4246118f-7c56-4af3-bc4d-6569d919b747.jpg',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_53b14c7a-e619-4f00-b987-30b739f4d9c9.jpg',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_25d11a1c-2f1f-4443-9184-d919d94773d6.jpg',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_e4c1e073-74ae-4bec-8085-b4dca2dcaafb.jpg',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_02794336-690f-44fb-a785-26860e281ddd.jpg',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_bb3c46c4-4b28-4674-b83f-6f5f2a49a16b.jpg',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_cda025e9-4c89-4b3b-9506-e810cafb422b.jpg',
  'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_7e6cc118-4607-4e0f-acfc-ea0b0f627f18.jpg'
];

export default function SignIn() {
  const [usernameOrEmail, setUsernameOrEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [ageConfirmed, setAgeConfirmed] = React.useState(false);
  const [ageError, setAgeError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [showOtpDialog, setShowOtpDialog] = React.useState(false);
  const [pendingEmail, setPendingEmail] = React.useState('');
  const { user, loading: authLoading, signIn, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailConfirmed = searchParams.get('confirmed') === 'true';

  // Supabase auto-establishes a session when the confirmation link is
  // clicked. Sign that session back out so the user lands on this page
  // and has to explicitly log in, then let them know why they're here.
  React.useEffect(() => {
    if (!emailConfirmed) return;
    signOut().finally(() => {
      toast.success('Email confirmed! You can now sign in.');
      setSearchParams({}, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailConfirmed]);

  React.useEffect(() => {
    if (!authLoading && user && !emailConfirmed && !showOtpDialog) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate, emailConfirmed, showOtpDialog]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % gameImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ageConfirmed) {
      setAgeError(true);
      toast.error('You must confirm you are 18 years of age or older');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the Terms and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      const resolvedEmail = await signIn(usernameOrEmail, password);
      setPendingEmail(resolvedEmail);
      setShowOtpDialog(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#08090E]">
      {/* PC Background Slideshow - Only on Desktop */}
      <div className="hidden md:block absolute inset-0 z-0">
        {gameImages.map((image, index) => (
          <div
            key={image}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${image})`,
              opacity: index === currentImageIndex ? 0.4 : 0,
            }}
          />
        ))}
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090E] via-transparent to-[#08090E]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090E]/60 via-transparent to-[#08090E]/60" />
      </div>

      <Card className="w-full max-w-md backdrop-blur-card border-border relative overflow-hidden z-10">
        {/* Gradient Background - matching button gradient but faded */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, #2563eb 0%, #9333ea 50%, #2563eb 100%)'
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          <CardHeader className="space-y-2 pb-6 md:pb-8">
            <CardTitle className="text-3xl md:text-4xl font-display text-center gradient-text">
              ARENA
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground md:text-base">
              Sign in to your account to compete
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 md:px-10">
            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="usernameOrEmail" className="md:text-sm">Email or Gamertag</Label>
                <Input
                  id="usernameOrEmail"
                  type="text"
                  placeholder="email@example.com or gamertag"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="md:h-11 md:text-base"
                />
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="password" title="Password" className="md:text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="md:h-11 md:text-base"
                />
              </div>
              {/* Age Confirmation Checkbox */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="age-confirm"
                    checked={ageConfirmed}
                    onCheckedChange={(checked) => {
                      setAgeConfirmed(checked as boolean);
                      if (checked) setAgeError(false);
                    }}
                    className={ageError ? 'border-destructive' : ''}
                  />
                  <label
                    htmlFor="age-confirm"
                    className={`text-sm leading-none cursor-pointer select-none ${ageError ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    I confirm that I am <span className="font-semibold text-foreground">18 years of age or older</span>
                  </label>
                </div>
                {ageError && (
                  <p className="text-xs text-destructive pl-6">
                    You must confirm you are 18 years of age or older
                  </p>
                )}
              </div>

              {/* Terms & Privacy Checkbox */}
              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the{' '}
                  <Link to="/terms" className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors" target="_blank">
                    Terms &amp; Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors" target="_blank">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button type="submit" className="w-full md:h-11 md:text-base font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#08090E] px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full md:h-11 md:text-base font-medium bg-transparent border-border hover:bg-white/5" 
                onClick={signInWithGoogle}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </Button>

              <EmailOTPVerification
                email={pendingEmail}
                purpose="signin"
                open={showOtpDialog}
                onOpenChange={setShowOtpDialog}
                onVerified={() => {
                  setShowOtpDialog(false);
                  toast.success('Welcome back to ARENA!');
                  navigate('/dashboard', { replace: true });
                }}
                onCancel={() => {
                  // Don't leave a half-authenticated session hanging around
                  signOut();
                  setShowOtpDialog(false);
                }}
              />
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 pb-8 md:pb-10">
            <div className="text-sm md:text-base text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/sign-up" className="gradient-primary-text hover:underline font-semibold transition-all">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </div>
      </Card>
    </div>
  );
}
