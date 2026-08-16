import { 
  AlertTriangle,
  ArrowLeft, 
  Bell,
  BellOff, 
  Calendar, 
  CheckCircle,
  Clock,
  DollarSign, 
  Play,
  Trophy, 
  Users, 
  XCircle
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConsentModal } from '@/components/ConsentModal';
import { RefereeApplicationChat } from '@/components/RefereeApplicationChat';
import { TournamentBracket } from '@/components/TournamentBracket';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WinnerSpotlight } from '@/components/WinnerSpotlight';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import { formatCurrency } from '@/lib/format-number';
import { formatTimeUntil } from '@/lib/utils';
import type { Profile, Tournament } from '@/types/database';
import { GAME_INFO, GAME_MODES } from '@/types/database';

interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  team_id?: string | null;
  gamertag: string | null;
  bracket_seed: number | null;
  checked_in: boolean;
  checked_in_at: string | null;
  eliminated: boolean;
  is_standby: boolean;
  final_position: number | null;
  prize_won: number;
  paid_at: string;
  created_at: string;
  profiles: Profile;
}

interface JoinTeamDialogProps {
  tournament: Tournament;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (teamId: string, teamName: string, members: string[]) => void;
  loading: boolean;
}

function JoinTeamDialog({ tournament, open, onOpenChange, onSuccess, loading }: JoinTeamDialogProps) {
  const [teamName, setTeamName] = useState('');
  const [memberGamertags, setMemberGamertags] = useState<string[]>(['', '', '', '']); // 4 members + captain
  const teamSize = tournament.team_size;

  const handleMemberChange = (index: number, value: string) => {
    const newGamertags = [...memberGamertags];
    newGamertags[index] = value;
    setMemberGamertags(newGamertags);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    const members = memberGamertags.filter(g => g.trim() !== '');
    if (members.length < teamSize - 1) {
      toast.error(`A team for this tournament must have exactly ${teamSize} members. Please provide ${teamSize - 1} teammate gamertags.`);
      return;
    }

    onSuccess(crypto.randomUUID(), teamName, members);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light tracking-tight">Register Team</DialogTitle>
          <DialogDescription className="font-light text-muted-foreground">
            Enter your team name and invite 4 other members. All members must be registered on ARENA.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="teamName" className="text-sm font-light text-muted-foreground uppercase tracking-wider">Team Name</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="bg-muted/30 border-border/50"
              required
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-light text-muted-foreground uppercase tracking-wider">Teammates (Gamertags)</Label>
            {Array.from({ length: teamSize - 1 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Label htmlFor={`member-${i}`} className="text-xs font-light text-muted-foreground">Member {i + 2}</Label>
                <Input
                  id={`member-${i}`}
                  value={memberGamertags[i]}
                  onChange={(e) => handleMemberChange(i, e.target.value)}
                  placeholder={`Member ${i + 2} gamertag`}
                  className="bg-muted/30 border-border/50"
                  required
                />
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full sheen-effect bg-gradient-to-r from-blue-600 to-violet-600 hover:scale-[1.02] transition-transform"
              disabled={loading}
            >
              {loading ? 'Registering Team...' : 'Register Team & Join'}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground font-light mt-3">
              By clicking join, you confirm all members have agreed to participate. 
              Matches may be canceled if teams are incomplete.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TournamentDetail() {
  const { id } = useParams();
  const { user, profile, refreshProfile } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [teams, setTeams] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [gameIdPromptOpen, setGameIdPromptOpen] = useState(false);
  const [pendingGameId, setPendingGameId] = useState('');
  const [checkingGameId, setCheckingGameId] = useState(false);
  const [joinTeamDialogOpen, setJoinTeamDialogOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentConfig, setConsentConfig] = useState<{
    title: string;
    description: string;
    amount: number;
    onConfirm: () => void;
  } | null>(null);
  const [tournamentWinner, setTournamentWinner] = useState<TournamentParticipant | null>(null);
  const [showWinnerSpotlight, setShowWinnerSpotlight] = useState(false);
  const [reminders, setReminders] = useState({
    reminder_24h: false,
    reminder_1h: false,
    reminder_15m: false
  });
  const [hasReminder, setHasReminder] = useState(false);

  const [refereeChatOpen, setRefereeChatOpen] = useState(false);
  const [hasAppliedForReferee, setHasAppliedForReferee] = useState(false);
  const [refereeApplicationId, setRefereeApplicationId] = useState<string | null>(null);
  const [isLiveToastShown, setIsLiveToastShown] = useState(false);

  const fetchTournamentData = React.useCallback(async () => {
    try {
      // Fire status update in the background — don't block data fetching
      supabase.rpc('check_and_update_tournament_status');

      // Fetch tournament + participants + user data all in parallel
      const [
        { data: tournamentData, error: tournamentError },
        { data: participantsData, error: participantsError },
        { data: reminderData },
        { data: appData },
      ] = await Promise.all([
        supabase.from('tournaments').select('*').eq('id', id).single(),
        supabase
          .from('tournament_participants')
          .select('*, profiles (*)')
          .eq('tournament_id', id)
          .order('created_at', { ascending: true }),
        user
          ? supabase.from('tournament_reminders').select('*').eq('user_id', user.id).eq('tournament_id', id).maybeSingle()
          : Promise.resolve({ data: null }),
        user
          ? supabase.from('referee_applications').select('id, status').eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (tournamentError) throw tournamentError;
      if (participantsError) throw participantsError;

      setTournament(tournamentData);
      setParticipants(participantsData || []);

      // If team tournament, fetch teams (depends on tournamentData)
      if (tournamentData.team_size > 1) {
        const { data: teamsData } = await supabase
          .from('tournament_teams')
          .select('*')
          .eq('tournament_id', id);

        if (teamsData) {
          const teamsMap: Record<string, any> = {};
          teamsData.forEach(t => { teamsMap[t.id] = t; });
          setTeams(teamsMap);
        }
      }

      if (reminderData) {
        setReminders({
          reminder_24h: reminderData.reminder_24h,
          reminder_1h: reminderData.reminder_1h,
          reminder_15m: reminderData.reminder_15m
        });
        setHasReminder(
          reminderData.reminder_24h ||
          reminderData.reminder_1h ||
          reminderData.reminder_15m
        );
      }

      if (appData) {
        setHasAppliedForReferee(true);
        setRefereeApplicationId(appData.id);
      }

      // Check for tournament winner (final match result)
      if (tournamentData.status === 'completed' || tournamentData.status === 'active' || tournamentData.status === 'live') {
        const numRounds = Math.ceil(Math.log2(participantsData?.length || 1));
        const finalMatchId = `r${numRounds}-m0`;

        const { data: finalMatch } = await supabase
          .from('match_results')
          .select('winner_id')
          .eq('tournament_id', id)
          .eq('match_id', finalMatchId)
          .eq('status', 'confirmed')
          .maybeSingle();

        if (finalMatch?.winner_id) {
          const winner = participantsData?.find(p => p.user_id === finalMatch.winner_id);
          if (winner) {
            console.log('Tournament winner detected:', winner.profiles.gamertag);
            setTournamentWinner(winner);
            setTimeout(() => {
              setShowWinnerSpotlight(true);
            }, 500);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast.error('Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  const handleCountdownComplete = React.useCallback(() => {
    if (!isLiveToastShown && tournament?.status === 'open') {
      toast.success('Tournament is now live!');
      setIsLiveToastShown(true);
      fetchTournamentData();
    }
  }, [isLiveToastShown, tournament?.status, fetchTournamentData]);

  const isParticipant = participants.some(p => p.user_id === user?.id);
  const isStandby = participants.some(p => p.user_id === user?.id && p.is_standby);
  const confirmedParticipants = participants.filter(p => !p.is_standby);
  const isFull = tournament ? confirmedParticipants.length >= tournament.max_players : false;
  const isBeforeStart = tournament ? new Date(tournament.start_time) > new Date() : false;
  const canJoin = tournament?.status === 'open' && !isParticipant && isBeforeStart;
  const joinAsStandby = isFull && canJoin;

  useEffect(() => {
    if (id) {
      fetchTournamentData();
      return subscribeToUpdates();
    }
  }, [id]);

  const subscribeToUpdates = () => {
    const participantsChannel = supabase
      .channel(`tournament-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${id}`
        },
        () => {
          fetchTournamentData();
        }
      )
      .subscribe();

    const tournamentChannel = supabase
      .channel(`tournament-details-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${id}`
        },
        () => {
          fetchTournamentData();
        }
      )
      .subscribe();

    // Subscribe to match results to detect winner
    const matchResultsChannel = supabase
      .channel(`tournament-${id}-results`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_results',
          filter: `tournament_id=eq.${id}`
        },
        async (payload) => {
          const newResult = payload.new as any;
          
          console.log('Match result updated:', newResult.match_id, 'status:', newResult.status, 'winner:', newResult.winner_id);
          
          // Check if this is the final match being confirmed
          if (newResult.status === 'confirmed' && newResult.winner_id && participants.length > 0) {
            const numRounds = Math.ceil(Math.log2(participants.length));
            const finalMatchId = `r${numRounds}-m0`;
            
            console.log('Checking if final match:', newResult.match_id, 'vs', finalMatchId);
            
            if (newResult.match_id === finalMatchId) {
              const winner = participants.find(p => p.user_id === newResult.winner_id);
              console.log('Final match winner found:', winner?.profiles.gamertag);
              if (winner && !tournamentWinner) {
                setTournamentWinner(winner);
                setTimeout(() => {
                  setShowWinnerSpotlight(true);
                }, 500);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(tournamentChannel);
      supabase.removeChannel(matchResultsChannel);
    };
  };

  const executeTeamRegister = async (teamId: string, teamName: string, members: string[], totalTeamFee: number) => {
    setJoining(true);
    try {
      // Fetch latest balance
      const { data: latestProfile } = await supabase
        .from('profiles')
        .select('arena_currency, available_balance')
        .eq('id', user!.id)
        .single();
      
      const currentBalance = latestProfile?.arena_currency || 0;

      if (totalTeamFee > 0 && currentBalance < totalTeamFee) {
        throw new Error(`Insufficient Arena Currency. You need ${formatArenaCurrency(totalTeamFee)} to register a team.`);
      }

      // NO MANUAL DEDUCTION HERE - Handled by database trigger on tournament_participants table
      // Note: Only the captain pays for the whole team in this logic

      // 1. Validate all members exist in profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, gamertag')
        .in('gamertag', members);

      if (profileError) throw profileError;

      const foundGamertags = profiles?.map(p => p.gamertag) || [];
      const missingGamertags = members.filter(g => !foundGamertags.includes(g));

      if (missingGamertags.length > 0) {
        throw new Error(`The following gamertags were not found: ${missingGamertags.join(', ')}. Teammates must be registered on ARENA.`);
      }

      // 2. Create the team
      const { error: teamError } = await supabase
        .from('tournament_teams')
        .insert({
          id: teamId,
          tournament_id: tournament!.id,
          team_name: teamName,
          captain_id: user!.id
        });

      if (teamError) throw teamError;

      // 3. Add all members to tournament_participants and tournament_team_members
      const allMembers = [
        { user_id: user!.id, gamertag: profile?.gamertag || 'Captain' },
        ...profiles.map(p => ({ user_id: p.id, gamertag: p.gamertag }))
      ];

      // Add to participants
      const participantEntries = allMembers.map((m, i) => ({
        tournament_id: tournament!.id,
        user_id: m.user_id,
        gamertag: m.gamertag,
        team_id: teamId,
        checked_in: false,
        is_standby: isFull,
        amount_paid: i === 0 ? totalTeamFee : 0
      }));

      const { error: partError } = await supabase
        .from('tournament_participants')
        .insert(participantEntries);

      if (partError) throw partError;

      // Add to team members
      const teamMemberEntries = allMembers.map((m, i) => ({
        team_id: teamId,
        user_id: m.user_id,
        role: i === 0 ? 'captain' : 'member'
      }));

      const { error: memberError } = await supabase
        .from('tournament_team_members')
        .insert(teamMemberEntries);

      if (memberError) throw memberError;

      toast.success(`Team ${teamName} registered successfully!`);
      setJoinTeamDialogOpen(false);
      setConsentOpen(false);
      fetchTournamentData();
      await refreshProfile();
    } catch (error: any) {
      console.error('Error registering team:', error);
      toast.error(error.message || 'Failed to register team');
    } finally {
      setJoining(false);
    }
  };

  const handleTeamRegister = async (teamId: string, teamName: string, members: string[]) => {
    if (!user || !tournament) return;

    const entryFee = tournament.entry_fee || 0;
    const teamSize = tournament.team_size || 1;
    const totalTeamFee = entryFee * teamSize;
    
    if (totalTeamFee > 0) {
      const userBalance = profile?.arena_currency || 0;
      if (userBalance < totalTeamFee) {
        toast.error(`Insufficient Arena Currency. You need ${formatArenaCurrency(totalTeamFee)} to register a team.`);
        return;
      }

      setConsentConfig({
        title: `Register Team: ${teamName}`,
        description: `You are registering your team for ${tournament.name}. The total entry fee for your team (${teamSize} members) will be deducted from your balance.`,
        amount: totalTeamFee,
        onConfirm: () => executeTeamRegister(teamId, teamName, members, totalTeamFee)
      });
      setConsentOpen(true);
    } else {
      executeTeamRegister(teamId, teamName, members, 0);
    }
  };

  const executeJoinTournament = async (entryFee: number) => {
    setJoining(true);
    try {
      // Fetch latest balance
      const { data: latestProfile } = await supabase
        .from('profiles')
        .select('arena_currency, available_balance')
        .eq('id', user!.id)
        .single();
      
      const currentBalance = latestProfile?.arena_currency || 0;

      if (entryFee > 0 && currentBalance < entryFee) {
        throw new Error(`Insufficient Arena Currency. You need ${formatArenaCurrency(entryFee)} to join.`);
      }

      // NO MANUAL DEDUCTION HERE - Handled by database trigger tr_tournament_join_fee on tournament_participants table

      // Get gamertag from profile or generate default
      const gamertag = profile?.gamertag || user!.email?.split('@')[0] || `Player${Math.floor(Math.random() * 10000)}`;

      // Insert participant with required fields
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament!.id,
          user_id: user!.id,
          gamertag: gamertag,
          checked_in: false,
          is_standby: isFull,
          amount_paid: entryFee
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      toast.success('Successfully joined tournament!');
      setConsentOpen(false);
      fetchTournamentData();
      await refreshProfile();
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      const errorMessage = error?.message || error?.details || 'Failed to join tournament';
      toast.error(errorMessage);
    } finally {
      setJoining(false);
    }
  };

  const checkGameIdThenProceed = async (proceed: () => void) => {
    if (!user || !tournament) return;
    setCheckingGameId(true);
    try {
      const { data: existingAccount } = await supabase
        .from('game_accounts')
        .select('id, in_game_name')
        .eq('user_id', user.id)
        .eq('game', tournament.game)
        .maybeSingle();

      if (!existingAccount || !existingAccount.in_game_name) {
        setGameIdPromptOpen(true);
        return;
      }
      proceed();
    } catch (error) {
      console.error('Error checking game account:', error);
      // Don't hard-block joining over a lookup failure — fall through
      proceed();
    } finally {
      setCheckingGameId(false);
    }
  };

  const saveGameIdAndContinue = async () => {
    if (!user || !tournament || !pendingGameId.trim()) return;
    try {
      const { error } = await supabase
        .from('game_accounts')
        .upsert(
          { user_id: user.id, game: tournament.game, in_game_name: pendingGameId.trim() },
          { onConflict: 'user_id,game' }
        );
      if (error) throw error;

      toast.success(`${GAME_INFO[tournament.game]?.name ?? tournament.game} ID saved`);
      setGameIdPromptOpen(false);
      setPendingGameId('');
      handleJoinTournament(true);
    } catch (error: any) {
      console.error('Error saving game ID:', error);
      toast.error(error.message || 'Failed to save game ID');
    }
  };

  const handleJoinTournament = async (skipGameIdCheck = false) => {
    if (!user || !tournament) return;

    if (!skipGameIdCheck) {
      checkGameIdThenProceed(() => handleJoinTournament(true));
      return;
    }

    if (tournament.team_size > 1) {
      setJoinTeamDialogOpen(true);
      return;
    }

    const entryFee = tournament.entry_fee || 0;
    
    if (entryFee > 0) {
      const userBalance = profile?.arena_currency || 0;
      if (userBalance < entryFee) {
        toast.error(`Insufficient Arena Currency. You need ${formatArenaCurrency(entryFee)} to join.`);
        return;
      }

      setConsentConfig({
        title: `Join Tournament: ${tournament.name}`,
        description: `You are about to join this tournament. An entry fee will be deducted from your Arena Currency balance.`,
        amount: entryFee,
        onConfirm: () => executeJoinTournament(entryFee)
      });
      setConsentOpen(true);
    } else {
      executeJoinTournament(0);
    }
  };

  const handleToggleReminder = async (reminderType: 'reminder_24h' | 'reminder_1h' | 'reminder_15m') => {
    if (!user || !tournament) return;

    try {
      const newValue = !reminders[reminderType];
      
      // Check if reminder record exists
      const { data: existing } = await supabase
        .from('tournament_reminders')
        .select('id')
        .eq('user_id', user.id)
        .eq('tournament_id', tournament.id)
        .maybeSingle();

      if (existing) {
        // Update existing reminder
        const { error } = await supabase
          .from('tournament_reminders')
          .update({ 
            [reminderType]: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new reminder
        const { error } = await supabase
          .from('tournament_reminders')
          .insert({
            user_id: user.id,
            tournament_id: tournament.id,
            [reminderType]: newValue
          });

        if (error) throw error;
      }

      // Update local state
      setReminders(prev => ({ ...prev, [reminderType]: newValue }));
      setHasReminder(
        (reminderType === 'reminder_24h' ? newValue : reminders.reminder_24h) ||
        (reminderType === 'reminder_1h' ? newValue : reminders.reminder_1h) ||
        (reminderType === 'reminder_15m' ? newValue : reminders.reminder_15m)
      );

      const timeText = {
        reminder_24h: '24 hours',
        reminder_1h: '1 hour',
        reminder_15m: '15 minutes'
      }[reminderType];

      toast.success(
        newValue 
          ? `Reminder set for ${timeText} before start` 
          : `Reminder removed for ${timeText} before start`
      );
    } catch (error) {
      console.error('Error toggling reminder:', error);
      toast.error('Failed to update reminder');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="h-96 bg-muted/20 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-xl font-semibold mb-2">Tournament not found</h3>
            <Link to="/dashboard">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gameInfo = GAME_INFO[tournament.game];
  const startTime = new Date(tournament.start_time);
  const now = new Date();
  const timeUntilStart = startTime.getTime() - now.getTime();
  const minutesUntilStart = Math.floor(timeUntilStart / 60000);
  const isPastTournament = tournament.status === 'completed' || (now.getTime() - startTime.getTime() > 3 * 60 * 60 * 1000);

  return (
    <div className="min-h-screen">
      {/* Team Join Dialog */}
      {tournament && (
        <JoinTeamDialog
          tournament={tournament}
          open={joinTeamDialogOpen}
          onOpenChange={setJoinTeamDialogOpen}
          onSuccess={handleTeamRegister}
          loading={joining}
        />
      )}

      {consentConfig && (
        <ConsentModal
          open={consentOpen}
          onOpenChange={setConsentOpen}
          title={consentConfig.title}
          description={consentConfig.description}
          amount={consentConfig.amount}
          onConfirm={consentConfig.onConfirm}
          loading={joining}
        />
      )}

      {/* Game ID prompt — shown when joining a game the user hasn't registered an ID for yet */}
      {tournament && (
        <Dialog open={gameIdPromptOpen} onOpenChange={setGameIdPromptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add your {GAME_INFO[tournament.game]?.name ?? tournament.game} ID</DialogTitle>
              <DialogDescription>
                We need your in-game ID for {GAME_INFO[tournament.game]?.name ?? tournament.game} before you can
                join this tournament — this is how opponents and referees identify you in-match.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="pending-game-id">In-game ID / username</Label>
              <Input
                id="pending-game-id"
                value={pendingGameId}
                onChange={(e) => setPendingGameId(e.target.value)}
                placeholder="e.g. your in-game handle or player ID"
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              onClick={saveGameIdAndContinue}
              disabled={!pendingGameId.trim()}
            >
              Save & Continue Joining
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Winner Spotlight Modal */}
      {tournamentWinner && tournament && (
        <WinnerSpotlight
          open={showWinnerSpotlight}
          onOpenChange={setShowWinnerSpotlight}
          winner={{
            user_id: tournamentWinner.user_id,
            gamertag: tournamentWinner.profiles.gamertag,
            avatar_url: tournamentWinner.profiles.avatar_url
          }}
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          prizeAmount={tournament.prize_pool * ((tournament.prize_distribution as any)['1st'] || 0.5)}
          game={tournament.game}
          totalPlayers={tournament.max_players}
          duration="2h 34m"
        />
      )}
      
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
        {/* Header */}
        <div className="space-y-4">
          <Link to={`/game/${tournament.game}`}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {gameInfo.name}
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={gameInfo.logo} alt={gameInfo.name} className="h-16 w-auto" />
                <Badge 
                  variant={tournament.status === 'open' ? 'default' : (tournament.status === 'cancelled' ? 'destructive' : 'secondary')}
                  className={tournament.status === 'open' ? 'bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 border-0 shadow-lg shadow-blue-500/50' : (tournament.status === 'cancelled' ? 'bg-destructive/80' : '')}
                >
                  {tournament.status.toUpperCase()}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{tournament.name}</h1>
              {tournament.description && (
                <p className="text-muted-foreground text-lg max-w-2xl">{tournament.description}</p>
              )}
            </div>

            {canJoin && !isPastTournament && (
              <Button 
                size="lg" 
                onClick={() => handleJoinTournament()}
                disabled={joining}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 border-0"
              >
                {joining ? 'Joining...' : (joinAsStandby ? 'Join as Standby' : 'Join Tournament')}
              </Button>
            )}

            {(isPastTournament || tournament.status === 'cancelled') && (
              <Badge variant={tournament.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-sm font-light px-4 py-2">
                {tournament.status === 'cancelled' ? 'Tournament Cancelled' : 'Tournament Ended'}
              </Badge>
            )}
            
            {tournamentWinner && (
              <Button 
                size="lg" 
                onClick={() => setShowWinnerSpotlight(true)}
                variant="outline"
                className="w-full md:w-auto gap-2"
              >
                <Trophy className="h-4 w-4" />
                View Champion
              </Button>
            )}
            {user && !isPastTournament && tournament.status !== 'cancelled' && (
              <Button 
                size="lg" 
                onClick={async () => {
                  if (hasAppliedForReferee) {
                    setRefereeChatOpen(true);
                  } else {
                    try {
                      const { data, error } = await supabase
                        .from('referee_applications')
                        .insert({ user_id: user.id })
                        .select()
                        .single();
                      if (error) throw error;
                      setHasAppliedForReferee(true);
                      setRefereeApplicationId(data.id);
                      setRefereeChatOpen(true);
                      toast.success('Application submitted! Chat with admin to proceed.');
                    } catch (error) {
                      toast.error('Failed to submit application');
                    }
                  }
                }}
                variant="secondary"
                className="w-full md:w-auto gap-2"
              >
                <Users className="h-4 w-4" />
                {hasAppliedForReferee ? 'View Referee Application' : 'Apply to be Referee'}
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats - Gradient Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-indigo-500/20 via-indigo-600/10 to-transparent border border-indigo-500/20 backdrop-blur-sm">
            <Trophy className="h-8 w-8 mb-3" style={{ color: '#4f46e5' }} />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</p>
              <p 
                className="text-3xl font-black font-mono tracking-tight"
                style={{
                  color: '#4f46e5',
                  filter: 'drop-shadow(0 1px 3px rgba(79, 70, 229, 0.4))',
                }}
              >
                {formatArenaCurrency(tournament.prize_pool)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-light">
                10% platform fee applies
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-green-500/20 via-green-600/10 to-transparent border border-green-500/20 backdrop-blur-sm">
            <DollarSign className="h-8 w-8 text-green-400 mb-3" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Entry Fee</p>
              <p className="text-2xl font-bold font-mono">
                {formatArenaCurrency(tournament.entry_fee)}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-transparent border border-blue-500/20 backdrop-blur-sm">
            <Users className="h-8 w-8 text-blue-400 mb-3" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Players</p>
              <p className="text-2xl font-bold">
                {formatCompactNumber(confirmedParticipants.length)}/{formatCompactNumber(tournament.max_players)}
                {participants.length > confirmedParticipants.length && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (+{formatCompactNumber(participants.length - confirmedParticipants.length)} standby)
                  </span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                Min. {formatCompactNumber(tournament.min_participants || 5)} required
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-transparent border border-purple-500/20 backdrop-blur-sm">
            <Calendar className="h-8 w-8 text-purple-400 mb-3" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Starts In</p>
              <CountdownTimer targetDate={startTime} status={tournament.status} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left Column - Tournament Info */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-950/30 via-violet-950/30 to-blue-950/30 border border-blue-500/20">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="bracket">Bracket</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Tournament Details */}
                <Card className="border border-blue-500/20 bg-gradient-to-br from-blue-950/20 via-background to-violet-950/20">
                  <CardHeader>
                    <CardTitle className="text-2xl">Tournament Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground uppercase tracking-wider">Format</p>
                        <p className="text-lg font-semibold capitalize">{tournament.format}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground uppercase tracking-wider">Bracket Type</p>
                        <p className="text-lg font-semibold capitalize">
                          {tournament.bracket_type.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground uppercase tracking-wider">Start Time</p>
                        <p className="text-lg font-semibold">
                          {startTime.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground uppercase tracking-wider">Check-in Window</p>
                        <p className="text-lg font-semibold">{tournament.check_in_window} minutes</p>
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground uppercase tracking-wider">Prize Distribution</p>
                      <div className="space-y-3">
                        {Object.entries(tournament.prize_distribution).map(([place, percentage]) => {
                          const grossAmount = tournament.prize_pool * (percentage as number);
                          const platformFee = grossAmount * 0.10;
                          const netAmount = grossAmount - platformFee;
                          
                          return (
                            <div key={place} className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                              <span className="font-semibold text-lg">{place} Place</span>
                              <div className="text-right">
                                <div className="text-gold font-mono font-bold text-lg">
                                  {formatArenaCurrency(netAmount)}
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({(percentage as number * 100)}%)
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground font-light">
                                  {formatArenaCurrency(grossAmount)} - {formatArenaCurrency(platformFee)} fee
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rules" className="mt-6">
                <Card className="border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-background to-blue-950/20">
                  <CardHeader>
                    <CardTitle className="text-2xl">Tournament Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {tournament.rules && (
                      <>
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Custom Rules</h4>
                          <div className="space-y-3">
                            {tournament.rules.split('\n').map((line, index) => {
                              const trimmedLine = line.trim();
                              if (!trimmedLine) return null;
                              
                              // Check if line is a title (ends with : or is short and uppercase-heavy)
                              const isTitle = trimmedLine.endsWith(':') || 
                                            (trimmedLine.length < 50 && !trimmedLine.includes('.') && 
                                             trimmedLine === trimmedLine.toUpperCase());
                              
                              if (isTitle) {
                                return (
                                  <h5 key={index} className="font-bold text-base mt-4 first:mt-0">
                                    {trimmedLine}
                                  </h5>
                                );
                              }
                              
                              return (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' }} />
                                  <span className="text-base leading-relaxed">{trimmedLine}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <Separator className="bg-border/50" />
                      </>
                    )}

                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">General Rules</h4>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' }} />
                          <span className="text-base">Players must check in {formatCompactNumber(tournament.check_in_window)} minutes before start time</span>
                        </li>
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#8b5cf6', filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))' }} />
                          <span className="text-base">Ready check must be completed within 5 minutes of match start</span>
                        </li>
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                          <Play className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary animate-pulse" />
                          <span className="text-base font-medium">Compulsory Streaming: You MUST start your Twitch stream before pressing 'I\'m Ready'. Matches not streamed will be disqualified.</span>
                        </li>
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' }} />
                          <span className="text-base">Match results must be reported within {formatCompactNumber(tournament.match_time_limit)} minutes</span>
                        </li>
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10">
                          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                          <span className="text-base">Failure to ready up will result in automatic disqualification</span>
                        </li>
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10">
                          <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                          <span className="text-base">Cheating or unsportsmanlike conduct will result in immediate ban</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bracket" className="mt-6">
                {tournament.status === 'open' && new Date(tournament.start_time) > new Date() ? (
                  <Card className="border border-blue-500/20 bg-gradient-to-br from-blue-950/20 via-background to-violet-950/20">
                    <CardContent className="py-16">
                      <div className="text-center space-y-6">
                        <div className="flex justify-center">
                          <div className="relative">
                            <Trophy className="h-24 w-24 text-muted-foreground/30" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Clock className="h-12 w-12 text-primary animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-light">Bracket Not Available Yet</h3>
                          <p className="text-muted-foreground font-light max-w-md mx-auto">
                            The tournament bracket will be generated and displayed when the tournament goes live
                          </p>
                        </div>
                        <div className="pt-4">
                          <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-lg bg-primary/10 border border-primary/20">
                            <span className="text-sm text-muted-foreground font-light">Tournament starts in</span>
                            <CountdownTimer 
                              targetDate={new Date(tournament.start_time)} 
                              onComplete={handleCountdownComplete}
                              status={tournament.status}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-blue-500/20 bg-gradient-to-br from-blue-950/20 via-background to-violet-950/20">
                    <CardHeader>
                      <CardTitle className="text-2xl">Tournament Bracket</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TournamentBracket 
                        participants={participants}
                        maxPlayers={tournament.max_players}
                        tournamentId={tournament.id}
                        isAdmin={profile?.role === 'admin'}
                        winnerId={tournamentWinner?.user_id}
                        isPast={tournament.status === 'completed' || (new Date().getTime() - new Date(tournament.start_time).getTime() > 3 * 60 * 60 * 1000)}
                        tournamentStatus={tournament.status}
                        tournamentStartTime={tournament.start_time}
                        tournamentName={tournament.name}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Participants */}
          <div className="space-y-6">
            {/* Reminders Section */}
            {user && tournament.status !== 'completed' && (
              <Card className="border border-blue-500/20 bg-gradient-to-br from-blue-950/20 via-background to-violet-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-light">
                    <Bell className="h-5 w-5" />
                    <span>Reminders</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground font-light">
                    Get notified before the tournament starts
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-light">24 hours before</span>
                      </div>
                      <Switch
                        checked={reminders.reminder_24h}
                        onCheckedChange={() => handleToggleReminder('reminder_24h')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-light">1 hour before</span>
                      </div>
                      <Switch
                        checked={reminders.reminder_1h}
                        onCheckedChange={() => handleToggleReminder('reminder_1h')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-light">15 minutes before</span>
                      </div>
                      <Switch
                        checked={reminders.reminder_15m}
                        onCheckedChange={() => handleToggleReminder('reminder_15m')}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-background to-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl">
                  <span>Participants</span>
                  <Badge variant="secondary" className="text-sm">
                    {confirmedParticipants.length}/{tournament.max_players}
                    {participants.length > confirmedParticipants.length && ` (+${participants.length - confirmedParticipants.length})`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12 text-base">
                      No participants yet. Be the first to join!
                    </p>
                  ) : (
                    <>
                      {/* Tournament Winner - Show First */}
                      {tournamentWinner && (
                        <div className="mb-6 p-6 border-2 border-border rounded">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 border border-border rounded-full">
                              <Trophy className="h-5 w-5 text-foreground" />
                            </div>
                            <Avatar className="h-14 w-14 ring-1 ring-border">
                              <AvatarImage src={tournamentWinner.profiles.avatar_url || ''} />
                              <AvatarFallback className="bg-muted text-foreground font-light">
                                {tournamentWinner.profiles.gamertag?.[0]?.toUpperCase() || 'W'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <p className="font-light text-xl text-foreground">
                                  {tournamentWinner.profiles.gamertag || 'Champion'}
                                </p>
                                <Badge variant="outline" className="font-light text-xs">Winner</Badge>
                              </div>
                              <p className="text-sm font-light text-muted-foreground">
                                Prize: A${(tournament.prize_pool * ((tournament.prize_distribution as any)['1st'] || 0.5)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Other Participants */}
                      {(() => {
                        const others = participants.filter(p => !tournamentWinner || p.user_id !== tournamentWinner.user_id);
                        
                        const renderParticipantRow = (participant: TournamentParticipant, index: number) => (
                          <div 
                            key={participant.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all duration-200"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-600/20 to-violet-600/20 font-bold text-sm shadow-lg shadow-blue-500/30">
                              <span className="gradient-primary-text">{tournamentWinner ? index + 2 : index + 1}</span>
                            </div>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={participant.profiles.avatar_url || ''} />
                              <AvatarFallback>
                                {participant.profiles.gamertag?.[0]?.toUpperCase() || 'P'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold truncate">
                                  {participant.profiles.gamertag || 'Anonymous'}
                                </p>
                                {participant.is_standby && (
                                  <Badge variant="outline" className="h-4 text-[10px] px-1 font-light border-blue-500/30 text-blue-400">
                                    Standby
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(participant.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );

                        if (tournament.team_size > 1) {
                          // Group by team
                          const teamGroups: Record<string, { name: string; members: TournamentParticipant[] }> = {};
                          const individuals: TournamentParticipant[] = [];
                          
                          others.forEach(p => {
                            if (p.team_id && teams[p.team_id]) {
                              if (!teamGroups[p.team_id]) {
                                teamGroups[p.team_id] = { name: teams[p.team_id].team_name, members: [] };
                              }
                              teamGroups[p.team_id].members.push(p);
                            } else {
                              individuals.push(p);
                            }
                          });
                          
                          return (
                            <div className="space-y-4">
                              {Object.entries(teamGroups).map(([teamId, group]) => (
                                <div key={teamId} className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/20 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-blue-400 flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      {group.name}
                                    </h4>
                                    <Badge variant="outline" className="text-[10px] h-5">{group.members.length} / {tournament.team_size}</Badge>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {group.members.map(m => (
                                      <div key={m.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-white/5 transition-colors">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={m.profiles.avatar_url || ''} />
                                          <AvatarFallback className="text-[10px]">{m.profiles.gamertag?.[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="truncate flex-1 font-light">{m.profiles.gamertag}</span>
                                        {m.user_id === teams[teamId].captain_id && <Badge variant="secondary" className="text-[8px] h-4 px-1">Captain</Badge>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {individuals.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-light text-muted-foreground uppercase tracking-widest px-1">Individuals</h4>
                                  {individuals.map((participant, index) => renderParticipantRow(participant, index))}
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        return others.map((participant, index) => renderParticipantRow(participant, index));
                      })()}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {isFull && tournament.status === 'open' && (
              <Card className="netflix-card border-0 border-primary/50">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <Users className="h-16 w-16 mx-auto" style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.6))' }} />
                    <h4 className="font-semibold text-lg">Tournament Full!</h4>
                    <p className="text-sm text-muted-foreground">
                      Main spots are filled, but you can still join as a **Standby Player**. 
                      If someone doesn't check in, you'll be automatically assigned to their match!
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Dialog open={refereeChatOpen} onOpenChange={setRefereeChatOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent">
          {refereeApplicationId && user && (
            <RefereeApplicationChat 
              applicationId={refereeApplicationId} 
              userId={user.id} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
