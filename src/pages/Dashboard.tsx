import { motion } from 'framer-motion';
import { Coins, Play, Users } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConsentModal } from '@/components/ConsentModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiveBadge } from '@/components/ui/live-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import { cn, formatTimeUntil } from '@/lib/utils';
import type { GameType, Tournament } from '@/types/database';
import { GAME_INFO } from '@/types/database';


export default function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const tournamentScrollRef = useRef<HTMLDivElement>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTournaments();
  }, [user]);

  // Setup wheel scroll for tournament sections
  useEffect(() => {
    const refs = [
      { ref: tournamentScrollRef, data: tournaments },
      { ref: liveScrollRef, data: liveTournaments }
    ];

    const handlers: Array<(e: WheelEvent) => void> = [];

    refs.forEach(({ ref, data }) => {
      const container = ref.current;
      if (!container || data.length === 0) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      };

      container.addEventListener('wheel', handleWheel, { passive: false });
      handlers.push(handleWheel);
    });

    return () => {
      refs.forEach(({ ref }, index) => {
        if (ref.current && handlers[index]) {
          ref.current.removeEventListener('wheel', handlers[index]);
        }
      });
    };
  }, [tournaments, liveTournaments]);

  const fetchTournaments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fire status update RPCs in the background — don't block data fetching
      supabase.rpc('check_and_update_tournament_status').then(() =>
        supabase.rpc('check_and_cancel_insufficient_tournaments')
      );

      const now = new Date().toISOString();

      // Run all queries in parallel
      const [
        { data: participantData },
        { data: upcomingData },
        { data: liveData },
      ] = await Promise.all([
        supabase.from('tournament_participants').select('tournament_id').eq('user_id', user.id),
        supabase.from('tournaments').select('*').eq('status', 'open').gt('start_time', now).order('start_time', { ascending: true }).limit(20),
        // Single query: both active + open-but-started
        supabase.from('tournaments').select('*').in('status', ['active', 'open']).lte('start_time', now).order('start_time', { ascending: true }).limit(10),
      ]);

      const joinedTournamentIds = participantData?.map(p => p.tournament_id) || [];

      if (upcomingData) {
        // Sort: joined tournaments first, then others
        const sorted = upcomingData.sort((a, b) => {
          const aJoined = joinedTournamentIds.includes(a.id);
          const bJoined = joinedTournamentIds.includes(b.id);
          if (aJoined && !bJoined) return -1;
          if (!aJoined && bJoined) return 1;
          return 0;
        });
        setTournaments(sorted.slice(0, 10));
      }

      setLiveTournaments(liveData || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-full overflow-x-hidden">
      {/* Hero Banner */}
      <HeroBanner />

      {/* Game Filter Cards */}
      <GameFilterSection />


      {/* Live Now Section */}
      {liveTournaments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Live Now</h2>
              <LiveBadge />
            </div>
            <Link to="/tournaments" className="gradient-primary-text hover:underline text-sm font-semibold">
              See all
            </Link>
          </div>

          <div ref={liveScrollRef} className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {liveTournaments.map((tournament, index) => (
              <TournamentCard key={tournament.id} tournament={tournament} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Tournaments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Upcoming Tournaments</h2>
          <Link to="/tournaments" className="gradient-primary-text hover:underline text-sm font-semibold">
            See all
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="glassmorphism-card p-8 text-center">
            <p className="text-muted-foreground">No tournaments available</p>
          </div>
        ) : (
          <div ref={tournamentScrollRef} className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {tournaments.map((tournament, index) => (
              <TournamentCard key={tournament.id} tournament={tournament} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroBanner() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const backgroundImages = [
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6732213f-8bc5-4d3d-8145-6bb9c092a78d.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_590017d4-30ae-4e0f-be8b-2cf5f2210636.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b6509978-4266-4d97-922f-cafe6387b605.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f7e37326-4854-4ecb-977c-db53c828ac9d.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_176e03a2-ef75-4e61-9f77-2890f0d9fdab.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_99893794-5d0a-492e-9928-58b289b461fc.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_59ae7bb2-c284-42b5-8442-c6762376959f.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5b4b2921-df2c-4825-9019-e439f1e044bf.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6fe19795-64ef-4251-bef0-7b9099029134.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4bc8ad85-370c-47a5-9b8c-cf26ec76b9ce.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_801387b9-9d93-449c-9288-ef51545fde0c.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c4a77321-6c62-4d34-8807-bc91543da1fd.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_471d516b-92ba-4c2b-9122-a0933b974c96.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_62492729-9768-4796-a012-2f70e1d2f3f8.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4ffdf2ba-e8c8-4f8c-908b-2549acf65ade.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5cfcd611-097c-4ed8-a491-d72b16d2d616.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6af7d381-a365-4e23-bf7d-c9bcd592ef86.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_3c0833c6-c87b-4dec-9c11-eb83e12d31fa.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_3edec971-82f6-45f8-ab46-edf9d715e299.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_577bdeeb-8ed5-40e4-bb64-273a33379d70.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4ef7913c-0c43-43b3-82e5-32ac07a49948.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_9c8c7aca-90e1-4836-a2db-24e2205aa41d.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_0b30ac6a-65e7-4736-9ff7-c4b23150f4a8.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_99079e7f-7f93-48dc-ac68-269d528c812d.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_06ab664d-00cc-414c-8133-9cbc36b02f3d.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a8878991-5132-487f-a9aa-3812a077c14e.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5d634f07-d619-44d0-9efd-e7ce3f7f26a2.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_cb06697d-19f0-4c64-ab68-f6e2bea20c8a.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_4361df76-e4b0-4fad-8435-74935ae6541e.jpg',
    'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_1ef55a19-bcf1-4953-b180-b9d112439fda.jpg'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 10000); // Change image every 10 seconds

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  return (
    <div className="relative -mx-8 -mt-8 mb-8 h-[60vh] min-h-[400px] overflow-hidden">
      {/* Background Images with Fade Transition */}
      {backgroundImages.map((image, index) => (
        <div
          key={image}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-2000"
          style={{
            backgroundImage: `url(${image})`,
            opacity: index === currentImageIndex ? 1 : 0,
            zIndex: index === currentImageIndex ? 1 : 0,
            transitionDuration: '2000ms'
          }}
        />
      ))}

      {/* Enhanced Gradient Overlays for Fading Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/30 z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20 z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10" />
      <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-black/80 z-10" />

      {/* Content */}
      <div className="relative h-full flex items-center justify-between px-8 md:px-12 z-20">
        {/* Left Side - Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl space-y-3 z-10"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight">
            ARENA
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
            Where Gamers Showcase Their Real Talents
          </p>
          <p className="text-sm md:text-base text-muted-foreground/80 max-w-xl">
            Join the ultimate competitive gaming platform. Compete in tournaments, 
            climb the leaderboards, and prove your skills against the best players worldwide.
          </p>
          <div className="flex gap-3 pt-3">
            <Button size="default" asChild>
              <Link to="/tournaments">
                <Play className="h-4 w-4 mr-2" />
                Browse Tournaments
              </Link>
            </Button>
            <Button size="default" variant="outline" className="border-white/20 hover:bg-white/10" asChild>
              <Link to="/leaderboard">View Leaderboard</Link>
            </Button>
          </div>
        </motion.div>

        {/* Right Side - Gameplay Showcase */}
        <GameplayShowcase />
      </div>
    </div>
  );
}

function GameFilterSection() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const games: Array<GameType> = ['codm', 'fortnite', 'fifa', 'warzone', 'apex', 'valorant', 'injustice', 'mortal_kombat', 'efootball', 'pubg_mobile'];

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Always hijack vertical scroll and convert to horizontal
      e.preventDefault();
      container.scrollLeft += e.deltaY;
      setIsScrolling(true);
      
      setTimeout(() => setIsScrolling(false), 150);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Browse by Game</h2>
      
      <div 
        ref={scrollContainerRef}
        className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {games.map((game, index) => (
          <GameCard
            key={game}
            game={game}
            index={index}
            onClick={() => navigate(`/game/${game}`)}
          />
        ))}
      </div>
    </div>
  );
}

function GameCard({ 
  game, 
  index,
  onClick 
}: { 
  game: GameType; 
  index: number;
  onClick: () => void;
}) {
  const gameInfo = GAME_INFO[game];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="flex-shrink-0 w-28 md:w-40 cursor-pointer group"
      onClick={onClick}
    >
      <div className="glassmorphism-card overflow-hidden aspect-[3/4]">
        <div className="relative h-full">
          <img
            src={gameInfo.banner}
            alt={gameInfo.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
            <h3 className="font-bold text-xs md:text-sm text-center">{gameInfo.name}</h3>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TournamentCard({ tournament, index }: { tournament: Tournament; index: number }) {
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

  const gameInfo = GAME_INFO[tournament.game as GameType];
  const isLive = tournament.status === 'active';
  const isOpen = tournament.status === 'open';
  const isCancelled = tournament.status === 'cancelled';

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
      // Fetch latest balance
      const { data: latestProfile } = await supabase
        .from('profiles')
        .select('arena_currency, available_balance')
        .eq('id', user!.id)
        .single();
      
      const currentBalance = latestProfile?.arena_currency || 0;
      const currentAvailable = latestProfile?.available_balance || 0;

      if (entryFee > 0 && currentBalance < entryFee) {
        throw new Error(`Insufficient Arena Currency. You need ${formatArenaCurrency(entryFee)} to join.`);
      }

      if (entryFee > 0) {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className={`flex-shrink-0 w-48 md:w-64 ${isCancelled ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
      <Link to={`/tournaments/${tournament.id}`}>
        <div 
          className={`relative overflow-hidden rounded-lg border-2 shadow-lg transition-all duration-300 ${
            isCancelled ? 'border-destructive/40 shadow-destructive/10' : 'border-violet-500/50 shadow-violet-500/20 hover:shadow-violet-500/40'
          }`}
          style={{ height: '340px' }}
        >
          {/* Status Overlay for Cancelled */}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Badge variant="destructive" className="text-xl px-6 py-2 rotate-[-12deg] border-2 border-destructive shadow-2xl uppercase tracking-widest font-black bg-destructive text-destructive-foreground">
                Cancelled
              </Badge>
            </div>
          )}
          {/* Top Half - Game Image with Gradient Overlay */}
          <div className="relative h-1/2 overflow-hidden group">
            <img
              src={gameInfo.banner}
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
            <div className="absolute top-2 md:top-3 left-2 md:left-3 right-2 md:right-3 flex items-start justify-between">
              {/* Game Name Tag */}
              <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 text-[10px] md:text-xs font-medium">
                {gameInfo.name}
              </Badge>
              
              {/* LIVE Badge */}
              {isLive && (
                <div className="flex items-center gap-1 md:gap-1.5 bg-black/60 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
                  <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-red-500 rounded-full pulse-dot" />
                  <span className="text-white text-[10px] md:text-xs font-semibold">LIVE</span>
                </div>
              )}
              
              {/* Open Badge */}
              {isOpen && !isLive && (
                <Badge className="bg-green-500/90 text-white border-0 text-[10px] md:text-xs">
                  Open
                </Badge>
              )}
            </div>

            {/* Tournament Name at Bottom of Image */}
            <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 right-2 md:right-3">
              <h3 className="font-orbitron font-bold text-white text-sm md:text-base leading-tight line-clamp-2">
                {tournament.name}
              </h3>
            </div>
          </div>

          {/* Bottom Half - Glass Panel */}
          <div 
            className="h-1/2 p-3 md:p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'rgba(124, 58, 237, 0.12)' }}
          >
            {/* Prize Pool and Entry Fee */}
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Prize Pool</p>
                <p className="font-mono font-bold text-lg md:text-2xl" style={{ color: '#FFD700' }}>
                  {formatArenaCurrency(tournament.prize_pool)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Entry Fee</p>
                <p className="font-mono font-semibold text-base md:text-lg text-violet-400">
                  {formatArenaCurrency(tournament.entry_fee)}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mb-2 md:mb-3" />

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-1 md:gap-2 mb-2 md:mb-3 text-center">
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">Players</p>
                <p className="text-xs md:text-sm font-semibold text-white">
                  {formatCompactNumber(tournament.current_players)}/{formatCompactNumber(tournament.max_players)}
                </p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">Starts In</p>
                <p className="text-xs md:text-sm font-semibold text-white">
                  {formatTimeUntil(tournament.start_time)}
                </p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">Mode</p>
                <p className="text-xs md:text-sm font-semibold text-white truncate">
                  {tournament.format}
                </p>
              </div>
            </div>

            {/* JOIN Button */}
            {isOpen && !isJoined && user && (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="sheen-effect w-full py-3 md:py-3.5 rounded-lg font-semibold text-white text-sm md:text-base transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)'
                }}
              >
                {isJoining ? 'JOINING...' : 'JOIN TOURNAMENT'}
              </button>
            )}
            
            {isJoined && (
              <div className="w-full py-2.5 rounded-lg bg-primary/20 text-primary text-center font-semibold text-sm">
                JOINED
              </div>
            )}
          </div>
        </div>
      </Link>

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
    </motion.div>
  );
}

function GameplayShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const gameplayImages = [
    {
      url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_46f84398-2766-41dc-93bc-d1390989d60e.jpg',
      game: 'CODM',
      title: 'Intense Combat Action'
    },
    {
      url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b605c183-67e4-42c9-b5f5-b225814b2837.jpg',
      game: 'Fortnite',
      title: 'Epic Battle Royale'
    },
    {
      url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_bfd694b4-6d9b-4707-ac63-33f810da8a47.jpg',
      game: 'FIFA 23',
      title: 'Goal Celebration'
    },
    {
      url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_0829876e-9ed9-4a2c-889f-0cecb8ca0eb7.jpg',
      game: 'Warzone',
      title: 'Tactical Warfare'
    },
    {
      url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_889364bf-8e52-4295-8e2f-21809466f796.jpg',
      game: 'Apex Legends',
      title: 'Squad Combat'
    },
    {
      url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_848f5df1-e6d8-48fc-9b1d-2ad38783cb99.jpg',
      game: 'Valorant',
      title: 'Tactical Shooter'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % gameplayImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [gameplayImages.length]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="hidden lg:block relative w-96 h-64"
    >
      <div className="relative w-full h-full glassmorphism-card overflow-hidden">
        {gameplayImages.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: currentIndex === index ? 1 : 0,
              scale: currentIndex === index ? 1 : 1.1
            }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <img
              src={image.url}
              alt={image.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
              <p className="text-xs gradient-primary-text font-semibold">{image.game}</p>
              <h3 className="text-sm font-bold">{image.title}</h3>
            </div>
          </motion.div>
        ))}

        {/* Indicators */}
        <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
          {gameplayImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === index 
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 w-6 shadow-lg shadow-blue-500/50' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
