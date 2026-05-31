import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { GAME_INFO, type GameType } from '@/types/database';
import { ConsentModal } from './ConsentModal';

interface SendChallengePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opponent: {
    user_id?: string;
    team_id?: string;
    gamertag: string;
    avatar_url: string | null;
    wins?: number;
    losses?: number;
    rank?: string;
  };
}

const STAKE_OPTIONS = [2, 5, 10, 25];
const ALL_GAMES: GameType[] = ['codm', 'fortnite', 'fifa', 'warzone', 'apex', 'valorant', 'injustice', 'mortal_kombat', 'efootball', 'pubg_mobile'];

export function SendChallengePanel({ open, onOpenChange, opponent }: SendChallengePanelProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [selectedStake, setSelectedStake] = useState(10);
  const [customStake, setCustomStake] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType>('codm');
  const [sending, setSending] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const gameScrollRef = useRef<HTMLDivElement>(null);

  const executeSend = async (stake: number) => {
    setSending(true);

    try {
      // Fetch latest balance
      const { data: latestProfile } = await supabase
        .from('profiles')
        .select('arena_currency, available_balance')
        .eq('id', user!.id)
        .single();
      
      const currentBalance = latestProfile?.arena_currency || 0;
      const currentAvailable = latestProfile?.available_balance || 0;

      if (stake > 0 && currentBalance < stake) {
        throw new Error(`Insufficient Arena Currency. You need ${formatArenaCurrency(stake)} to send this challenge.`);
      }

      // If team challenge, check if user is a captain of a 5-member team
      let myTeamId = null;
      if (opponent.team_id) {
        const { data: myTeam } = await supabase
          .from('teams')
          .select('id, team_members(count)')
          .eq('captain_id', user!.id)
          .single();
        
        if (!myTeam) {
          throw new Error('You must be a team captain to send team challenges.');
        }
        
        const memberCount = (myTeam.team_members as any)?.[0]?.count || 0;
        if (memberCount < 5) {
          throw new Error('Your team must have 5 members to send team challenges.');
        }
        myTeamId = myTeam.id;
      }

      // Deduct Arena Currency
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          arena_currency: currentBalance - stake,
          available_balance: currentAvailable - stake
        })
        .eq('id', user!.id);

      if (balanceError) throw balanceError;

      // Record transaction
      const { data: txData, error: txError } = await supabase.from('transactions').insert({
        user_id: user!.id,
        type: 'challenge_fee',
        amount: -stake,
        description: `Stake for challenge to: ${opponent.gamertag}`,
        status: 'pending' // Pending until challenge is accepted or declined
      }).select().single();

      await refreshProfile();

      // Calculate prize pool (stake * 2 - 10% fee)
      const totalPot = stake * 2;
      const platformFee = totalPot * 0.1;
      const prizePool = totalPot - platformFee;

      // Create challenge with 5 minute expiry
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      const challengeData: any = {
        challenger_id: user!.id,
        opponent_id: opponent.user_id || (await getTeamCaptainId(opponent.team_id!)),
        game: selectedGame,
        stake_amount: stake,
        prize_pool: prizePool,
        platform_fee: platformFee,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      };

      if (opponent.team_id) {
        challengeData.opponent_team_id = opponent.team_id;
        challengeData.challenger_team_id = myTeamId;
      }

      const { error } = await supabase
        .from('challenges')
        .insert(challengeData);

      if (error) {
        // Refund if challenge creation fails
        await supabase
          .from('profiles')
          .update({ 
            arena_currency: currentBalance,
            available_balance: currentAvailable
          })
          .eq('id', user!.id);
        
        // Delete the transaction record if it exists
        if (txData) {
          await supabase.from('transactions').delete().eq('id', txData.id);
        }
        
        throw error;
      }

      // Mark transaction as completed now that challenge is created
      if (txData) {
        await supabase.from('transactions')
          .update({ status: 'completed', challenge_id: (error ? null : (await supabase.from('challenges').select('id').eq('challenger_id', user!.id).order('created_at', { ascending: false }).limit(1).single()).data?.id) })
          .eq('id', txData.id);
      }
      
      // Wait, let's simplify this. Just mark it completed. 
      // Actually, I can't easily get the challenge ID here before it's inserted, 
      // but I can update it after.
      // But let's just mark it completed and skip the challenge_id for the fee if it's too complex.
      // No, let's try to get it.
      
      const { data: newChallenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('challenger_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (newChallenge && txData) {
        await supabase.from('transactions')
          .update({ challenge_id: newChallenge.id, status: 'completed' })
          .eq('id', txData.id);
      }

      // Also send a DM to let them know
      if (!opponent.team_id && opponent.user_id) {
        await supabase.from('direct_messages').insert({
          sender_id: user!.id,
          receiver_id: opponent.user_id,
          message: `🎮 I challenged you to a ${GAME_INFO[selectedGame].name} match for ${formatArenaCurrency(stake)}! Check your notifications to accept.`
        });
      }

      toast.success(`Challenge sent to ${opponent.gamertag}`);
      setConsentOpen(false);
      onOpenChange(false);
      
      // Reset form
      setSelectedStake(10);
      setCustomStake('');
      setSelectedGame('codm');
    } catch (error: any) {
      console.error('Error sending challenge:', error);
      toast.error(error.message || 'Failed to send challenge');
    } finally {
      setSending(false);
    }
  };

  const getTeamCaptainId = async (teamId: string) => {
    const { data } = await supabase
      .from('teams')
      .select('captain_id')
      .eq('id', teamId)
      .single();
    return data?.captain_id;
  };

  const handleSend = async () => {
    if (!user || !profile) {
      toast.error('You must be logged in to send challenges');
      return;
    }

    const stake = customStake ? parseFloat(customStake) : selectedStake;

    if (stake < 2 || stake > 1000) {
      toast.error('Stake must be between A$2 and A$1000');
      return;
    }

    // Check Arena Currency balance
    const currentBalance = profile.arena_currency || 0;
    if (currentBalance < stake) {
      toast.error(`Insufficient Arena Currency. You need ${formatArenaCurrency(stake)} to send this challenge.`);
      return;
    }

    setConsentOpen(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card - Centered on Desktop, Slide-up on Mobile */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full md:w-auto md:max-w-2xl md:min-w-[600px] bg-background border border-border rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto z-10"
          >
            <div className="p-6 md:p-8 space-y-6">
              {/* Close Button */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Title */}
              <div>
                <h2 className="text-2xl md:text-3xl font-bold font-orbitron gradient-primary-text">
                  Send Challenge
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Challenge your opponent to a 1v1 match
                </p>
              </div>

              {/* Opponent Info Card */}
              <div className="glassmorphism-card p-4 flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={opponent.avatar_url || undefined} />
                  <AvatarFallback className="text-lg font-bold">
                    {opponent.gamertag?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{opponent.gamertag}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="text-green-500 font-semibold">{opponent.wins}W</span>
                    <span className="text-red-500 font-semibold">{opponent.losses}L</span>
                    {opponent.rank && (
                      <span className="text-amber-500 font-semibold">{opponent.rank}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Game</Label>
                <div 
                  ref={gameScrollRef}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {ALL_GAMES.map((game) => {
                    const gameInfo = GAME_INFO[game];
                    const isSelected = selectedGame === game;
                    return (
                      <button
                        key={game}
                        type="button"
                        onClick={() => setSelectedGame(game)}
                        className={`relative flex-shrink-0 w-32 h-40 rounded-xl overflow-hidden transition-all ${
                          isSelected 
                            ? 'ring-4 ring-primary scale-105' 
                            : 'hover:scale-105 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={gameInfo.banner}
                          alt={gameInfo.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white font-bold text-sm text-center">
                            {gameInfo.name}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

      {/* Stake Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Entry Fee (Arena Currency)</Label>
        <div className="flex flex-wrap gap-2">
          {STAKE_OPTIONS.map((stake) => (
            <button
              key={stake}
              type="button"
              onClick={() => {
                setSelectedStake(stake);
                setCustomStake('');
              }}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                selectedStake === stake && !customStake
                  ? 'bg-primary text-primary-foreground scale-105'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              A${stake}
            </button>
          ))}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">A$</span>
            <Input
              type="number"
              placeholder="Custom"
              value={customStake}
              onChange={(e) => setCustomStake(e.target.value)}
              className={`w-32 pl-8 pr-4 py-3 rounded-xl font-semibold ${
                customStake
                  ? 'border-2 border-primary bg-primary/10'
                  : 'bg-muted'
              }`}
              min="2"
              max="1000"
              step="0.01"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Min: A$2 • Max: A$1000 • Winner takes 90% of total pot
        </p>
      </div>

      {/* Prize Breakdown */}
      <div className="glassmorphism-card p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Your Stake:</span>
          <span className="font-semibold">{formatArenaCurrency(customStake ? parseFloat(customStake) : selectedStake)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Opponent Stake:</span>
          <span className="font-semibold">{formatArenaCurrency(customStake ? parseFloat(customStake) : selectedStake)}</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Pot:</span>
          <span className="font-semibold">{formatArenaCurrency((customStake ? parseFloat(customStake) : selectedStake) * 2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Platform Fee (10%):</span>
          <span className="font-semibold text-red-400">-{formatArenaCurrency((customStake ? parseFloat(customStake) : selectedStake) * 2 * 0.1)}</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between">
          <span className="font-bold text-amber-500">Winner Prize:</span>
          <span className="font-bold text-amber-500 text-lg">{formatArenaCurrency((customStake ? parseFloat(customStake) : selectedStake) * 2 * 0.9)}</span>
        </div>
      </div>

              {/* Send Button */}
              <Button
                onClick={handleSend}
                disabled={sending}
                className="sheen-effect w-full py-6 text-lg font-bold transition-all duration-300 hover:scale-[1.02]"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)',
                  border: 0,
                }}
              >
                {sending ? 'SENDING...' : 'SEND CHALLENGE'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Challenge expires in 5 minutes if not accepted
              </p>
            </div>
          </motion.div>

          {consentOpen && (
            <ConsentModal
              open={consentOpen}
              onOpenChange={setConsentOpen}
              title={`Challenge Opponent: ${opponent.gamertag}`}
              description={`You are about to challenge ${opponent.gamertag} to a 1v1 match in ${GAME_INFO[selectedGame].name}. The stake amount will be deducted from your balance.`}
              amount={customStake ? parseFloat(customStake) : selectedStake}
              onConfirm={() => executeSend(customStake ? parseFloat(customStake) : selectedStake)}
              loading={sending}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
