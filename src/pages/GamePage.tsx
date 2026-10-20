import { ArrowLeft, CalendarClock, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, SectionHeader } from '@/components/arena/Rail';
import { TournamentCard, TournamentCardSkeleton } from '@/components/arena/TournamentCard';
import { ConsentModal } from '@/components/ConsentModal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LiveBadge } from '@/components/ui/live-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useJoinTournament } from '@/hooks/use-join-tournament';
import { formatArenaCurrency } from '@/lib/arena-currency';
import type { GameMode, GameType, Tournament } from '@/types/database';
import { GAME_INFO, GAME_MODES, MODE_TEAM_SIZES } from '@/types/database';

// Game-specific backgrounds
const GAME_BACKGROUNDS: Record<GameType, string> = {
  codm: '/images/games/codm-bg.webp',
  fortnite: '/images/games/fortnite-bg.webp',
  fifa: '/images/games/fifa-bg.webp',
  warzone: '/images/games/warzone-bg.webp',
  apex: '/images/games/apex-bg.webp',
  valorant: '/images/games/valorant-bg.webp',
  injustice: '/images/games/injustice-bg.webp',
  mortal_kombat: '/images/games/mortal_kombat-bg.webp',
  efootball: '/images/games/fifa-bg.webp',
  pubg_mobile: '/images/games/pubg_mobile-bg.webp'
};

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const { startJoin, joiningId, consent, setConsent } = useJoinTournament();
  const [open, setOpen] = useState<Tournament[]>([]);
  const [live, setLive] = useState<Tournament[]>([]);
  const [past, setPast] = useState<Tournament[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const game = gameId as GameType;
  const gameInfo = GAME_INFO[game];
  const backgroundImage = GAME_BACKGROUNDS[game];
  const gameModes = GAME_MODES[game];

  const fetchTournaments = useCallback(async () => {
    if (!GAME_INFO[game]) return;
    try {
      // Update statuses first; ignore failures so the page still loads
      await supabase.rpc('check_and_update_tournament_status').then(() => undefined, () => undefined);
      const nowIso = new Date().toISOString();
      const [openRes, liveRes, pastRes, mine] = await Promise.all([
        supabase.from('tournaments').select('*').eq('game', game).eq('status', 'open').gt('start_time', nowIso).order('start_time', { ascending: true }),
        supabase.from('tournaments').select('*').eq('game', game).in('status', ['active', 'open']).lte('start_time', nowIso).order('start_time', { ascending: false }),
        supabase.from('tournaments').select('*').eq('game', game).in('status', ['completed', 'cancelled']).order('start_time', { ascending: false }).limit(12),
        user ? supabase.from('tournament_participants').select('tournament_id').eq('user_id', user.id) : Promise.resolve({ data: [] as { tournament_id: string }[] }),
      ]);
      setOpen((openRes.data || []) as Tournament[]);
      setLive(((liveRes.data || []) as Tournament[]).filter((t) => t.status === 'active' || Date.now() - new Date(t.start_time).getTime() < 3 * 3_600_000));
      setPast((pastRes.data || []) as Tournament[]);
      setJoinedIds(new Set((mine.data || []).map((p) => p.tournament_id)));
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  }, [game, user?.id]);

  useEffect(() => {
    setLoading(true);
    fetchTournaments();
  }, [fetchTournaments]);

  // Refresh after a join attempt completes
  const prevJoining = React.useRef<string | null>(null);
  useEffect(() => {
    if (prevJoining.current && !joiningId) fetchTournaments();
    prevJoining.current = joiningId;
  }, [joiningId, fetchTournaments]);

  if (!gameInfo) {
    return (
      <EmptyState
        className="mx-auto max-w-lg"
        title="We don't host that game yet"
        description="Pick one of the supported games to see its tournaments."
        action={
          <Button asChild>
            <Link to="/tournaments">Browse all tournaments</Link>
          </Button>
        }
      />
    );
  }

  const activeCount = open.length + live.length;

  const card = (t: Tournament) => (
    <TournamentCard key={t.id} tournament={t} joined={joinedIds.has(t.id)} joining={joiningId === t.id} onJoin={startJoin} />
  );

  return (
    <div className="space-y-10">
      <section className="relative -mx-4 -mt-5 overflow-hidden md:-mx-6 md:-mt-6 md:rounded-b-3xl xl:-mx-8">
        <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
        <div className="relative space-y-6 px-4 pb-8 pt-6 md:px-6 xl:px-8">
          <Link to="/tournaments" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All tournaments
          </Link>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <img src={gameInfo.logo} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/15 md:h-20 md:w-20" />
              <div>
                <h1 className="text-5xl leading-none md:text-6xl">{gameInfo.name}</h1>
                <p className="mt-1 text-muted-foreground">
                  {loading ? 'Loading tournaments…' : activeCount > 0 ? `${activeCount} active tournament${activeCount === 1 ? '' : 's'}` : 'No active tournaments yet'}
                </p>
              </div>
            </div>
            <CreateTournamentDialog game={game} gameModes={gameModes} open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={fetchTournaments} />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <TournamentCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <section className="space-y-4">
              <SectionHeader title="Live now" icon={<LiveBadge size="sm" className="ml-1" />} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{live.map(card)}</div>
            </section>
          )}

          <section className="space-y-4">
            <SectionHeader title="Open for registration" />
            {open.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{open.map(card)}</div>
            ) : (
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                title={`No open ${gameInfo.shortName} tournaments`}
                description="Host one and share the link with your squad."
                action={
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus /> Create tournament
                  </Button>
                }
              />
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-4">
              <SectionHeader title="Recently finished" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{past.map(card)}</div>
            </section>
          )}
        </>
      )}

      {consent && (
        <ConsentModal
          open={!!consent}
          onOpenChange={(o) => !o && setConsent(null)}
          title={consent.title}
          description={consent.description}
          amount={consent.amount}
          onConfirm={consent.onConfirm}
          loading={!!joiningId}
        />
      )}
    </div>
  );
}

function CreateTournamentDialog({ 
  game, 
  gameModes,
  open,
  onOpenChange,
  onSuccess,
  isMobile = false
}: { 
  game: GameType;
  gameModes: Array<{ value: GameMode; label: string; icon: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isMobile?: boolean;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [numWinners, setNumWinners] = useState<'1' | '2' | '3'>('3');
  const [consentOpen, setConsentOpen] = useState(false);
  const [arenaDeduction, setArenaDeduction] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    gameMode: '',
    description: '',
    entryFee: '',
    prizePool: '',
    maxPlayers: '',
    minParticipants: '2',
    startTime: '',
    prize1st: '50',
    prize2nd: '30',
    prize3rd: '20'
  });
  
  // Calculate team size based on selected mode
  const teamSize = formData.gameMode ? MODE_TEAM_SIZES[formData.gameMode as GameMode] : 1;
  const isTeamBased = teamSize > 1;
  const arenaCurrency = profile?.arena_currency || 0;

  const executeCreateTournament = async (deduction: number) => {
    setLoading(true);
    try {
      // Fetch latest balance to be sure
      const { data: latestProfile } = await supabase
        .from('profiles')
        .select('arena_currency, available_balance')
        .eq('id', user!.id)
        .single();
      
      const currentBalance = latestProfile?.arena_currency || 0;

      // Build prize distribution based on number of winners
      const prizeDistribution: Record<string, number> = {};
      
      prizeDistribution['1st'] = parseFloat(formData.prize1st) / 100;
      if (numWinners >= '2') {
        prizeDistribution['2nd'] = parseFloat(formData.prize2nd) / 100;
      }
      if (numWinners === '3') {
        prizeDistribution['3rd'] = parseFloat(formData.prize3rd) / 100;
      }

      // Determine format based on team size
      let format: 'solo' | 'duo' | 'squad' = 'solo';
      if (teamSize === 2) {
        format = 'duo';
      } else if (teamSize > 2) {
        format = 'squad';
      }
      
      const entryFee = parseFloat(formData.entryFee) || 0;
      const prizePool = parseFloat(formData.prizePool);
      const maxPlayersCount = parseInt(formData.maxPlayers);
      let minParticipantsCount = parseInt(formData.minParticipants) || 2;
      
      // If team-based, the input is number of teams, so multiply by team size
      if (isTeamBased) {
        minParticipantsCount = minParticipantsCount * teamSize;
      }

      const tournamentData = {
        name: formData.name,
        game: game,
        mode: formData.gameMode,
        team_size: teamSize,
        description: formData.description,
        format: format,
        bracket_type: 'single_elimination',
        max_players: maxPlayersCount,
        min_participants: minParticipantsCount,
        current_players: 0,
        entry_fee: entryFee,
        prize_pool: prizePool,
        prize_distribution: prizeDistribution,
        platform_fee_percentage: 10,
        status: 'open',
        start_time: new Date(formData.startTime).toISOString(),
        check_in_window: 30,
        match_time_limit: 60,
        score_reporting_type: 'screenshot',
        rounds_to_win: 1,
        created_by: user!.id,
        featured: false
      };

      // Re-verify balance locally for UX, but actual deduction is handled by database trigger
      if (deduction > 0 && currentBalance < deduction) {
        throw new Error(`You need ${formatArenaCurrency(deduction)} to fund this prize pool.`);
      }

      const { error } = await supabase
        .from('tournaments')
        .insert(tournamentData);

      if (error) throw error;

      await refreshProfile();
      toast.success('Tournament created successfully!');
      onOpenChange(false);
      onSuccess();
      setConsentOpen(false);
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      toast.error(error.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast.error('Sign in to create a tournament');
      return;
    }

    // Validate everything the form can't enforce on its own
    const name = formData.name.trim();
    const prizePoolValue = parseFloat(formData.prizePool);
    const entryFeeValue = parseFloat(formData.entryFee || '0');
    const maxPlayersValue = parseInt(formData.maxPlayers, 10);
    const minParticipantsValue = parseInt(formData.minParticipants, 10) || 2;
    const start = new Date(formData.startTime);
    const split =
      (parseFloat(formData.prize1st) || 0) +
      (numWinners >= '2' ? parseFloat(formData.prize2nd) || 0 : 0) +
      (numWinners === '3' ? parseFloat(formData.prize3rd) || 0 : 0);

    if (name.length < 3) return void toast.error('Give the tournament a name (at least 3 characters)');
    if (!formData.gameMode) return void toast.error('Choose a game mode');
    if (!Number.isFinite(prizePoolValue) || prizePoolValue < 0) return void toast.error('Enter a prize pool of 0 or more');
    if (!Number.isFinite(entryFeeValue) || entryFeeValue < 0) return void toast.error('Entry fee cannot be negative');
    if (!Number.isFinite(maxPlayersValue) || maxPlayersValue < teamSize * 2) return void toast.error(`Allow at least ${teamSize * 2} players`);
    if (maxPlayersValue % teamSize !== 0) return void toast.error(`Max players must be a multiple of the team size (${teamSize})`);
    const minPlayersTotal = isTeamBased ? minParticipantsValue * teamSize : minParticipantsValue;
    if (minPlayersTotal > maxPlayersValue) return void toast.error('Minimum participants cannot exceed max players');
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 5 * 60_000) return void toast.error('Pick a start time at least 5 minutes from now');
    if (Math.abs(split - 100) > 0.01) return void toast.error(`Prize split must add up to 100% (it's ${split}%)`);

    // Creator always pays the whole prize pool upfront.
    const deduction = prizePoolValue;
    if (arenaCurrency < deduction) {
      toast.error(`You need ${formatArenaCurrency(deduction)} to fund this prize pool`);
      return;
    }

    setArenaDeduction(deduction);
    setConsentOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size={isMobile ? 'default' : 'lg'} className="gap-2">
          <Plus className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
          Create Tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
          <DialogDescription>
            Set up a new {GAME_INFO[game].name} tournament
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tournament Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              placeholder="e.g., Summer Championship 2024"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Game Mode */}
          <div className="space-y-2">
            <Label htmlFor="gameMode">Game Mode</Label>
            <Select
              value={formData.gameMode}
              onValueChange={(value) => setFormData({ ...formData, gameMode: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select game mode" />
              </SelectTrigger>
              <SelectContent>
                {gameModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.icon} {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Team Size Info */}
            {formData.gameMode && (
              <div className="mt-3 p-3 border border-border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-muted-foreground">Tournament Type</p>
                    <p className="text-base font-normal">
                      {isTeamBased ? `Team-based (${teamSize}v${teamSize})` : 'Solo'}
                    </p>
                  </div>
                  {isTeamBased && (
                    <div className="text-right">
                      <p className="text-sm font-light text-muted-foreground">Team Size</p>
                      <p className="text-base font-normal">{teamSize} players per team</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your tournament rules and format..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Entry Fee and Prize Pool */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee ($)</Label>
              <Input
                id="entryFee"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00 for free tournament"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground font-light">
                Set to 0 for free tournaments
              </p>
            </div>
            
            {/* Always show prize pool input */}
            <div className="space-y-2">
              <Label htmlFor="prizePool">Prize Pool ($)</Label>
              <Input
                id="prizePool"
                type="number"
                step="0.01"
                min="0"
                placeholder="100.00"
                value={formData.prizePool}
                onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground font-light">
                Total prize pool you are providing. 10% platform fee will be deducted when distributing prizes to winner(s).
              </p>
            </div>
          </div>

          {/* Prize Distribution */}
          <div className="space-y-4">
            <Label>Prize Distribution</Label>
            
            {/* Number of Winners */}
            <div className="space-y-2">
              <Label htmlFor="numWinners" className="text-sm">Number of Winners</Label>
              <Select
                value={numWinners}
                onValueChange={(value) => {
                  setNumWinners(value as '1' | '2' | '3');
                  // Adjust default percentages
                  if (value === '1') {
                    setFormData({ ...formData, prize1st: '100', prize2nd: '0', prize3rd: '0' });
                  } else if (value === '2') {
                    setFormData({ ...formData, prize1st: '60', prize2nd: '40', prize3rd: '0' });
                  } else {
                    setFormData({ ...formData, prize1st: '50', prize2nd: '30', prize3rd: '20' });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Place Only</SelectItem>
                  <SelectItem value="2">Top 2 Places</SelectItem>
                  <SelectItem value="3">Top 3 Places</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prize Percentages */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prize1st" className="text-sm">1st Place (%)</Label>
                <Input
                  id="prize1st"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.prize1st}
                  onChange={(e) => setFormData({ ...formData, prize1st: e.target.value })}
                  required
                />
              </div>
              {numWinners >= '2' && (
                <div className="space-y-2">
                  <Label htmlFor="prize2nd" className="text-sm">2nd Place (%)</Label>
                  <Input
                    id="prize2nd"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.prize2nd}
                    onChange={(e) => setFormData({ ...formData, prize2nd: e.target.value })}
                    required
                  />
                </div>
              )}
              {numWinners === '3' && (
                <div className="space-y-2">
                  <Label htmlFor="prize3rd" className="text-sm">3rd Place (%)</Label>
                  <Input
                    id="prize3rd"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.prize3rd}
                    onChange={(e) => setFormData({ ...formData, prize3rd: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {parseFloat(formData.prize1st || '0') + 
                      (numWinners >= '2' ? parseFloat(formData.prize2nd || '0') : 0) + 
                      (numWinners === '3' ? parseFloat(formData.prize3rd || '0') : 0)}% (must equal 100%)
            </p>
          </div>

          {/* Min/Max Participants and Start Time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minParticipants">
                Min {isTeamBased ? 'Teams' : 'Players'}
              </Label>
              <Input
                id="minParticipants"
                type="number"
                min="2"
                max={formData.maxPlayers ? (isTeamBased ? parseInt(formData.maxPlayers)/teamSize : formData.maxPlayers) : "100"}
                value={formData.minParticipants}
                onChange={(e) => setFormData({ ...formData, minParticipants: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground font-light">
                Required to start
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">
                Max Players {isTeamBased && `(div. by ${teamSize})`}
              </Label>
              <Input
                id="maxPlayers"
                type="number"
                min={teamSize * 2}
                step={teamSize}
                placeholder={isTeamBased ? `${teamSize * 4}` : '16'}
                value={formData.maxPlayers}
                onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
                required
              />
              {isTeamBased && formData.maxPlayers && parseInt(formData.maxPlayers) % teamSize !== 0 && (
                <p className="text-xs text-destructive font-light">
                  Must be divisible by {teamSize}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Tournament'}
            </Button>
          </div>
        </form>
        {consentOpen && (
          <ConsentModal
            open={consentOpen}
            onOpenChange={setConsentOpen}
            title={`Create Tournament: ${formData.name}`}
            description={`You are about to create a tournament. The amount of ${formatArenaCurrency(arenaDeduction)} will be deducted from your balance.`}
            amount={arenaDeduction}
            onConfirm={() => executeCreateTournament(arenaDeduction)}
            loading={loading}
          />
        )}

      </DialogContent>
    </Dialog>
  );
}
