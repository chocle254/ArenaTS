import { 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight,
  Clock,
  Info,
  MessageCircle, 
  Send, 
  Shield, 
  ShieldAlert, 
  Swords, 
  Trophy, 
  XCircle 
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { MatchTimer } from './MatchTimer';

interface QuickMatchDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: any;
  currentUserId: string;
  profiles: {challenger: any, opponent: any};
}

const GAME_RULES: Record<string, string[]> = {
  codm: ['1v1 Sniper or Rifles', 'Best of 3 Rounds', 'No Scorestreaks', 'Killhouse or Shipment map'],
  fortnite: ['Box fight or Build fight', 'First to 5 rounds', 'No healing items', 'Standard materials'],
  valorant: ['1v1 Mid Only', 'First to 10 kills', 'Standard abilities', 'No ultimates'],
  apex: ['Firing Range Duel', 'Best of 5 rounds', 'Blue armor only', 'No healing'],
  warzone: ['Gulag style duel', 'Best of 3', 'Random weapon loadout', 'No grenades'],
  fifa: ['6 Minute halves', 'Tactical defending', 'No custom formations', 'Club teams only'],
  injustice: ['Best of 3 matches', 'No interactions', 'Standard health', 'Competitive mode ON'],
  mortal_kombat: ['Best of 3 matches', 'No consumables', 'Standard health', 'Competitive mode ON'],
  efootball: ['1v1 Friendly Match', 'Standard match time', 'Base teams only', 'No lag switching'],
  pubg_mobile: ['1v1 TDM Warehouse', 'First to 40 kills', 'No sliding', 'Standard weapons only']
};

export function QuickMatchDetailModal({ open, onOpenChange, challenge: initialChallenge, currentUserId, profiles: entities }: QuickMatchDetailModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [challenge, setChallenge] = useState(initialChallenge);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChallenge(initialChallenge);
  }, [initialChallenge]);

  useEffect(() => {
    if (open) {
      loadMessages();
      const chatChannel = subscribeToMessages();
      
      // Subscribe to challenge updates
      const challengeChannel = supabase
        .channel(`challenge_details_${challenge.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'challenges',
            filter: `id=eq.${challenge.id}`
          },
          (payload) => {
            setChallenge(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(challengeChannel);
      };
    }
  }, [open, challenge.id]);

  const isChallenger = challenge.challenger_id === currentUserId;
  const isOpponent = challenge.opponent_id === currentUserId;
  const myEntity = isChallenger ? entities.challenger : entities.opponent;
  const opponentEntity = isChallenger ? entities.opponent : entities.challenger;
  
  const myCheckedIn = isChallenger ? challenge.challenger_checked_in : challenge.opponent_checked_in;
  const opponentCheckedIn = isChallenger ? challenge.opponent_checked_in : challenge.challenger_checked_in;
  
  const myReported = isChallenger ? challenge.challenger_reported_winner : challenge.opponent_reported_winner;
  const opponentReported = isChallenger ? challenge.opponent_reported_winner : challenge.challenger_reported_winner;

  useEffect(() => {
    if (challenge.both_players_ready && challenge.match_started_at) {
      // Optional: play sound or show notification
    }
  }, [challenge.both_players_ready, challenge.match_started_at]);

  const [prevBothReady, setPrevBothReady] = useState(initialChallenge.both_players_ready);

  useEffect(() => {
    if (challenge.both_players_ready && !prevBothReady) {
      toast.success('Match started! You have 30 minutes to complete the match and report results.');
      setPrevBothReady(true);
    }
  }, [challenge.both_players_ready, prevBothReady]);

  useEffect(() => {
    if (challenge.status === 'completed' && challenge.winner_id) {
      const isWinner = challenge.winner_id === currentUserId;
      if (isWinner) {
        toast.success(`CONGRATULATIONS! You won against ${opponentEntity?.gamertag || 'your opponent'}! ${formatArenaCurrency(challenge.prize_pool)} has been awarded to your wallet.`, {
          duration: 10000,
          position: 'top-center'
        });
      } else {
        toast.error(`Better luck next time! You lost against ${opponentEntity?.gamertag || 'your opponent'}.`, {
          duration: 10000,
          position: 'top-center'
        });
      }
    }
  }, [challenge.status, challenge.winner_id, currentUserId, opponentEntity?.gamertag]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('match_messages')
      .select('*')
      .eq('challenge_id', challenge.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoadingMessages(false);
  };

  const subscribeToMessages = () => {
    return supabase
      .channel(`challenge_chat_${challenge.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_messages',
          filter: `challenge_id=eq.${challenge.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    const msg = message.trim();
    setMessage('');
    
    const { error } = await supabase
      .from('match_messages')
      .insert({
        challenge_id: challenge.id,
        user_id: currentUserId,
        message: msg
      });

    if (error) {
      toast.error('Failed to send message');
      setMessage(msg);
    }
  };

  const handleCheckIn = async () => {
    if (checkingIn || myCheckedIn) return;
    setCheckingIn(true);
    try {
      const field = isChallenger ? 'challenger_checked_in' : 'opponent_checked_in';
      const { error } = await supabase
        .from('challenges')
        .update({ 
          [field]: true,
          submitted_by: currentUserId
        })
        .eq('id', challenge.id);

      if (error) throw error;
      toast.success('You are ready! Waiting for opponent...');
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast.error('Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleReportResult = async (winnerId: string | 'cancel' | 'dispute') => {
    setSubmitting(true);
    try {
      if (isAdmin && (winnerId === 'cancel' || winnerId === challenge.challenger_id || winnerId === challenge.opponent_id)) {
        // Admin Override
        const updates: any = {
          updated_at: new Date().toISOString()
        };

        if (winnerId === 'cancel') {
          updates.status = 'cancelled';
        } else {
          updates.status = 'completed';
          updates.winner_id = winnerId;
          updates.challenger_reported_winner = winnerId;
          updates.opponent_reported_winner = winnerId;
        }

        const { error } = await supabase
          .from('challenges')
          .update(updates)
          .eq('id', challenge.id);

        if (error) throw error;
        toast.success(winnerId === 'cancel' ? 'Match cancelled by moderator' : 'Winner confirmed by moderator');
        return;
      }

      // Check if this is a manual cancel by a player during a dispute
      if (winnerId === 'cancel') {
        const { error } = await supabase
          .from('challenges')
          .update({
            status: 'cancelled',
            dispute_count: 2, // Ensure it hits the penalty logic
            submitted_by: currentUserId
          })
          .eq('id', challenge.id);

        if (error) throw error;
        toast.warning('Match cancelled. Rating reduced by 0.5.');
        return;
      }

      // Check if this is a dispute button click (though we removed the button, safety check)
      if (winnerId === 'dispute') {
        toast.error('Please select a result (I Won or I Lost). Disputes are created automatically when results conflict.');
        setSubmitting(false);
        return;
      }

      const reportField = isChallenger ? 'challenger_reported_winner' : 'opponent_reported_winner';
      
      const updates: any = { 
        [reportField]: winnerId,
        submitted_by: currentUserId
      };

      const { error } = await supabase
        .from('challenges')
        .update(updates)
        .eq('id', challenge.id);

      if (error) throw error;
      
      toast.success('Result reported. Waiting for opponent confirmation.');
    } catch (error: any) {
      console.error('Report error:', error);
      toast.error('Failed to report result. ' + (error.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const isDeadlinePassed = challenge.check_in_deadline && new Date(challenge.check_in_deadline) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[95dvh] md:h-[90vh] p-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl max-sm:w-screen max-sm:max-w-none">
        <DialogHeader className="p-3 md:p-6 border-b border-border/50 bg-muted/20 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                <Swords className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base md:text-xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {challenge.game.toUpperCase()} MATCH
                </DialogTitle>
                <p className="text-[10px] md:text-xs text-muted-foreground font-mono flex items-center gap-2 mt-0.5 md:mt-1">
                  ID: {challenge.id.substring(0, 8)} • STAKE: {formatArenaCurrency(challenge.stake_amount)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-3">
              {challenge.status === 'disputed' && (
                <Badge variant="destructive" className="animate-pulse gap-1 px-2 md:px-3 py-0.5 md:py-1 text-[10px]">
                  <AlertTriangle className="h-3 w-3" />
                  DISPUTED
                </Badge>
              )}
              {challenge.status === 'disputed_warning' && (
                <Badge variant="destructive" className="animate-pulse gap-1 px-2 md:px-3 py-0.5 md:py-1 text-[10px]">
                  <AlertTriangle className="h-3 w-3" />
                  FINAL WARNING
                </Badge>
              )}
              {challenge.both_players_ready && challenge.status !== 'completed' && challenge.status !== 'disputed' && challenge.status !== 'disputed_warning' && (
                <div className="bg-muted/50 px-2 md:px-4 py-1 md:py-2 rounded-lg border border-border/50">
                  <MatchTimer deadline={challenge.match_deadline} />
                </div>
              )}
              <Badge variant="outline" className="px-2 md:px-3 py-0.5 md:py-1 border-primary/30 text-primary bg-primary/5 uppercase text-[8px] md:text-[10px] tracking-widest font-bold">
                {challenge.status === 'disputed_warning' ? 'WARNING' : challenge.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Side: Rules & Actions */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border/50 bg-muted/5 flex flex-col min-h-0 h-[45vh] md:h-full">
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6 pb-20">
                <section className="order-2 md:order-1">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info className="h-3 w-3" />
                    Match Rules
                  </h3>
                  <ul className="space-y-3">
                    {(GAME_RULES[challenge.game] || ['Standard match rules apply']).map((rule, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground/80 font-light">
                        <div className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </section>

                <Separator className="bg-border/50 hidden md:block" />

                <section className="space-y-4 order-1 md:order-2">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Match Actions
                  </h3>
                  
                  {['completed', 'cancelled', 'expired', 'declined'].includes(challenge.status) ? (
                    <div className="p-4 bg-muted/20 rounded-lg border border-border/50 text-center space-y-2">
                      {challenge.status === 'completed' ? (
                        <Trophy className="h-8 w-8 mx-auto text-gold animate-bounce" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
                      )}
                      <p className="text-sm font-bold uppercase tracking-tight">Match {challenge.status}</p>
                      {challenge.winner_id && (
                        <p className="text-[10px] text-muted-foreground">
                          Winner: {challenge.winner_id === challenge.challenger_id ? entities.challenger.gamertag : entities.opponent.gamertag}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {!challenge.both_players_ready && challenge.status === 'accepted' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Check-in Deadline
                            </p>
                            <MatchTimer deadline={challenge.check_in_deadline} />
                          </div>
                          
                          <div className="space-y-2">
                            <Button 
                              className={`w-full py-6 font-bold tracking-tight transition-all duration-300 ${
                                myCheckedIn 
                                  ? 'bg-green-500/10 text-green-500 border-2 border-green-500/50 hover:bg-green-500/20' 
                                  : isDeadlinePassed
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary/90'
                              }`}
                              disabled={myCheckedIn || checkingIn || isDeadlinePassed}
                              onClick={handleCheckIn}
                              style={{ fontFamily: 'Orbitron, sans-serif' }}
                            >
                              {checkingIn ? (
                                'PROCESSING...'
                              ) : myCheckedIn ? (
                                <span className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  CHECKED IN
                                </span>
                              ) : isDeadlinePassed ? (
                                'DEADLINE PASSED'
                              ) : (
                                'I\'M READY'
                              )}
                            </Button>
                            
                            {isDeadlinePassed && !myCheckedIn && (
                              <p className="text-[10px] text-center text-destructive font-bold uppercase tracking-tight">
                                You missed the check-in deadline
                              </p>
                            )}
                            
                            {myCheckedIn && !opponentCheckedIn && !isDeadlinePassed && (
                              <p className="text-[10px] text-center text-muted-foreground animate-pulse font-medium">
                                Waiting for opponent to check in...
                              </p>
                            )}
                            
                            {myCheckedIn && !opponentCheckedIn && isDeadlinePassed && (
                              <p className="text-[10px] text-center text-destructive font-medium">
                                Opponent failed to check in. Match will be cancelled.
                              </p>
                            )}
                            
                            {!myCheckedIn && opponentCheckedIn && !isDeadlinePassed && (
                              <div className="flex items-center justify-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-tight">
                                  Opponent is ready!
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {challenge.both_players_ready && challenge.status !== 'completed' && challenge.status !== 'disputed' && challenge.status !== 'disputed_warning' && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-tighter">Report Result</p>
                          <Button 
                            variant="outline"
                            className={`w-full py-6 border-2 font-bold ${myReported === currentUserId ? 'border-green-500 bg-green-500/10 text-green-600' : 'border-border'}`}
                            onClick={() => handleReportResult(currentUserId)}
                            disabled={submitting}
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            I WON
                          </Button>
                          <Button 
                            variant="outline"
                            className={`w-full py-6 border-2 font-bold ${myReported === opponentEntity.id ? 'border-red-500 bg-red-500/10 text-red-600' : 'border-border'}`}
                            onClick={() => handleReportResult(opponentEntity.id)}
                            disabled={submitting}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            I LOST
                          </Button>
                        </div>
                      )}

                      {challenge.status === 'disputed_warning' && (
                        <div className="space-y-4 p-4 bg-destructive/10 border-2 border-destructive/30 rounded-xl">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <h4 className="text-sm font-bold text-destructive uppercase tracking-tight">⚠️ CONFLICTING REPORTS</h4>
                              <p className="text-xs text-foreground leading-relaxed">
                                Both of you are claiming to be winners. Discuss again on the real winner. 
                                If you don't come to an agreement, you can cancel the match, but 
                                <span className="font-bold text-destructive"> both ratings will be reduced by 0.5</span>.
                              </p>
                            </div>
                          </div>
                          
                          <Separator className="bg-destructive/20" />
                          
                          <div className="space-y-3">
                            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-tighter">Report Result Again</p>
                            <div className="flex flex-col gap-2">
                              <Button 
                                variant="outline"
                                className={`w-full py-6 border-2 font-bold relative ${myReported === currentUserId ? 'border-green-500 bg-green-500/10 text-green-600' : 'border-border'}`}
                                onClick={() => handleReportResult(currentUserId)}
                                disabled={submitting}
                              >
                                <Trophy className="h-4 w-4 mr-2" />
                                I WON
                                {opponentReported === currentUserId && (
                                  <Badge variant="secondary" className="absolute -top-2 -right-2 bg-green-500 text-white border-none text-[8px] px-1">Opponent Agreed</Badge>
                                )}
                              </Button>
                              <Button 
                                variant="outline"
                                className={`w-full py-6 border-2 font-bold relative ${myReported === opponentEntity.id ? 'border-red-500 bg-red-500/10 text-red-600' : 'border-border'}`}
                                onClick={() => handleReportResult(opponentEntity.id)}
                                disabled={submitting}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                I LOST
                                {opponentReported === opponentEntity.id && (
                                  <Badge variant="secondary" className="absolute -top-2 -right-2 bg-red-500 text-white border-none text-[8px] px-1">Opponent Claims Win</Badge>
                                )}
                              </Button>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => handleReportResult('cancel')}
                              disabled={submitting}
                            >
                              Cancel Match (0.5 Penalty)
                            </Button>
                          </div>
                        </div>
                      )}

                      {challenge.status === 'disputed' && (
                        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">Match Under Review</h4>
                              <p className="text-xs text-foreground/80 leading-relaxed">
                                This match is being reviewed by an administrator. You will be notified once a decision is made.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {isAdmin && challenge.status === 'disputed' && (
                        <div className="mt-8 pt-6 border-t border-destructive/20 space-y-4">
                          <div className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-3 w-3" />
                            <h4 className="text-[10px] font-bold uppercase tracking-widest">Moderator Override</h4>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-[10px] h-8 border-destructive/30 hover:bg-destructive/10 text-destructive"
                              onClick={() => handleReportResult(challenge.challenger_id)}
                              disabled={submitting}
                            >
                              Force Win: {entities.challenger.gamertag}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-[10px] h-8 border-destructive/30 hover:bg-destructive/10 text-destructive"
                              onClick={() => handleReportResult(challenge.opponent_id)}
                              disabled={submitting}
                            >
                              Force Win: {entities.opponent.gamertag}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-[10px] h-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleReportResult('cancel')}
                              disabled={submitting}
                            >
                              Force Cancel/Refund
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
            </ScrollArea>
          </div>

          {/* Right Side: Chat */}
          <div className="flex-1 flex flex-col bg-background min-h-[300px] md:min-h-0">
            <div className="p-4 border-b border-border/50 bg-muted/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border">
                    <AvatarImage src={entities.challenger.avatar_url} />
                    <AvatarFallback>{entities.challenger.gamertag[0]}</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border">
                    <AvatarImage src={entities.opponent.avatar_url} />
                    <AvatarFallback>{entities.opponent.gamertag[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Match Room Chat</span>
              </div>
              {opponentCheckedIn && !challenge.both_players_ready && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                  OPPONENT IS READY
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-30">
                    <MessageCircle className="h-8 w-8 animate-pulse" />
                    <p className="text-xs">Connecting to match room...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-sm italic">Match chat is live. Good luck!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.user_id === currentUserId;
                    const senderEntity = msg.user_id === challenge.challenger_id ? entities.challenger : entities.opponent;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={senderEntity.avatar_url} />
                            <AvatarFallback className="text-[10px]">{senderEntity.gamertag[0]}</AvatarFallback>
                          </Avatar>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                            isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'
                          }`}>
                            {msg.message}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-8">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/50 bg-muted/5 shrink-0">
              <div className="relative flex items-center">
                <Input 
                  placeholder="Send a message to your opponent..." 
                  className="pr-12 py-6 bg-background/50 border-border/50 focus-visible:ring-primary/20"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-2 text-primary hover:bg-primary/10"
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-[9px] text-center text-muted-foreground mt-2 uppercase tracking-widest opacity-50">
                Messages are recorded for dispute resolution
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
