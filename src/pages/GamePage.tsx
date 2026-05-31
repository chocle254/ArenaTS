import { motion } from 'framer-motion';
import { ArrowLeft, Play, Plus, Users } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConsentModal } from '@/components/ConsentModal';
import { Badge } from '@/components/ui/badge';
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
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import { formatCurrency } from '@/lib/format-number';
import { formatTimeUntil } from '@/lib/utils';
import type { GameMode, GameType, Tournament } from '@/types/database';
import { GAME_INFO, GAME_MODES, MODE_TEAM_SIZES } from '@/types/database';

// Game-specific backgrounds
const GAME_BACKGROUNDS: Record<GameType, string> = {
  codm: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_42cf2029-e1d2-4b37-b250-15c152c2bdfc.jpg',
  fortnite: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_af5260f1-9906-4f99-a72d-bf3b4e1908c0.jpg',
  fifa: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_7f73e1f8-3414-497a-9f66-479cd54c8a9e.jpg',
  warzone: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c83dbe31-afc4-4f91-b53b-826cac8d9d3b.jpg',
  apex: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_aced58db-30f2-485e-a99b-5e3652c9db6c.jpg',
  valorant: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d635fa9b-5466-43ca-b134-5cb4b8f77d12.jpg',
  injustice: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4da429fb-85b8-4558-8f59-e45c6695ecad.jpg',
  mortal_kombat: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a3b7774a-1c77-4958-ac02-212fe022519b.jpg',
  efootball: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_7f73e1f8-3414-497a-9f66-479cd54c8a9e.jpg',
  pubg_mobile: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8982654b-2303-4200-b240-4e91852a6a2c.jpg'
};

// Mode-specific images for tournament cards
const MODE_IMAGES: Record<string, string> = {
  'search': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6f8f9a60-61c8-432d-a961-11ecfd5abdb2.jpg',
  'destroy': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6f8f9a60-61c8-432d-a961-11ecfd5abdb2.jpg',
  's&d': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6f8f9a60-61c8-432d-a961-11ecfd5abdb2.jpg',
  'snd': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6f8f9a60-61c8-432d-a961-11ecfd5abdb2.jpg',
  'team': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d6a67b24-d1f7-4d0b-a3a0-a6052960af1d.jpg',
  'deathmatch': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d6a67b24-d1f7-4d0b-a3a0-a6052960af1d.jpg',
  'tdm': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d6a67b24-d1f7-4d0b-a3a0-a6052960af1d.jpg',
  'battle': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_19f4fb87-72b7-4ba6-a49a-b8f9cfbde158.jpg',
  'royale': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_19f4fb87-72b7-4ba6-a49a-b8f9cfbde158.jpg',
  'br': 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_19f4fb87-72b7-4ba6-a49a-b8f9cfbde158.jpg'
};

function getModeImage(tournamentName: string, gameType: GameType): string {
  const nameLower = tournamentName.toLowerCase();
  
  // Check for mode keywords in tournament name
  for (const [keyword, image] of Object.entries(MODE_IMAGES)) {
    if (nameLower.includes(keyword)) {
      return image;
    }
  }
  
  // Fallback to game banner
  return GAME_INFO[gameType].banner;
}

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Refs for horizontal scroll containers
  const openScrollRef = useRef<HTMLDivElement>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);
  const upcomingScrollRef = useRef<HTMLDivElement>(null);
  const pastScrollRef = useRef<HTMLDivElement>(null);

  const game = gameId as GameType;
  const gameInfo = GAME_INFO[game];
  const backgroundImage = GAME_BACKGROUNDS[game];
  const gameModes = GAME_MODES[game];

  // Setup wheel scroll for horizontal scrolling
  useEffect(() => {
    const refs = [openScrollRef, liveScrollRef, upcomingScrollRef, pastScrollRef];
    const handlers: Array<(e: WheelEvent) => void> = [];

    refs.forEach((ref) => {
      if (!ref.current) return;

      const container = ref.current;
      const handleWheel = (e: WheelEvent) => {
        // Always hijack vertical scroll and convert to horizontal
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      };

      container.addEventListener('wheel', handleWheel, { passive: false });
      handlers.push(handleWheel);
    });

    return () => {
      refs.forEach((ref, index) => {
        if (ref.current && handlers[index]) {
          ref.current.removeEventListener('wheel', handlers[index]);
        }
      });
    };
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [gameId]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      // First, update tournament statuses
      await supabase.rpc('check_and_update_tournament_status');

      const now = new Date().toISOString();

      // Fetch open tournaments (accepting registrations and not started yet)
      const { data: open } = await supabase
        .from('tournaments')
        .select('*')
        .eq('game', gameId)
        .eq('status', 'open')
        .gt('start_time', now)
        .order('start_time', { ascending: true });

      setOpenTournaments(open || []);

      // Fetch live tournaments (currently active OR open but reached start time)
      const { data: activeLive } = await supabase
        .from('tournaments')
        .select('*')
        .eq('game', gameId)
        .eq('status', 'active')
        .order('start_time', { ascending: false });
      
      const { data: openStartedLive } = await supabase
        .from('tournaments')
        .select('*')
        .eq('game', gameId)
        .eq('status', 'open')
        .lte('start_time', now)
        .order('start_time', { ascending: false });

      setLiveTournaments([...(activeLive || []), ...(openStartedLive || [])]);

      // Fetch upcoming tournaments (same as open for registration but maybe used elsewhere)
      setUpcomingTournaments(open || []);

      // Fetch past tournaments (completed or cancelled)
      const { data: past } = await supabase
        .from('tournaments')
        .select('*')
        .eq('game', gameId)
        .in('status', ['completed', 'cancelled'])
        .order('start_time', { ascending: false })
        .limit(20);

      setPastTournaments(past || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ 
        background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="container mx-auto px-4 py-8">
          <div className="h-64 bg-muted/20 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  const hasAnyTournaments = openTournaments.length > 0 || liveTournaments.length > 0 || upcomingTournaments.length > 0 || pastTournaments.length > 0;

  return (
    <div 
      className="min-h-screen overflow-x-hidden"
      style={{ 
        background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="container mx-auto px-4 md:px-12 py-8 space-y-12 max-w-full">
        {/* Header */}
        <div className="space-y-6">
          <Link to="/dashboard">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-6">
              <img
                src={gameInfo.logo}
                alt={gameInfo.name}
                className="h-16 md:h-24 w-auto object-contain"
              />
              <div className="flex-1">
                <h1 className="text-4xl md:text-6xl font-bold">{gameInfo.name}</h1>
                <p className="text-muted-foreground mt-2">
                  {hasAnyTournaments 
                    ? `${openTournaments.length + liveTournaments.length + upcomingTournaments.length} active tournaments`
                    : 'No tournaments available'}
                </p>
                
                {/* Create Tournament Button - Mobile: Below game name */}
                <div className="md:hidden mt-4">
                  <CreateTournamentDialog 
                    game={game} 
                    gameModes={gameModes}
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                    onSuccess={fetchTournaments}
                    isMobile
                  />
                </div>
              </div>
            </div>

            {/* Create Tournament Button - Desktop: Right side */}
            <div className="hidden md:block">
              <CreateTournamentDialog 
                game={game} 
                gameModes={gameModes}
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={fetchTournaments}
              />
            </div>
          </div>
        </div>

        {/* Open for Registration Tournaments */}
        {openTournaments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Open for Registration</h2>
            <div className="flex md:grid overflow-x-auto md:overflow-x-visible gap-6 md:grid-cols-3 pb-4 md:pb-0 scrollbar-hide">
              {openTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          </div>
        )}

        {/* Live Tournaments */}
        {liveTournaments.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="live-indicator" />
              <h2 className="text-2xl md:text-3xl font-bold">LIVE NOW</h2>
            </div>
            <div className="flex md:grid overflow-x-auto md:overflow-x-visible gap-6 md:grid-cols-3 pb-4 md:pb-0 scrollbar-hide">
              {liveTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Tournaments */}
        {upcomingTournaments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Upcoming Tournaments</h2>
            <div className="flex md:grid overflow-x-auto md:overflow-x-visible gap-6 md:grid-cols-3 pb-4 md:pb-0 scrollbar-hide">
              {upcomingTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          </div>
        )}

        {/* Past Tournaments */}
        {pastTournaments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Past Tournaments</h2>
            <div className="flex md:grid overflow-x-auto md:overflow-x-visible gap-6 md:grid-cols-3 pb-4 md:pb-0 scrollbar-hide">
              {pastTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          </div>
        )}

        {/* No tournaments message */}
        {!hasAnyTournaments && (
          <div className="text-center py-16">
            <h3 className="text-2xl font-bold mb-2">No tournaments found</h3>
            <p className="text-muted-foreground">
              Check back soon for new {gameInfo.name} tournaments
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentConfig, setConsentConfig] = useState<{
    title: string;
    description: string;
    amount: number;
    onConfirm: () => void;
  } | null>(null);

  const isLive = tournament.status === 'active';
  const isOpen = tournament.status === 'open';
  const cardImage = getModeImage(tournament.name, tournament.game as GameType);
  const gameInfo = GAME_INFO[tournament.game as GameType];

  useEffect(() => {
    checkIfJoined();
  }, [user, tournament.id]);

  const checkIfJoined = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('user_id', user.id)
      .single();
    
    setIsJoined(!!data);
  };

  const executeJoin = async (entryFee: number) => {
    setIsJoining(true);
    try {
      if (entryFee > 0) {
        // Fetch latest balance
        const { data: latestProfile } = await supabase
          .from('profiles')
          .select('arena_currency, available_balance')
          .eq('id', user!.id)
          .single();
        
        const currentBalance = latestProfile?.arena_currency || 0;
        const currentAvailable = latestProfile?.available_balance || 0;

        if (currentBalance < entryFee) {
          throw new Error(`Insufficient Arena Currency. You need ${formatArenaCurrency(entryFee)} to join.`);
        }

        // Deduct entry fee
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ 
            arena_currency: currentBalance - entryFee,
            available_balance: currentAvailable - entryFee
          })
          .eq('id', user!.id);

        if (balanceError) throw balanceError;

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: user!.id,
          type: 'tournament_fee',
          amount: -entryFee,
          description: `Entry fee for tournament: ${tournament.name}`,
          status: 'completed',
          tournament_id: tournament.id
        });

        await refreshProfile();
      }

      // Get gamertag from profile or generate default
      const gamertag = profile?.gamertag || user!.email?.split('@')[0] || `Player${Math.floor(Math.random() * 10000)}`;

      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          user_id: user!.id,
          gamertag: gamertag,
          checked_in: false,
          is_standby: tournament.current_players >= tournament.max_players,
          amount_paid: entryFee
        });

      if (error) throw error;

      await supabase
        .from('tournaments')
        .update({ current_players: tournament.current_players + 1 })
        .eq('id', tournament.id);

      setIsJoined(true);
      setConsentOpen(false);
      toast.success('Successfully joined tournament!');
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      toast.error(error.message || 'Failed to join tournament');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || isJoined || isJoining) return;

    // If it's a team tournament, we should redirect to details page for the team register dialog
    if (tournament.team_size > 1) {
      navigate(`/tournaments/${tournament.id}`);
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
        onConfirm: () => executeJoin(entryFee)
      });
      setConsentOpen(true);
    } else {
      executeJoin(0);
    }
  };

  return (
    <Link to={`/tournaments/${tournament.id}`} className="flex-shrink-0 w-56 md:w-auto">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="relative overflow-hidden rounded-lg border-2 border-violet-500/50 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300"
          style={{ height: '450px' }}
        >
          {/* Top Half - Game Image with Gradient Overlay */}
          <div className="relative h-1/2 overflow-hidden group">
            <img
              src={cardImage}
              alt={tournament.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Gradient Overlay */}
            <div 
              className="absolute inset-0" 
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, #050810 100%)'
              }}
            />
            
            {/* Floating Elements on Image */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
              {/* Game Name Tag */}
              <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 text-sm font-medium">
                {gameInfo.name}
              </Badge>
              
              {/* LIVE Badge */}
              {isLive && (
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full pulse-dot" />
                  <span className="text-white text-sm font-semibold">LIVE</span>
                </div>
              )}
              
              {/* Open Badge */}
              {isOpen && !isLive && (
                <Badge className="bg-green-500/90 text-white border-0 text-sm">
                  Open
                </Badge>
              )}
            </div>

            {/* Tournament Name at Bottom of Image */}
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-orbitron font-bold text-white text-lg leading-tight line-clamp-2">
                {tournament.name}
              </h3>
            </div>
          </div>

          {/* Bottom Half - Glass Panel */}
          <div 
            className="h-1/2 p-5 flex flex-col justify-between"
            style={{ backgroundColor: 'rgba(124, 58, 237, 0.12)' }}
          >
            {/* Prize Pool and Entry Fee */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
                <p className="font-mono font-bold text-3xl" style={{ color: '#FFD700' }}>
                  {formatArenaCurrency(tournament.prize_pool)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Entry Fee</p>
                <p className="font-mono font-semibold text-xl text-violet-400">
                  {formatArenaCurrency(tournament.entry_fee)}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mb-4" />

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Players</p>
                <p className="text-base font-semibold text-white">
                  {formatCompactNumber(tournament.current_players)}/{formatCompactNumber(tournament.max_players)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Starts In</p>
                <p className="text-base font-semibold text-white">
                  {formatTimeUntil(tournament.start_time)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mode</p>
                <p className="text-base font-semibold text-white truncate">
                  {tournament.format}
                </p>
              </div>
            </div>

            {/* JOIN Button */}
            {isOpen && !isJoined && user && (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="sheen-effect w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)'
                }}
              >
                {isJoining ? 'JOINING...' : 'JOIN TOURNAMENT'}
              </button>
            )}
            
            {isJoined && (
              <div className="w-full py-3 rounded-lg bg-primary/20 text-primary text-center font-semibold">
                JOINED
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {consentConfig && (
        <ConsentModal
          open={consentOpen}
          onOpenChange={setConsentOpen}
          title={consentConfig.title}
          description={consentConfig.description}
          amount={consentConfig.amount}
          onConfirm={consentConfig.onConfirm}
        />
      )}
    </Link>
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
      const currentAvailable = latestProfile?.available_balance || 0;

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
        throw new Error(`Insufficient Arena Currency. You need ${deduction} to create this tournament.`);
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
      toast.error('You must be logged in to create a tournament');
      return;
    }

    // Set deduction and show modal
    const prizePoolValue = parseFloat(formData.prizePool) || 0;
    
    // Creator always pays the whole prize pool upfront.
    const deduction = prizePoolValue;
    
    // Check Arena Currency balance
    if (arenaCurrency < deduction) {
      toast.error(`Insufficient Arena Currency. You need ${deduction} to create this tournament.`);
      return;
    }
    
    setArenaDeduction(deduction);
    setConsentOpen(true);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button 
          size={isMobile ? "default" : "lg"} 
          className="gap-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 border-0"
        >
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
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 border-0 disabled:opacity-50">
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
