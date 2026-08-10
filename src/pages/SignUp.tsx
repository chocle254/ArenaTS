import { Check, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { EmailOTPVerification } from '@/components/EmailOTPVerification';
import { GAME_INFO, type GameType } from '@/types/database';

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

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [twitchHandle, setTwitchHandle] = useState('');
  const [location, setLocation] = useState('');
  const [selectedGames, setSelectedGames] = useState<GameType[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { user, loading: authLoading, signUpWithProfile, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % gameImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const locations = [
    { name: 'Nigeria', timezone: 'Africa/Lagos' },
    { name: 'Kenya', timezone: 'Africa/Nairobi' },
    { name: 'South Africa', timezone: 'Africa/Johannesburg' },
    { name: 'Egypt', timezone: 'Africa/Cairo' },
    { name: 'USA (East)', timezone: 'America/New_York' },
    { name: 'USA (West)', timezone: 'America/Los_Angeles' },
    { name: 'UK', timezone: 'Europe/London' },
    { name: 'China', timezone: 'Asia/Shanghai' },
    { name: 'India', timezone: 'Asia/Kolkata' },
    { name: 'Brazil', timezone: 'America/Sao_Paulo' },
  ];
  const [gameAccounts, setGameAccounts] = useState<Record<GameType, string>>({} as Record<GameType, string>);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageError, setAgeError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const toggleGame = (game: GameType) => {
    if (selectedGames.includes(game)) {
      setSelectedGames(selectedGames.filter(g => g !== game));
      const newAccounts = { ...gameAccounts };
      delete newAccounts[game];
      setGameAccounts(newAccounts);
    } else {
      setSelectedGames([...selectedGames, game]);
    }
  };

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

    if (selectedGames.length === 0) {
      toast.error('Please select at least one game');
      return;
    }

    // Validate full name
    if (!fullName || fullName.trim() === '') {
      toast.error('Please enter your full name');
      return;
    }

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate gamertag is provided and format
    if (!gamertag || gamertag.trim() === '') {
      toast.error('Please enter your gamertag');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(gamertag)) {
      toast.error('Gamertag can only contain letters, numbers, and underscores');
      return;
    }

    if (!location) {
      toast.error('Please select your location');
      return;
    }

    // Validate all selected games have in-game names
    const missingGameAccounts = selectedGames.filter(game => !gameAccounts[game] || gameAccounts[game].trim() === '');
    if (missingGameAccounts.length > 0) {
      const gameNames = missingGameAccounts.map(g => GAME_INFO[g].name).join(', ');
      toast.error(`Please enter your in-game name for: ${gameNames}`);
      return;
    }

    if (!otpVerified) {
      setShowOtpDialog(true);
      return;
    }

    setLoading(true);

    try {
      let sanitizedTwitch = twitchHandle.trim();
      // Remove URL if provided
      if (sanitizedTwitch.includes('twitch.tv/')) {
        sanitizedTwitch = sanitizedTwitch.split('twitch.tv/').pop()?.split('/')[0] || sanitizedTwitch;
      }
      // Remove leading @
      sanitizedTwitch = sanitizedTwitch.replace(/^@/, '');

      const gameAccountsArray = selectedGames.map(game => ({
        game,
        inGameName: gameAccounts[game]
      }));

      const selectedLoc = locations.find(l => l.name === location);

      await signUpWithProfile({
        fullName: fullName.trim(),
        username: gamertag.trim(),
        email,
        password,
        gamertag: gamertag.trim(),
        twitchHandle: sanitizedTwitch,
        efootballId: gameAccounts['efootball' as GameType] || '',
        pubgId: gameAccounts['pubg_mobile' as GameType] || '',
        location: location,
        timezone: selectedLoc?.timezone || 'UTC',
        favoriteGames: selectedGames,
        gameAccounts: gameAccountsArray
      });

      toast.success('Account created successfully! You can now sign in.');
      navigate('/sign-in');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const games = Object.entries(GAME_INFO) as [GameType, typeof GAME_INFO[GameType]][];

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

      <Card className="w-full max-w-2xl backdrop-blur-card border-border relative overflow-hidden z-10">
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
              Create your account to start competing
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 md:px-10">
            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              {/* Full Name, Email and Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="md:text-sm">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="md:h-11 md:text-base"
                  />
                  <p className="text-xs text-muted-foreground">Your real name</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="md:text-sm">Email (Required for notifications)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="md:h-11 md:text-base"
                  />
                  <p className="text-xs text-muted-foreground">For tournament notifications</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" title="Password" className="md:text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="md:h-11 md:text-base"
                />
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>

              {/* Gamertag */}
              <div className="space-y-2">
                <Label htmlFor="gamertag" className="md:text-sm">Gamertag (Username) *</Label>
                <Input
                  id="gamertag"
                  type="text"
                  placeholder="Your gamertag"
                  value={gamertag}
                  onChange={(e) => setGamertag(e.target.value)}
                  required
                  disabled={loading}
                  className="md:h-11 md:text-base"
                />
                <p className="text-xs text-muted-foreground">This will be your username and display name</p>
              </div>

              {/* Twitch Handle */}
              <div className="space-y-2">
                <Label htmlFor="twitchHandle" className="md:text-sm">Twitch Username (Optional)</Label>
                <Input
                  id="twitchHandle"
                  type="text"
                  placeholder="e.g. your_twitch_channel"
                  value={twitchHandle}
                  onChange={(e) => setTwitchHandle(e.target.value)}
                  disabled={loading}
                  className="md:h-11 md:text-base"
                />
                <p className="text-xs text-muted-foreground">Required for players who want to stream their matches</p>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="md:text-sm">Location *</Label>
                <select
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex h-10 md:h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={loading}
                >
                  <option value="" disabled>Select your location</option>
                  {locations.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name} ({loc.timezone})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Used for localized tournament schedules</p>
              </div>

              {/* Game Selection */}
              <div className="space-y-3 md:space-y-4">
                <Label className="text-base md:text-lg">Select Your Games</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {games.map(([gameKey, gameInfo]) => (
                    <button
                      key={gameKey}
                      type="button"
                      onClick={() => toggleGame(gameKey)}
                      disabled={loading}
                      title={gameInfo.name}
                      className={`relative p-3 md:p-4 rounded-lg border-2 transition-all duration-200 flex flex-row md:flex-col items-center gap-4 md:gap-2 text-left md:text-center ${
                        selectedGames.includes(gameKey)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <img 
                        src={gameInfo.icon} 
                        alt={gameInfo.name} 
                        className="h-10 w-10 md:h-12 md:w-12 object-contain" 
                      />
                      <span className="font-medium text-sm md:text-xs leading-tight break-words flex-1 md:w-full overflow-hidden">{gameInfo.name}</span>
                      {selectedGames.includes(gameKey) && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* In-Game Names */}
              {selectedGames.length > 0 && (
                <div className="space-y-3 md:space-y-4">
                  <Label className="text-base md:text-lg">In-Game Names (Required) *</Label>
                  <p className="text-xs text-muted-foreground">Enter your username for each selected game</p>
                  <div className="space-y-3 md:space-y-4">
                    {selectedGames.map((game) => (
                      <div key={game} className="flex items-center gap-3">
                        <Badge variant="outline" className="gap-2 shrink-0 px-3 py-1.5 h-9 md:h-10">
                          <img 
                            src={GAME_INFO[game].icon} 
                            alt={GAME_INFO[game].name} 
                            className="h-4 w-4 object-contain" 
                          />
                          <span className="text-xs md:text-sm">{GAME_INFO[game].name}</span>
                        </Badge>
                        <Input
                          type="text"
                          placeholder={`Your ${GAME_INFO[game].name} username *`}
                          value={gameAccounts[game] || ''}
                          onChange={(e) => setGameAccounts({ ...gameAccounts, [game]: e.target.value })}
                          disabled={loading}
                          required
                          className="flex-1 md:h-10 md:text-base"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Age Confirmation Checkbox */}
              <div className="space-y-1.5 pt-2 md:pt-4">
                <div className="flex items-center space-x-2">
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
                    className={`text-sm md:text-base leading-none cursor-pointer select-none ${ageError ? 'text-destructive' : 'text-muted-foreground'}`}
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

              {/* Terms Checkbox */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm md:text-base text-muted-foreground leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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

              <Button type="submit" className="w-full md:h-12 md:text-lg font-bold uppercase tracking-wider sheen-effect" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {otpVerified ? 'Create Account' : 'Verify Email to Continue'}
              </Button>

              <EmailOTPVerification
                email={email}
                purpose="signup"
                open={showOtpDialog}
                onOpenChange={setShowOtpDialog}
                onVerified={() => {
                  setOtpVerified(true);
                  setShowOtpDialog(false);
                  toast.success('Email verified. Complete your registration below.');
                }}
                onCancel={() => {
                  setOtpVerified(false);
                }}
              />

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#08090E] px-2 text-muted-foreground">Or sign up with</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full md:h-12 md:text-base font-medium bg-transparent border-border hover:bg-white/5" 
                onClick={signInWithGoogle}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 pb-8 md:pb-10">
            <div className="text-sm md:text-base text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/sign-in" className="text-primary hover:underline font-bold transition-all">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </div>
      </Card>
    </div>
  );
}
