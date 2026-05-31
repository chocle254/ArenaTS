import { AlertTriangle, ArrowRight, CheckCircle, Clock, MessageCircle, Play, Send, Shield, Trophy, Upload, Users, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MatchTimer } from '@/components/MatchTimer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';

interface Participant {
  id: string;
  gamertag: string | null;
  user_id: string;
  bracket_seed: number | null;
  team_id?: string | null;
}

interface Team {
  id: string;
  team_name: string;
  captain_id: string;
}

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  player1?: Participant;
  player2?: Participant;
  winner?: string;
  isBye?: boolean;
  result?: MatchResult;
}

interface MatchResult {
  id: string;
  tournament_id: string;
  match_id: string;
  player1_id: string | null;
  player2_id: string | null;
  team1_id: string | null;
  team2_id: string | null;
  player1_reported_winner: string | null;
  player2_reported_winner: string | null;
  screenshot_url: string | null;
  status: 'pending' | 'confirmed' | 'disputed';
  winner_id: string | null;
  admin_override: boolean;
  match_started_at: string | null;
  match_deadline: string | null;
  match_duration_minutes: number;
  time_extended_by_admin: number;
  player1_checked_in: boolean;
  player2_checked_in: boolean;
  check_in_deadline: string | null;
  both_players_ready: boolean;
}

interface TournamentBracketProps {
  participants: Participant[];
  maxPlayers: number;
  tournamentId: string;
  isAdmin?: boolean;
  winnerId?: string;
  isPast?: boolean;
  tournamentStatus?: string;
  tournamentStartTime?: string;
  tournamentName?: string;
}

interface MatchChatProps {
  match: Match;
  currentUserId: string;
  tournamentId: string;
  isAdmin: boolean;
  participants?: Participant[];
}

function MatchChat({ match, currentUserId, tournamentId, isAdmin, participants }: MatchChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; user_id: string; user: string; text: string; timestamp: Date; is_referee?: boolean }>>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isReferee, setIsReferee] = useState(false);

  const matchResult = match.result;
  const isPlayer1 = match.player1?.user_id === currentUserId;
  const isPlayer2 = match.player2?.user_id === currentUserId;
  const isParticipant = isPlayer1 || isPlayer2;

  useEffect(() => {
    const checkRefereeStatus = async () => {
      if (!currentUserId || !tournamentId) return;
      
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('game')
        .eq('id', tournamentId)
        .single();
        
      if (tournament) {
        const { data: refereeStatus } = await supabase
          .rpc('is_referee', { uid: currentUserId, p_game: tournament.game });
        
        setIsReferee(!!refereeStatus);
      }
    };
    
    checkRefereeStatus();
    loadMessages();
    
    const channel = supabase
      .channel(`match_messages_${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_messages',
          filter: `match_id=eq.${match.id}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          let userGamertag = 'Unknown';
          let isRefereeMsg = false;

          if (newMessage.user_id === match.player1?.user_id) {
            userGamertag = match.player1?.gamertag || 'Player 1';
          } else if (newMessage.user_id === match.player2?.user_id) {
            userGamertag = match.player2?.gamertag || 'Player 2';
          } else {
            // Check if sender is a referee or admin
            const { data: profile } = await supabase
              .from('profiles')
              .select('gamertag, role')
              .eq('id', newMessage.user_id)
              .single();
            
            if (profile) {
              userGamertag = profile.gamertag;
              isRefereeMsg = profile.role === 'admin' || profile.role === 'referee';
            }
          }
          
          setMessages(prev => [...prev, {
            id: newMessage.id,
            user_id: newMessage.user_id,
            user: userGamertag,
            text: newMessage.message,
            timestamp: new Date(newMessage.created_at),
            is_referee: isRefereeMsg
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id, tournamentId, currentUserId]);

  const loadMessages = async () => {
    setLoadingMessages(true);
    
    const { data, error } = await supabase
      .from('match_messages')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('match_id', match.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      setLoadingMessages(false);
      return;
    }

    if (data) {
      const formattedMessages = await Promise.all(data.map(async (msg: any) => {
        let userGamertag = 'Unknown';
        let isRefereeMsg = false;

        if (msg.user_id === match.player1?.user_id) {
          userGamertag = match.player1?.gamertag || 'Player 1';
        } else if (msg.user_id === match.player2?.user_id) {
          userGamertag = match.player2?.gamertag || 'Player 2';
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('gamertag, role')
            .eq('id', msg.user_id)
            .single();
          
          if (profile) {
            userGamertag = profile.gamertag;
            isRefereeMsg = profile.role === 'admin' || profile.role === 'referee';
          }
        }
        
        return {
          id: msg.id,
          user_id: msg.user_id,
          user: userGamertag,
          text: msg.message,
          timestamp: new Date(msg.created_at),
          is_referee: isRefereeMsg
        };
      }));
      
      setMessages(formattedMessages);
    }
    
    setLoadingMessages(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      const { error } = await supabase
        .from('match_messages')
        .insert({
          tournament_id: tournamentId,
          match_id: match.id,
          user_id: currentUserId,
          message: message.trim()
        });

      if (error) throw error;

      setMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tournamentId}/${match.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tournament_screenshots')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tournament_screenshots')
        .getPublicUrl(fileName);

      // Update or create match result with screenshot
      if (matchResult) {
        const { error: updateError } = await supabase
          .from('match_results')
          .update({ screenshot_url: urlData.publicUrl })
          .eq('tournament_id', tournamentId)
          .eq('match_id', match.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('match_results')
          .insert({
            tournament_id: tournamentId,
            match_id: match.id,
            round: match.round,
            player1_id: match.player1!.user_id,
            player2_id: match.player2!.user_id,
            screenshot_url: urlData.publicUrl
          });

        if (insertError) throw insertError;
      }

      toast.success('Screenshot uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading screenshot:', error);
      toast.error('Failed to upload screenshot');
    } finally {
      setUploading(false);
    }
  };

  const handleReportResult = async (winnerId: string) => {
    if (!match.player1 || !match.player2) return;
    setSubmitting(true);
    try {
      const reportField = isPlayer1
        ? 'player1_reported_winner'
        : 'player2_reported_winner';
      const { data, error } = await supabase.rpc('confirm_match_result', {
        p_tournament_id: tournamentId,
        p_match_id:      match.id,
        p_round:         match.round,
        p_player1_id:    match.player1.user_id,
        p_player2_id:    match.player2.user_id,
        p_winner_id:     winnerId,
        p_reported_by:   currentUserId,
        p_report_field:  reportField,
      });
      if (error) throw error;
      const result = data as { status: string; message: string };
      // Post a message to match chat
      const winnerGamertag =
        winnerId === match.player1?.user_id
          ? match.player1?.gamertag
          : match.player2?.gamertag;
      if (result.status === 'confirmed') {
        await supabase.from('match_messages').insert({
          tournament_id: tournamentId,
          match_id:      match.id,
          user_id:       currentUserId,
          message: `✅ Match result confirmed. Both players agreed that ${winnerGamertag} won.`,
        });
        const numRounds = Math.ceil(Math.log2(participants?.length || 2));
        const isFinal   = match.round >= numRounds;
        toast.success(
          isFinal
            ? 'Final match confirmed! Tournament completed.'
            : 'Match confirmed! Winner advances to next round.'
        );
      } else if (result.status === 'disputed') {
        await supabase.from('match_messages').insert({
          tournament_id: tournamentId,
          match_id:      match.id,
          user_id:       currentUserId,
          message: '⚠️ Match results conflict! Moved to dispute for admin review.',
        });
        toast.warning('Results disputed! An admin will review and resolve.');
      } else {
        toast.success('Result submitted. Waiting for opponent confirmation.');
      }
    } catch (error: any) {
      console.error('Error reporting result:', error);
      toast.error(
        `Failed to submit result: ${error.message || 'Check console for details'}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDispute = async () => {
    if (!isAdmin && !isReferee) return;
    if (!matchResult) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('match_results')
        .update({
          status: 'pending',
          player1_reported_winner: null,
          player2_reported_winner: null,
          admin_override: false,
          winner_id: null,
        })
        .eq('id', matchResult.id);

      if (error) throw error;

      toast.success('Dispute cancelled. Players can now re-report the match result.');

      await supabase.from('match_messages').insert({
        tournament_id: tournamentId,
        match_id: match.id,
        user_id: currentUserId,
        message: '🛡️ Official Action: The dispute has been cancelled. Both players, please discuss and report the correct winner again.',
      });

    } catch (error: any) {
      console.error('Error cancelling dispute:', error);
      toast.error(`Failed to cancel dispute: ${error.message || 'Check console for details'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminOverride = async (winnerId: string) => {
    if (!isAdmin && !isReferee) return;
    if (!match.player1 || !match.player2) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('admin_override_match', {
        p_tournament_id: tournamentId,
        p_match_id:      match.id,
        p_round:         match.round,
        p_player1_id:    match.player1.user_id,
        p_player2_id:    match.player2.user_id,
        p_winner_id:     winnerId,
        p_admin_id:      currentUserId,
      });
      if (error) throw error;
      const winnerGamertag =
        winnerId === match.player1?.user_id
          ? match.player1?.gamertag
          : match.player2?.gamertag;
      await supabase.from('match_messages').insert({
        tournament_id: tournamentId,
        match_id:      match.id,
        user_id:       currentUserId,
        message: `🛡️ Official Action: Match result confirmed by admin override. Winner: ${winnerGamertag}.`,
      });
      const numRounds = Math.ceil(Math.log2(participants?.length || 2));
      const isFinal   = match.round >= numRounds;
      toast.success(
        isFinal
          ? 'Override applied. Final confirmed — tournament completed!'
          : 'Override applied. Winner confirmed and advancing.'
      );
    } catch (error: any) {
      console.error('Error applying override:', error);
      toast.error(
        `Failed to apply override: ${error.message || 'Check console for details'}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isParticipant && !isAdmin && !isReferee) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">Only match participants or officials can access chat</p>
      </div>
    );
  }

  const player1ReportedWinner = matchResult?.player1_reported_winner;
  const player2ReportedWinner = matchResult?.player2_reported_winner;
  const myReport = isPlayer1 ? player1ReportedWinner : player2ReportedWinner;
  const opponentReport = isPlayer1 ? player2ReportedWinner : player1ReportedWinner;

  return (
    <div className="flex flex-col max-h-[85vh] overflow-y-auto pr-2">
      {/* Match Result Status */}
      {matchResult && (
        <div className="mb-4 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold uppercase tracking-wider">Match Status</span>
            <Badge variant={
              matchResult.status === 'confirmed' ? 'default' :
              matchResult.status === 'disputed' ? 'destructive' :
              'secondary'
            } className="px-3 py-1">
              {matchResult.status === 'confirmed' && <CheckCircle className="h-3 w-3 mr-1" />}
              {matchResult.status === 'disputed' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {matchResult.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
              {matchResult.status.charAt(0).toUpperCase() + matchResult.status.slice(1)}
            </Badge>
          </div>
          
          {matchResult.status === 'confirmed' && matchResult.winner_id && (
            <div className="p-3 bg-primary/5 rounded border border-primary/10">
              <p className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" />
                Winner: {matchResult.winner_id === match.player1?.user_id ? match.player1?.gamertag : match.player2?.gamertag}
              </p>
              {matchResult.admin_override && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  Resolved by Admin Override
                </div>
              )}
            </div>
          )}

          {matchResult.status === 'pending' && (
            <div className="text-xs text-muted-foreground space-y-2 p-2 bg-background/50 rounded">
              <div className="flex justify-between items-center">
                <span>Your report:</span>
                <span className="font-medium text-foreground">{myReport ? (myReport === currentUserId ? 'You won' : 'Opponent won') : 'Waiting...'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Opponent report:</span>
                <span className="font-medium text-foreground">{opponentReport ? (opponentReport === currentUserId ? 'You won' : 'Opponent won') : 'Waiting...'}</span>
              </div>
            </div>
          )}

          {matchResult.status === 'disputed' && (
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Match Disputed
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Results don't match. An admin has been notified and will resolve this shortly.
                </p>
              </div>
              
              {matchResult.screenshot_url && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Evidence Provided</p>
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-border group">
                    <img 
                      src={matchResult.screenshot_url} 
                      alt="Match Result Screenshot" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" size="sm" asChild>
                        <a href={matchResult.screenshot_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                          <Upload className="h-3 w-3" />
                          View Full Size
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chat Messages */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Match Chat</p>
        <ScrollArea className="h-[250px] p-4 border rounded-lg bg-muted/10">
          {loadingMessages ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30 animate-pulse" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isCurrentUser = msg.user_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} ${msg.is_referee ? 'items-center' : ''}`}>
                    <span className={`text-[10px] font-medium mb-1 px-1 ${msg.is_referee ? 'text-amber-400 font-bold' : 'text-muted-foreground'}`}>
                      {msg.is_referee ? `${msg.user} (Official)` : (isCurrentUser ? 'You' : msg.user)}
                    </span>
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                        msg.is_referee
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl'
                          : isCurrentUser 
                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                            : 'bg-muted border border-border rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">
                        {msg.text}
                      </p>
                      <span className={`text-[9px] mt-1 block ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Chat Input */}
      {(isParticipant || isReferee || isAdmin) && matchResult?.status !== 'confirmed' && (
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="bg-muted/30"
          />
          <Button onClick={handleSendMessage} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Admin/Referee Actions */}
      {(isAdmin || isReferee) && matchResult?.status !== 'confirmed' && (
        <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-4 w-4" />
            <h4 className="text-sm font-semibold uppercase tracking-wider">Official Override Controls</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            As an official, you can resolve disputes by manually selecting a winner. This decision is final.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              onClick={() => handleAdminOverride(match.player1!.user_id)}
              disabled={submitting}
              variant="outline"
              className="bg-primary/5 hover:bg-primary/10 border-primary/30"
            >
              Award {match.player1?.gamertag}
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleAdminOverride(match.player2!.user_id)}
              disabled={submitting}
              variant="outline"
              className="bg-primary/5 hover:bg-primary/10 border-primary/30"
            >
              Award {match.player2?.gamertag}
            </Button>
            {matchResult?.status === 'disputed' && (
              <Button 
                size="sm" 
                onClick={handleCancelDispute}
                disabled={submitting}
                variant="destructive"
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
              >
                Cancel Dispute (Reset)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Result Submission */}
      {isParticipant && (!matchResult || matchResult.status === 'pending') && (
        <div className="space-y-6 pt-4 border-t border-border">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Report Match Result</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={myReport === match.player1?.user_id ? 'default' : 'outline'}
                onClick={() => handleReportResult(match.player1!.user_id)}
                disabled={submitting}
                className="gap-2 h-12"
              >
                <Trophy className={`h-4 w-4 ${myReport === match.player1?.user_id ? 'text-gold' : ''}`} />
                {match.player1?.gamertag} Won
              </Button>
              <Button
                variant={myReport === match.player2?.user_id ? 'default' : 'outline'}
                onClick={() => handleReportResult(match.player2!.user_id)}
                disabled={submitting}
                className="gap-2 h-12"
              >
                <Trophy className={`h-4 w-4 ${myReport === match.player2?.user_id ? 'text-gold' : ''}`} />
                {match.player2?.gamertag} Won
              </Button>
            </div>
          </div>

          <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Upload Screenshot Evidence</h4>
            <div className="flex flex-col gap-3">
              <Input
                type="file"
                accept="image/*"
                onChange={handleScreenshotUpload}
                disabled={uploading}
                className="bg-background"
              />
              {matchResult?.screenshot_url && (
                <div className="flex items-center gap-2 text-xs text-green-500 font-medium">
                  <CheckCircle className="h-3 w-3" />
                  Evidence uploaded successfully
                </div>
              )}
            </div>
            {uploading && <p className="text-[10px] text-muted-foreground mt-2 animate-pulse">Uploading evidence...</p>}
          </div>
        </div>
      )}

      <div className="h-8 shrink-0" /> {/* Spacer for bottom scroll padding */}
    </div>
  );
}

function generateBracket(
  participants: Participant[],
  matchResults: Record<string, MatchResult>,
  teams: Record<string, Team>,
  maxPlayers: number
): Match[][] {
  const teamMode = Object.keys(teams).length > 0;
  
  // 1. Process participants for display (handle team mode)
  let processedParticipants = [...participants];
  if (teamMode) {
    const teamEntries: Record<string, any> = {};
    // Group participants by team and use the team representative for bracket slots
    participants.forEach(p => {
      if (p.team_id && !teamEntries[p.team_id]) {
        teamEntries[p.team_id] = {
          ...p,
          gamertag: teams[p.team_id]?.team_name || 'Unknown Team',
          id: p.team_id,
        };
      }
    });
    processedParticipants = Object.values(teamEntries);
  }

  // 2. Sort by seed or registration order for PREDICTION
  const sortedParticipants = processedParticipants.sort((a, b) => {
    if (a.bracket_seed !== null && b.bracket_seed !== null) {
      return (a.bracket_seed || 0) - (b.bracket_seed || 0);
    }
    // Fallback to registration order (using ID as proxy if created_at isn't available)
    return a.id.localeCompare(b.id);
  });

  const n = sortedParticipants.length;
  if (n < 2) return [];

  // Calculate bracket structure
  const numRounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, numRounds);
  const numByes = bracketSize - n;
  
  const rounds: Match[][] = [];

  // ── Round 1 ──────────────────────────────────────────────
  const firstRound: Match[] = [];
  let playerIndex = 0;

  for (let matchIndex = 0; matchIndex < bracketSize / 2; matchIndex++) {
    const matchId = `r1-m${matchIndex}`;
    const result = matchResults[matchId];
    
    let player1: Participant | undefined;
    let player2: Participant | undefined;

    // IF DATABASE HAS THE MATCH, USE IT STRICTLY
    if (result && (result.player1_id || result.team1_id)) {
      const p1 = participants.find(p => teamMode ? p.team_id === result.team1_id : p.user_id === result.player1_id);
      const p2 = participants.find(p => teamMode ? p.team_id === result.team2_id : p.user_id === result.player2_id);
      
      if (p1) player1 = teamMode ? { ...p1, gamertag: teams[p1.team_id!]?.team_name || p1.gamertag } : p1;
      if (p2) player2 = teamMode ? { ...p2, gamertag: teams[p2.team_id!]?.team_name || p2.gamertag } : p2;
    } else if (Object.keys(matchResults).length === 0) {
      // ONLY PREDICT IF NO MATCHES AT ALL EXIST IN DB
      if (matchIndex < numByes) {
        player1 = sortedParticipants[playerIndex++];
        player2 = undefined;
      } else {
        player1 = sortedParticipants[playerIndex++];
        player2 = sortedParticipants[playerIndex++];
      }
    }

    firstRound.push({
      id: matchId,
      round: 1,
      matchNumber: matchIndex + 1,
      player1,
      player2,
      isBye: result ? !!(result.player1_id && !result.player2_id && result.status === 'confirmed') : (matchIndex < numByes),
      result,
      winner: result?.winner_id || (matchIndex < numByes && player1 ? player1.user_id : undefined),
    });
  }
  rounds.push(firstRound);

  // ── Subsequent Rounds ────────────────────────────────────
  for (let round = 2; round <= numRounds; round++) {
    const prevRound = rounds[round - 2];
    const currentRound: Match[] = [];
    const numMatchesInRound = Math.pow(2, numRounds - round);

    for (let matchIndex = 0; matchIndex < numMatchesInRound; matchIndex++) {
      const matchId = `r${round}-m${matchIndex}`;
      const result = matchResults[matchId];
      
      let player1: Participant | undefined;
      let player2: Participant | undefined;

      if (result && (result.player1_id || result.team1_id)) {
        // Use database pairing
        const p1 = participants.find(p => teamMode ? p.team_id === result.team1_id : p.user_id === result.player1_id);
        const p2 = participants.find(p => teamMode ? p.team_id === result.team2_id : p.user_id === result.player2_id);
        
        if (p1) player1 = teamMode ? { ...p1, gamertag: teams[p1.team_id!]?.team_name || p1.gamertag } : p1;
        if (p2) player2 = teamMode ? { ...p2, gamertag: teams[p2.team_id!]?.team_name || p2.gamertag } : p2;
      }

      // If no result yet, try to pull winners from previous round
      if (!player1 || !player2) {
        const match1 = prevRound[matchIndex * 2];
        const match2 = prevRound[matchIndex * 2 + 1];

        if (!player1 && match1?.winner) {
          const p1 = participants.find(p => (teamMode ? p.team_id : p.user_id) === match1.winner);
          if (p1) player1 = teamMode ? { ...p1, gamertag: teams[p1.team_id!]?.team_name || p1.gamertag } : p1;
        }
        if (!player2 && match2?.winner) {
          const p2 = participants.find(p => (teamMode ? p.team_id : p.user_id) === match2.winner);
          if (p2) player2 = teamMode ? { ...p2, gamertag: teams[p2.team_id!]?.team_name || p2.gamertag } : p2;
        }
      }

      currentRound.push({
        id: matchId,
        round,
        matchNumber: matchIndex + 1,
        player1,
        player2,
        isBye: result ? !!(result.player1_id && !result.player2_id && result.status === 'confirmed') : false,
        result,
        winner: result?.winner_id || undefined,
      });
    }
    rounds.push(currentRound);
  }

  return rounds;
}

const isActiveTournament = (status?: string): boolean => {
  return ['active', 'live', 'started', 'in_progress', 'ongoing', 'running'].includes(
    status?.toLowerCase() || ''
  );
};

function MatchCard({ match, currentUserId, tournamentId, isAdmin, winnerId, tournamentStatus, tournamentStartTime, tournamentName, participants, initialOpen = false }: { match: Match; currentUserId: string; tournamentId: string; isAdmin: boolean; winnerId?: string; tournamentStatus?: string; tournamentStartTime?: string; tournamentName?: string; participants?: Participant[]; initialOpen?: boolean }) {
  const navigate = useNavigate();
  const [extending, setExtending] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(initialOpen);
  
  const matchResult = match.result;
  const isParticipant = match.player1?.user_id === currentUserId || match.player2?.user_id === currentUserId;
  const isPlayer1 = match.player1?.user_id === currentUserId;
  const isPlayer2 = match.player2?.user_id === currentUserId;
  const hasPlayers = match.player1 && match.player2 && !match.isBye;

  const handleCheckIn = async () => {
    if (!matchResult || !isParticipant || !currentUserId) return;

    setCheckingIn(true);

    try {
      const updateField = isPlayer1 ? 'player1_checked_in' : 'player2_checked_in';
      const readyAtField = isPlayer1 ? 'player1_ready_at' : 'player2_ready_at';

      const { error } = await supabase
        .from('match_results')
        .update({
          [updateField]: true,
          [readyAtField]: new Date().toISOString(),
          submitted_by: currentUserId,
        })
        .eq('id', matchResult.id);

      if (error) throw error;

      toast.success('You are ready! Waiting for opponent...');

      // Notify opponent via Edge Function
      try {
        await supabase.functions.invoke('send-match-notifications', {
          body: {
            type: 'opponent_checked_in',
            matchId: matchResult.id,
            tournamentId,
            player1Id: matchResult.player1_id,
            player2Id: matchResult.player2_id,
            tournamentName: tournamentName || 'Tournament',
          },
        });
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleTimerExpire = async () => {
    if (!matchResult || matchResult.status === 'confirmed') return;

    // Auto-forfeit: no winner, mark as expired
    toast.warning('Match time expired! No result submitted.');
  };

  const handleCheckInExpire = async () => {
    if (!matchResult || !match.player1 || !match.player2) return;
    
    // Call the server-side RPC to handle timeout and standby replacement
    try {
      const { error } = await supabase.rpc('handle_match_check_in_timeout', {
        p_match_result_id: matchResult.id
      });
      
      if (error) throw error;
      
      // Refresh match result to see if we were replaced or advanced
    } catch (error) {
      console.error('Error handling check-in timeout:', error);
    }
  };

  const handleExtendTime = async () => {
    if (!isAdmin || !matchResult) return;

    setExtending(true);

    try {
      if (!matchResult.id) throw new Error('Cannot extend time: match result ID is missing');

      const extensionMinutes = 15;
      const newDeadline = new Date(matchResult.match_deadline || new Date());
      newDeadline.setMinutes(newDeadline.getMinutes() + extensionMinutes);

      const { error } = await supabase
        .from('match_results')
        .update({
          match_deadline: newDeadline.toISOString(),
          time_extended_by_admin: (matchResult.time_extended_by_admin || 0) + extensionMinutes,
        })
        .eq('id', matchResult.id);

      if (error) throw error;

      toast.success(`Match time extended by ${extensionMinutes} minutes`);

    } catch (error: any) {
      console.error('Error extending time:', error);
      toast.error('Failed to extend match time');
    } finally {
      setExtending(false);
    }
  };

  const myCheckedIn = isPlayer1 ? matchResult?.player1_checked_in : matchResult?.player2_checked_in;
  const opponentCheckedIn = isPlayer1 ? matchResult?.player2_checked_in : matchResult?.player1_checked_in;
  const showCheckIn = isActiveTournament(tournamentStatus) && matchResult && !matchResult.both_players_ready && matchResult.status !== 'confirmed';
  const isWinnerMatch = winnerId && (match.player1?.user_id === winnerId || match.player2?.user_id === winnerId);
  const winnerPlayer = winnerId && match.player1?.user_id === winnerId ? match.player1 : match.player2?.user_id === winnerId ? match.player2 : null;
  const isMatchLive = matchResult?.both_players_ready && matchResult?.status !== 'confirmed';
  const streamer = match.player2; // 2nd person is the streamer
  
  return (
    <Card className={`p-3 min-w-[220px] border-border bg-card backdrop-blur-sm ${
      isWinnerMatch && match.winner === winnerId ? 'ring-1 ring-primary/30' : ''
    }`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Match {match.matchNumber}</span>
            {isMatchLive && (
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-bold text-red-500 uppercase tracking-tighter">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {match.round === 1 && (
              <Badge variant="outline" className="text-xs border-border">Round {match.round}</Badge>
            )}
            {match.isBye && (
              <Badge variant="secondary" className="text-xs gap-1 bg-muted border-border">
                <ArrowRight className="h-3 w-3" />
                Bye
              </Badge>
            )}
            {matchResult?.admin_override && matchResult?.status === 'confirmed' && !matchResult.both_players_ready && (
              <Badge variant="destructive" className="text-xs">
                Forfeit
              </Badge>
            )}
          </div>
        </div>
        
        <div className={`p-2 rounded border ${
          match.winner === match.player1?.user_id 
            ? 'border-green-500/50 bg-green-500/10' 
            : matchResult?.status === 'confirmed' && matchResult?.winner_id && matchResult.winner_id !== match.player1?.user_id
              ? 'border-destructive/50 bg-destructive/5 opacity-60'
              : match.player1 
                ? 'border-border bg-muted' 
                : 'border-border bg-muted/20'
        }`}>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className={`text-sm font-medium truncate ${
              match.player1?.user_id === winnerId ? 'font-semibold' : ''
            }`}>
              {match.player1?.gamertag || 'TBD'}
            </span>
            {match.winner === match.player1?.user_id && (
              <Trophy className="h-3 w-3 text-green-500 ml-auto" />
            )}
            {matchResult?.status === 'confirmed' && matchResult?.winner_id && matchResult.winner_id !== match.player1?.user_id && (
              <XCircle className="h-3 w-3 text-destructive ml-auto" />
            )}
            {showCheckIn && matchResult.player1_checked_in && (
              <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />
            )}
          </div>
        </div>

        {!match.isBye && (
          <div className={`p-2 rounded border ${
            match.winner === match.player2?.user_id 
              ? 'border-green-500/50 bg-green-500/10' 
              : matchResult?.status === 'confirmed' && matchResult?.winner_id && matchResult.winner_id !== match.player2?.user_id
                ? 'border-destructive/50 bg-destructive/5 opacity-60'
                : match.player2 
                  ? 'border-border bg-muted' 
                  : 'border-border bg-muted/20'
          }`}>
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className={`text-sm font-medium truncate ${
                match.player2?.user_id === winnerId ? 'font-semibold' : ''
              }`}>
                {match.player2?.gamertag || 'TBD'}
              </span>
              {match.winner === match.player2?.user_id && (
                <Trophy className="h-3 w-3 text-green-500 ml-auto" />
              )}
              {matchResult?.status === 'confirmed' && matchResult?.winner_id && matchResult.winner_id !== match.player2?.user_id && (
                <XCircle className="h-3 w-3 text-destructive ml-auto" />
              )}
              {showCheckIn && matchResult.player2_checked_in && (
                <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />
              )}
            </div>
          </div>
        )}

        {/* View Stream Button for Non-participants */}
        {!isParticipant && isMatchLive && streamer && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-[10px] font-bold tracking-tight"
            onClick={(e) => {
              e.stopPropagation();
              const params = new URLSearchParams({
                p1: match.player1?.gamertag || '',
                p2: match.player2?.gamertag || '',
                streamer: streamer.gamertag || '',
                tid: tournamentId,
                tournamentName: tournamentName || '',
                game: 'eSports'
              });
              navigate(`/live/${match.id}?${params.toString()}`);
            }}
          >
            <Play className="h-3 w-3 fill-primary" />
            VIEW STREAM
          </Button>
        )}

        {/* Check-in Section */}
        {hasPlayers && showCheckIn && (
          <div className="py-2 px-2 bg-muted/20 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Check-in</span>
              <MatchTimer 
                deadline={matchResult.check_in_deadline} 
                onExpire={handleCheckInExpire}
              />
            </div>
            
            {isParticipant && !myCheckedIn && (
              <Button
                onClick={handleCheckIn}
                disabled={checkingIn}
                size="sm"
                className="w-full gap-2"
              >
                <CheckCircle className="h-3 w-3" />
                I'm Ready
              </Button>
            )}
            
            {isParticipant && myCheckedIn && (
              <div className="text-center py-1">
                <p className="text-xs text-green-500 font-medium">✓ You're ready</p>
                <p className="text-xs text-muted-foreground">
                  {opponentCheckedIn ? 'Starting match...' : 'Waiting for opponent...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Match Timer */}
        {hasPlayers && matchResult && matchResult.both_players_ready && matchResult.status !== 'confirmed' && (
          <div className="flex items-center justify-between py-1 px-2 bg-muted/20 rounded">
            <MatchTimer 
              deadline={matchResult.match_deadline} 
              onExpire={handleTimerExpire}
            />
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExtendTime}
                disabled={extending}
                className="h-5 px-2 text-xs"
              >
                +15min
              </Button>
            )}
          </div>
        )}

        {/* Match Chat Button - Only show when both players are ready */}
        {!match.isBye && (
          <div className="border-t border-border pt-2 mt-2">
            {!hasPlayers ? (
              <div className="text-center py-2">
                <MessageCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground">
                  Waiting for players
                </p>
              </div>
            ) : !isActiveTournament(tournamentStatus) ? (
              <div className="text-center py-2">
                <MessageCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground">
                  Available when tournament starts
                </p>
              </div>
            ) : !matchResult ? (
              <div className="text-center py-2">
                <MessageCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground">
                  Initializing match...
                </p>
              </div>
            ) : !matchResult.both_players_ready ? (
              <div className="text-center py-2">
                <MessageCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground">
                  Chat unlocks when both players are ready
                </p>
              </div>
            ) : (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <MessageCircle className="h-3 w-3" />
                    Match Chat
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Match Chat & Results</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      {match.player1?.gamertag} vs {match.player2?.gamertag}
                    </p>
                  </DialogHeader>
                  <MatchChat match={match} currentUserId={currentUserId} tournamentId={tournamentId} isAdmin={isAdmin} participants={participants} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {match.isBye && match.player1 && (
          <div className="mt-2 p-2 bg-muted/30 rounded text-center">
            <p className="text-xs text-muted-foreground">
              Auto-advances to next round
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export function TournamentBracket({ participants, maxPlayers, tournamentId, isAdmin = false, winnerId, isPast = false, tournamentStatus, tournamentStartTime, tournamentName }: TournamentBracketProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetMatchId = searchParams.get('match');
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult>>({});
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    // Load all match results and teams for this tournament
    loadMatchResults();
    loadTeams();
    
    // Subscribe to real-time updates for all match results in this tournament
    const channel = supabase
      .channel(`tournament_results_${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_results',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Tournament match result updated:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const result = payload.new as MatchResult;
            setMatchResults(prev => ({
              ...prev,
              [result.match_id]: result
            }));
            
            // Trigger bracket refresh when match is confirmed
            if (result.status === 'confirmed') {
              setRefreshKey(prev => prev + 1);
            }

            if (payload.eventType === 'UPDATE' && payload.old) {
              const oldResult = payload.old as MatchResult;
              
              // Notify when opponent checks in
              const isPlayer1 = result.player1_id === user?.id;
              const isPlayer2 = result.player2_id === user?.id;
              
              if (isPlayer1 && !oldResult.player2_checked_in && result.player2_checked_in) {
                toast.info('Your opponent is ready!');
              } else if (isPlayer2 && !oldResult.player1_checked_in && result.player1_checked_in) {
                toast.info('Your opponent is ready!');
              }

              // Opponent reported
              if (isPlayer1 && !oldResult.player2_reported_winner && result.player2_reported_winner) {
                toast.info('Your opponent has reported their result');
              } else if (isPlayer2 && !oldResult.player1_reported_winner && result.player1_reported_winner) {
                toast.info('Your opponent has reported their result');
              }

              // Status changed to confirmed
              if (oldResult.status !== 'confirmed' && result.status === 'confirmed' && result.winner_id) {
                const winnerPlayer = participants.find(p => p.user_id === result.winner_id);
                toast.success(`Match confirmed! Winner: ${winnerPlayer?.gamertag || 'Unknown'}`);
              }
              
              // Status changed to disputed
              if (oldResult.status !== 'disputed' && result.status === 'disputed') {
                toast.warning('Match results disputed! Waiting for admin review.');
              }
              
              // Admin override
              if (!oldResult.admin_override && result.admin_override) {
                toast.info('Admin has resolved the dispute');
              }
              
              // Notify when both players are ready
              if (!oldResult.both_players_ready && result.both_players_ready) {
                toast.success('Both players ready! Match timer started.');
              }

              // Detect standby replacement
              const p1Changed = oldResult.player1_id && result.player1_id && oldResult.player1_id !== result.player1_id;
              const p2Changed = oldResult.player2_id && result.player2_id && oldResult.player2_id !== result.player2_id;
              
              if (p1Changed || p2Changed) {
                const newPlayerId = p1Changed ? result.player1_id : result.player2_id;
                const newPlayer = participants.find(p => p.user_id === newPlayerId);
                if (newPlayer) {
                  toast.info(`Standby player ${newPlayer.gamertag} has been allocated to a match!`, {
                    description: "A player failed to check in and was replaced.",
                    duration: 5000
                  });
                }
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const result = payload.old as MatchResult;
            setMatchResults(prev => {
              const newResults = { ...prev };
              delete newResults[result.match_id];
              return newResults;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, participants]);

  const loadMatchResults = async () => {
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error loading match results:', error);
      return;
    }

    if (data) {
      const resultsMap: Record<string, MatchResult> = {};
      data.forEach((result: any) => {
        resultsMap[result.match_id] = result;
      });
      setMatchResults(resultsMap);
    }
  };

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from('tournament_teams')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error loading teams:', error);
      return;
    }

    if (data) {
      const teamsMap: Record<string, Team> = {};
      data.forEach((team: Team) => {
        teamsMap[team.id] = team;
      });
      setTeams(teamsMap);
    }
  };
  
  if (participants.length < 2) {
    return (
      <div className="text-center py-20">
        <Users className="h-20 w-20 mx-auto mb-6 text-muted-foreground opacity-30" />
        <h3 className="text-2xl font-semibold mb-3">Not Enough Participants</h3>
        <p className="text-muted-foreground text-lg">
          At least 2 participants are required to generate a bracket
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Current participants: {formatCompactNumber(participants.length)} / {formatCompactNumber(maxPlayers)}
        </p>
      </div>
    );
  }

  const rounds = generateBracket(participants, matchResults, teams, maxPlayers);
  const hasByes = rounds[0].some(match => match.isBye);

  // No need to apply match results again since generateBracket already does it
  // But we keep this for any additional processing if needed

  return (
    <div className={`space-y-6 ${isPast ? 'opacity-60 grayscale' : ''}`} key={refreshKey}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-light">Single Elimination Bracket</h3>
          <p className="text-sm text-muted-foreground font-light">
            {formatCompactNumber(participants.length)} participants • {formatCompactNumber(rounds.length)} rounds
            {hasByes && ' • Auto-advancement for byes'}
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Trophy className="h-4 w-4" />
          {formatCompactNumber(rounds.length)} Rounds
        </Badge>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="space-y-4">
              <div className="text-center mb-4">
                <Badge variant="secondary" className="font-light">
                  {roundIndex === rounds.length - 1 ? 'Finals' : 
                   roundIndex === rounds.length - 2 ? 'Semi-Finals' :
                   roundIndex === rounds.length - 3 ? 'Quarter-Finals' :
                   `Round ${roundIndex + 1}`}
                </Badge>
              </div>
              
              <div className="space-y-8">
                {round.map((match) => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    currentUserId={user?.id || ''} 
                    tournamentId={tournamentId}
                    isAdmin={isAdmin}
                    winnerId={winnerId}
                    tournamentStatus={tournamentStatus}
                    tournamentStartTime={tournamentStartTime}
                    tournamentName={tournamentName}
                    participants={participants}
                    initialOpen={match.id === targetMatchId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground text-center">
          Players with no opponent automatically advance. Report match results to progress through the bracket.
        </p>
      </div>
    </div>
  );
}
