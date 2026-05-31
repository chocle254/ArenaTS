import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import { ConsentModal } from './ConsentModal';

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  game: string;
  stake_amount: number;
  prize_pool: number;
  platform_fee: number;
  expires_at: string;
  challenger: {
    gamertag: string;
    avatar_url: string | null;
    wins: number;
    losses: number;
  };
  opponent: {
    gamertag: string;
    avatar_url: string | null;
    wins: number;
    losses: number;
  };
}

interface IncomingChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
}

const GAME_LABELS: Record<string, string> = {
  codm: 'Call of Duty Mobile',
  fortnite: 'Fortnite',
  valorant: 'Valorant',
  apex: 'Apex Legends',
  warzone: 'Warzone',
  fifa: 'FIFA',
  injustice: 'Injustice',
  mortal_kombat: 'Mortal Kombat',
  efootball: 'eFootball',
  pubg_mobile: 'PUBG Mobile'
};

export function IncomingChallengeModal({ open, onOpenChange, challenge }: IncomingChallengeModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const hasToastedExpired = useRef<string | null>(null);

  useEffect(() => {
    if (!challenge || !open) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(challenge.expires_at).getTime();
      const diff = Math.max(0, expiresAt - now);
      
      setTimeLeft(Math.floor(diff / 1000));

      if (diff <= 0 && hasToastedExpired.current !== challenge.id) {
        hasToastedExpired.current = challenge.id;
        toast.error('Challenge expired');
        onOpenChange(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [challenge, open, onOpenChange]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const executeAccept = async () => {
    if (!challenge || !profile) return;
    setAccepting(true);

    try {
      // Fetch latest balance
      const { data: latestProfile } = await supabase
        .from('profiles')
        .select('arena_currency, available_balance')
        .eq('id', profile.id)
        .single();
      
      const currentBalance = latestProfile?.arena_currency || 0;
      const currentAvailable = latestProfile?.available_balance || 0;

      if (challenge.stake_amount > 0 && currentBalance < challenge.stake_amount) {
        throw new Error(`Insufficient Arena Currency. You need ${formatArenaCurrency(challenge.stake_amount)} to accept this challenge.`);
      }

      // Deduct balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          arena_currency: currentBalance - challenge.stake_amount,
          available_balance: currentAvailable - challenge.stake_amount
        })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'challenge_fee',
        amount: -challenge.stake_amount,
        description: `Stake for challenge from: ${challenge.challenger.gamertag}`,
        status: 'completed',
        challenge_id: challenge.id
      });

      await refreshProfile();

      const { error } = await supabase
        .from('challenges')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', challenge.id);

      if (error) {
        // Refund if update fails
        await supabase
          .from('profiles')
          .update({ 
            arena_currency: currentBalance,
            available_balance: currentAvailable
          })
          .eq('id', profile.id);
        
        // Remove the transaction record
        await supabase.from('transactions')
          .delete()
          .eq('user_id', profile.id)
          .eq('challenge_id', challenge.id)
          .eq('type', 'challenge_fee');

        throw error;
      }

      toast.success('Challenge accepted! Match starting soon...');
      setConsentOpen(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error accepting challenge:', error);
      toast.error(error.message || 'Failed to accept challenge');
    } finally {
      setAccepting(false);
    }
  };

  const handleAccept = async () => {
    if (!challenge || !profile) return;

    // Check balance
    const currentBalance = profile.arena_currency || 0;
    if (currentBalance < challenge.stake_amount) {
      toast.error(`Insufficient Arena Currency. You need ${formatArenaCurrency(challenge.stake_amount)} to accept this challenge.`);
      return;
    }

    setConsentOpen(true);
  };

  const handleDecline = async () => {
    if (!challenge) return;

    setDeclining(true);

    try {
      const { error } = await supabase
        .from('challenges')
        .update({ status: 'declined' })
        .eq('id', challenge.id);

      if (error) throw error;

      toast.success('Challenge declined');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error declining challenge:', error);
      toast.error(error.message || 'Failed to decline challenge');
    } finally {
      setDeclining(false);
    }
  };

  if (!challenge) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 
                  className="text-2xl font-bold"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  CHALLENGE RECEIVED
                </h2>
                <div className="flex items-center gap-3">
                  {/* Timer */}
                  <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30">
                    <div className="w-2 h-2 bg-red-500 rounded-full pulse-dot" />
                    <span className="text-sm font-mono font-semibold text-red-500">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Players */}
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  {/* Challenger */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <Avatar className="h-20 w-20 ring-2 ring-border">
                      <AvatarImage src={challenge.challenger.avatar_url || ''} />
                      <AvatarFallback className="bg-muted text-foreground text-2xl">
                        {challenge.challenger.gamertag[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="font-semibold">{challenge.challenger.gamertag}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCompactNumber(challenge.challenger.wins)}W - {formatCompactNumber(challenge.challenger.losses)}L
                      </p>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-3xl font-bold text-muted-foreground" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    VS
                  </div>

                  {/* Current User */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <Avatar className="h-20 w-20 ring-2 ring-border">
                      <AvatarImage src={challenge.opponent.avatar_url || ''} />
                      <AvatarFallback className="bg-muted text-foreground text-2xl">
                        {challenge.opponent.gamertag[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="font-semibold">{challenge.opponent.gamertag}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCompactNumber(challenge.opponent.wins)}W - {formatCompactNumber(challenge.opponent.losses)}L
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Stake */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stake</p>
                    <p className="text-xl font-bold font-mono">{formatArenaCurrency(challenge.stake_amount)}</p>
                  </div>

                  {/* Game */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Game</p>
                    <p className="text-sm font-semibold truncate">{GAME_LABELS[challenge.game]}</p>
                  </div>

                  {/* Mode */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mode</p>
                    <p className="text-sm font-semibold">
                      {(challenge as any).challenger_team_id ? '5v5 Team Match' : '1v1 Duel'}
                    </p>
                  </div>

                  {/* Prize Pool */}
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Prize Pool</p>
                    <p className="text-xl font-bold font-mono text-green-600 dark:text-green-400">
                      {formatArenaCurrency(challenge.prize_pool)}
                    </p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAccept}
                    disabled={accepting || declining}
                    className="flex-1 py-6 text-base font-bold relative overflow-hidden accept-button"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #22D3EE 100%)',
                      border: 0
                    }}
                  >
                    {accepting ? 'Accepting...' : 'ACCEPT CHALLENGE'}
                  </Button>

                  <Button
                    onClick={handleDecline}
                    disabled={accepting || declining}
                    variant="outline"
                    className="flex-1 py-6 text-base font-bold border-2 border-red-500 text-red-500 hover:bg-red-500/10"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {declining ? 'Declining...' : 'DECLINE'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Animations */}
          <style>{`
            .pulse-dot {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }

            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }

            .accept-button::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 50%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
              animation: sheen 3s infinite;
            }

            @keyframes sheen {
              0% {
                transform: translateX(-100%) skewX(-15deg);
              }
              100% {
                transform: translateX(400%) skewX(-15deg);
              }
            }
          `}</style>

          {consentOpen && (
            <ConsentModal
              open={consentOpen}
              onOpenChange={setConsentOpen}
              title={`Accept Challenge from ${challenge.challenger.gamertag}`}
              description={`You are about to accept this challenge. The stake amount will be deducted from your balance.`}
              amount={challenge.stake_amount}
              onConfirm={executeAccept}
              loading={accepting}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
