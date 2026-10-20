import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Swords, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { invalidatePlayerProgress } from '@/hooks/use-player-progress';
import { createChallenge, friendlyChallengeError } from '@/lib/challenges';
import { XP_RULES } from '@/lib/progression';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

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

const ALL_GAMES = (Object.keys(GAME_INFO) as GameType[]).filter((g) => GAME_INFO[g]);

export function SendChallengePanel({ open, onOpenChange, opponent }: SendChallengePanelProps) {
  const { user, profile } = useAuth();
  const [selectedGame, setSelectedGame] = useState<GameType>('codm');
  const [sending, setSending] = useState(false);

  const close = () => onOpenChange(false);

  const resetForm = () => {
    setSelectedGame('codm');
  };

  const getTeamCaptainId = async (teamId: string) => {
    const { data } = await supabase.from('teams').select('captain_id').eq('id', teamId).maybeSingle();
    return (data?.captain_id as string | undefined) ?? null;
  };

  const executeSend = async () => {
    if (!user) return;
    setSending(true);
    try {
      let myTeamId: string | null = null;
      let opponentId = opponent.user_id ?? null;

      if (opponent.team_id) {
        const { data: myTeam } = await supabase
          .from('teams')
          .select('id, team_members(count)')
          .eq('captain_id', user.id)
          .limit(1)
          .maybeSingle();
        if (!myTeam) throw new Error('Only team captains can send team challenges.');
        const memberCount = (myTeam.team_members as { count: number }[] | null)?.[0]?.count || 0;
        if (memberCount < 5) throw new Error('Your team needs 5 members to send a team challenge.');
        myTeamId = myTeam.id as string;
        opponentId = await getTeamCaptainId(opponent.team_id);
      }
      if (!opponentId) throw new Error('That player or team is no longer available.');

      await createChallenge({
        userId: user.id,
        opponentId,
        opponentTag: opponent.gamertag,
        game: selectedGame,
        stake: 0,
        challengerTeamId: myTeamId,
        opponentTeamId: opponent.team_id ?? null,
      });

      // Heads-up DM so the opponent sees it even if they miss the popup
      if (!opponent.team_id && opponent.user_id) {
        void supabase
          .from('direct_messages')
          .insert({
            sender_id: user.id,
            receiver_id: opponent.user_id,
            message: `🎮 I challenged you to a ${GAME_INFO[selectedGame].name} quick match. Accept it from your notifications within 5 minutes.`,
          })
          .then(
            () => undefined,
            () => undefined,
          );
      }

      invalidatePlayerProgress(user.id);
      toast.success(`Challenge sent to ${opponent.gamertag}`, { description: 'They have 5 minutes to accept.' });
      close();
      resetForm();
    } catch (error) {
      console.error('Error sending challenge:', error);
      const message = friendlyChallengeError(error);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (!user || !profile) {
      toast.error('Sign in to send challenges');
      return;
    }
    void executeSend();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4" role="dialog" aria-modal="true" aria-labelledby="send-challenge-title">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl md:max-w-xl md:rounded-2xl"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted md:hidden" />
            <div className="space-y-6 p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="send-challenge-title" className="text-3xl leading-none">
                    Send a challenge
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {opponent.team_id ? '5v5 team match' : '1v1 match'}, free to play. Win for XP and rank.
                  </p>
                </div>
                <button type="button" onClick={close} className="-mr-1 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-border bg-background/40 p-3">
                <Avatar className="h-14 w-14 border-2 border-primary/60">
                  <AvatarImage src={opponent.avatar_url || undefined} />
                  <AvatarFallback className="font-score text-lg">{opponent.gamertag?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-score text-xl font-bold">{opponent.gamertag}</p>
                  <p className="flex gap-3 text-sm">
                    <span className="font-score text-success">{opponent.wins ?? 0}W</span>
                    <span className="font-score text-destructive">{opponent.losses ?? 0}L</span>
                    {opponent.rank && <span className="text-gold">{opponent.rank}</span>}
                  </p>
                </div>
                <Swords className="h-6 w-6 shrink-0 text-primary-soft" aria-hidden />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Game</Label>
                <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide md:-mx-7 md:px-7" role="radiogroup" aria-label="Game">
                  {ALL_GAMES.map((game) => {
                    const info = GAME_INFO[game];
                    const selected = selectedGame === game;
                    return (
                      <button
                        key={game}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedGame(game)}
                        className={cn(
                          'relative h-28 w-24 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-[border-color,opacity]',
                          selected ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100',
                        )}
                      >
                        <img src={info.banner} alt="" className="h-full w-full object-cover" loading="lazy" />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <span className="absolute inset-x-0 bottom-0 p-2 text-center text-xs font-semibold leading-tight text-white">{info.shortName || info.name}</span>
                        {selected && (
                          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border bg-background/40 p-3">
                  <dt className="text-xs text-muted-foreground">Entry</dt>
                  <dd className="font-score text-xl font-bold">Free</dd>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                  <dt className="text-xs text-primary-soft">Win</dt>
                  <dd className="font-score text-xl font-bold">+{XP_RULES.win} XP</dd>
                </div>
                <div className="rounded-xl border border-border bg-background/40 p-3">
                  <dt className="text-xs text-muted-foreground">Lose</dt>
                  <dd className="font-score text-xl font-bold">+{XP_RULES.loss} XP</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">Wins climb the leaderboard. Your first 3 matches a day against the same player count toward your record.</p>

              <Button onClick={handleSend} disabled={sending} size="lg" className="w-full text-base">
                {sending ? <Loader2 className="animate-spin" /> : <Swords />}
                {sending ? 'Sending…' : `Challenge ${opponent.gamertag}`}
              </Button>
              <p className="text-center text-xs text-muted-foreground">The challenge expires in 5 minutes if it isn’t accepted.</p>
            </div>
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
}
