import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Swords, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { invalidatePlayerProgress } from '@/hooks/use-player-progress';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import { acceptChallenge, friendlyChallengeError } from '@/lib/challenges';
import { XP_RULES } from '@/lib/progression';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';
import { ConsentModal } from './ConsentModal';

interface ChallengePlayer {
  gamertag: string;
  avatar_url: string | null;
  wins: number;
  losses: number;
}

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  game: string;
  stake_amount: number;
  prize_pool: number;
  platform_fee: number;
  expires_at: string;
  challenger_team_id?: string | null;
  challenger: ChallengePlayer;
  opponent: ChallengePlayer;
}

interface IncomingChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

function PlayerSide({ player, label }: { player: ChallengePlayer; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <Avatar className="h-16 w-16 ring-2 ring-border sm:h-20 sm:w-20">
        <AvatarImage src={player.avatar_url || undefined} />
        <AvatarFallback className="font-score text-2xl">{player.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 max-w-full">
        <p className="truncate font-score text-lg font-bold leading-tight">{player.gamertag}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-score text-sm">
          <span className="text-success">{formatCompactNumber(player.wins || 0)}W</span> <span className="text-destructive">{formatCompactNumber(player.losses || 0)}L</span>
        </p>
      </div>
    </div>
  );
}

export function IncomingChallengeModal({ open, onOpenChange, challenge }: IncomingChallengeModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const expiredFor = useRef<string | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!challenge || !open) return;
    const tick = () => {
      const diff = Math.max(0, new Date(challenge.expires_at).getTime() - Date.now());
      setTimeLeft(Math.floor(diff / 1000));
      if (diff <= 0 && expiredFor.current !== challenge.id) {
        expiredFor.current = challenge.id;
        setConsentOpen(false);
        toast.error('Challenge expired');
        onOpenChangeRef.current(false);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [challenge, open]);

  if (!challenge) return null;

  const balance = Number(profile?.arena_currency || 0);
  const gameName = GAME_INFO[challenge.game as GameType]?.name ?? challenge.game;
  const urgent = timeLeft <= 60;

  const executeAccept = async () => {
    if (!user) return;
    setAccepting(true);
    try {
      await acceptChallenge({ userId: user.id, challengeId: challenge.id, stake: Number(challenge.stake_amount), challengerTag: challenge.challenger.gamertag });
      invalidatePlayerProgress(user.id);
      await refreshProfile();
      toast.success('Challenge accepted', { description: 'Check in on the match page to start.' });
      setConsentOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error accepting challenge:', error);
      const message = friendlyChallengeError(error);
      toast.error(message, /not enough/i.test(message) ? { action: { label: 'Top up', onClick: () => navigate('/wallet') } } : undefined);
    } finally {
      setAccepting(false);
    }
  };

  const free = !(Number(challenge.stake_amount) > 0);

  const handleAccept = () => {
    if (free) {
      void executeAccept();
      return;
    }
    if (balance < challenge.stake_amount) {
      toast.error(`You need ${formatArenaCurrency(challenge.stake_amount)} to accept`, { action: { label: 'Top up', onClick: () => navigate('/wallet') } });
      return;
    }
    setConsentOpen(true);
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      const { error } = await supabase.from('challenges').update({ status: 'declined' }).eq('id', challenge.id).eq('status', 'pending');
      if (error) throw error;
      toast.success('Challenge declined');
      onOpenChange(false);
    } catch (error) {
      console.error('Error declining challenge:', error);
      toast.error(friendlyChallengeError(error));
    } finally {
      setDeclining(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="incoming-challenge-title">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onOpenChange(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 w-full overflow-hidden rounded-t-3xl border border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-w-md sm:rounded-2xl"
          >
            {/* Time remaining, drawn as a draining bar */}
            <div className="h-1 w-full bg-muted">
              <div
                className={cn('h-full transition-[width] duration-1000 ease-linear', urgent ? 'bg-destructive' : 'bg-primary')}
                style={{ width: `${Math.min(100, (timeLeft / 300) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <h2 id="incoming-challenge-title" className="text-2xl leading-none">
                You’ve been challenged
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 font-score text-sm font-bold tabular-nums',
                    urgent ? 'border-destructive/40 bg-destructive/15 text-destructive' : 'border-primary/30 bg-primary/10 text-primary-soft',
                  )}
                  aria-label={`${timeLeft} seconds left`}
                >
                  {formatTime(timeLeft)}
                </span>
                <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-3">
                <PlayerSide player={challenge.challenger} label="Challenger" />
                <span className="font-score text-3xl font-bold text-primary-soft">VS</span>
                <PlayerSide player={challenge.opponent} label="You" />
              </div>

              <dl className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-background/40 p-3">
                  <dt className="text-xs text-muted-foreground">Game</dt>
                  <dd className="truncate text-sm font-semibold">{gameName}</dd>
                </div>
                <div className="rounded-xl border border-border bg-background/40 p-3">
                  <dt className="text-xs text-muted-foreground">Mode</dt>
                  <dd className="text-sm font-semibold">{challenge.challenger_team_id ? '5v5 team' : '1v1 duel'}</dd>
                </div>
                {free ? (
                  <>
                    <div className="rounded-xl border border-border bg-background/40 p-3">
                      <dt className="text-xs text-muted-foreground">Entry</dt>
                      <dd className="font-score text-xl font-bold">Free</dd>
                    </div>
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                      <dt className="text-xs text-primary-soft">Win</dt>
                      <dd className="font-score text-xl font-bold">+{XP_RULES.win} XP</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-border bg-background/40 p-3">
                      <dt className="text-xs text-muted-foreground">Your stake</dt>
                      <dd className="font-score text-xl font-bold">{formatArenaCurrency(challenge.stake_amount)}</dd>
                    </div>
                    <div className="rounded-xl border border-gold/30 bg-gold/10 p-3">
                      <dt className="text-xs text-gold/80">Winner gets</dt>
                      <dd className="font-score text-xl font-bold text-gold">{formatArenaCurrency(challenge.prize_pool)}</dd>
                    </div>
                  </>
                )}
              </dl>

              <div className="flex gap-2">
                <Button onClick={handleDecline} disabled={accepting || declining} variant="outline" size="lg" className="flex-1">
                  {declining && <Loader2 className="animate-spin" />}
                  Decline
                </Button>
                <Button onClick={handleAccept} disabled={accepting || declining} size="lg" className="flex-[1.6]">
                  {accepting ? <Loader2 className="animate-spin" /> : <Swords />}
                  Accept
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">{free ? `Win or lose, you earn XP (+${XP_RULES.loss} for playing). Nothing to pay.` : 'Declining refunds the challenger. Nothing is charged to you.'}</p>
            </div>
          </motion.div>

          {consentOpen && (
            <ConsentModal
              open={consentOpen}
              onOpenChange={setConsentOpen}
              title={`Accept ${challenge.challenger.gamertag}'s challenge`}
              description={`${gameName}, winner takes ${formatArenaCurrency(challenge.prize_pool)}. Your stake is held until the match is decided.`}
              amount={challenge.stake_amount}
              onConfirm={executeAccept}
              loading={accepting}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
