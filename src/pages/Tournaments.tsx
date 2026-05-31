import { motion } from 'framer-motion';
import { Bell, Coins, Users } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConsentModal } from '@/components/ConsentModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { LiveBadge } from '@/components/ui/live-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import { formatCurrency, formatLargeNumber } from '@/lib/format-number';
import { formatTimeUntil } from '@/lib/utils';
import type { GameType, Tournament } from '@/types/database';
import { GAME_INFO } from '@/types/database';

export default function Tournaments() {
  const { user } = useAuth();
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [joinedTournaments, setJoinedTournaments] = useState<Tournament[]>([]);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [reminderTournamentIds, setReminderTournamentIds] = useState<Set<string>>(new Set());
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Refs for horizontal scroll containers
  const liveScrollRef = useRef<HTMLDivElement>(null);
  const upcomingScrollRef = useRef<HTMLDivElement>(null);
  const joinedScrollRef = useRef<HTMLDivElement>(null);
  const pastScrollRef = useRef<HTMLDivElement>(null);
  const allScrollRef = useRef<HTMLDivElement>(null);

  // Setup wheel scroll for horizontal scrolling
  useEffect(() => {
    const refs = [liveScrollRef, upcomingScrollRef, joinedScrollRef, pastScrollRef, allScrollRef];
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
  }, [user]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      // Fire status update RPCs in the background — don't block data fetching
      supabase.rpc('check_and_update_tournament_status').then(() =>
        supabase.rpc('check_and_cancel_insufficient_tournaments')
      );

      // Fetch all tournaments and (if logged in) user data in parallel
      const tournamentQuery = supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: false });

      const participantQuery = user
        ? supabase.from('tournament_participants').select('tournament_id').eq('user_id', user.id)
        : Promise.resolve({ data: null });

      const reminderQuery = user
        ? supabase.from('tournament_reminders').select('tournament_id, reminder_24h, reminder_1h, reminder_15m').eq('user_id', user.id)
        : Promise.resolve({ data: null });

      const [{ data: allData }, { data: participantData }, { data: reminderData }] = await Promise.all([
        tournamentQuery,
        participantQuery,
        reminderQuery,
      ]);

      const all = allData || [];
      const now = new Date();

      // Categorize tournaments based on status
      const live: Tournament[] = [];
      const upcoming: Tournament[] = [];
      const past: Tournament[] = [];

      all.forEach((tournament) => {
        const startTime = new Date(tournament.start_time);
        const isPastStartTime = startTime <= now;

        if (tournament.status === 'completed' || tournament.status === 'cancelled') {
          past.push(tournament);
        } else if (tournament.status === 'active' || (tournament.status === 'open' && isPastStartTime)) {
          live.push(tournament);
        } else if (tournament.status === 'open' && !isPastStartTime) {
          upcoming.push(tournament);
        }
      });

      setAllTournaments(all);
      setLiveTournaments(live);
      setUpcomingTournaments(upcoming);
      setPastTournaments(past);

      // Build joined ids set for card-level display (no per-card DB query)
      const participantIds = new Set(participantData?.map(p => p.tournament_id) || []);
      setJoinedIds(participantIds);

      if (user) {
        // Only show tournaments that haven't started yet in Joined section
        const joined = all.filter(t =>
          participantIds.has(t.id) &&
          t.status === 'open' &&
          new Date(t.start_time) > now
        );
        setJoinedTournaments(joined);

        const reminderSet = new Set(
          reminderData
            ?.filter(r => r.reminder_24h || r.reminder_1h || r.reminder_15m)
            .map(r => r.tournament_id) || []
        );
        setReminderTournamentIds(reminderSet);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-light tracking-tight">Tournaments</h1>
        <p className="text-sm md:text-base text-muted-foreground font-light">Browse all available tournaments</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="live" className="w-full overflow-x-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="grid w-full min-w-max md:max-w-2xl grid-cols-5 bg-gradient-to-br from-blue-950/30 via-violet-950/30 to-blue-950/30 border border-blue-500/20">
            <TabsTrigger value="live" className="font-light text-xs md:text-sm">
              Live ({formatCompactNumber(liveTournaments.length)})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="font-light text-xs md:text-sm">
              Upcoming ({formatCompactNumber(upcomingTournaments.length)})
            </TabsTrigger>
            {user && (
              <TabsTrigger value="joined" className="font-light text-xs md:text-sm">
                Joined ({formatCompactNumber(joinedTournaments.length)})
              </TabsTrigger>
            )}
            <TabsTrigger value="past" className="font-light text-xs md:text-sm">
              Past ({formatCompactNumber(pastTournaments.length)})
            </TabsTrigger>
            <TabsTrigger value="all" className="font-light text-xs md:text-sm">
              All ({formatCompactNumber(allTournaments.length)})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Live Tournaments */}
        <TabsContent value="live" className="mt-6">
          {loading ? (
            <div className="glassmorphism-card p-8 text-center">
              <p className="text-muted-foreground font-light">Loading tournaments...</p>
            </div>
          ) : liveTournaments.length === 0 ? (
            <div className="glassmorphism-card p-8 text-center">
              <p className="text-muted-foreground font-light">No live tournaments</p>
            </div>
          ) : (
            <div ref={liveScrollRef} className="flex md:grid overflow-x-auto md:overflow-x-visible gap-4 md:grid-cols-4 pb-4 md:pb-0 scrollbar-hide">
              {liveTournaments.map((tournament, index) => (
                <TournamentCard 
                  key={tournament.id} 
                  tournament={tournament} 
                  index={index}
                  isJoinedInitial={joinedIds.has(tournament.id)}
                  hasReminder={reminderTournamentIds.has(tournament.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Upcoming Tournaments */}
        <TabsContent value="upcoming" className="mt-6">
          {loading ? (
            <div className="glassmorphism-card p-8 text-center">
              <p className="text-muted-foreground font-light">Loading tournaments...</p>
            </div>
          ) : upcomingTournaments.length === 0 ? (
            <div className="glassmorphism-card p-8 text-center">
              <p className="text-muted-foreground font-light">No upcoming tournaments</p>
            </div>
          ) : (
            <div ref={upcomingScrollRef} className="flex md:grid overflow-x-auto md:overflow-x-visible gap-4 md:grid-cols-4 pb-4 md:pb-0 scrollbar-hide">
              {upcomingTournaments.map((tournament, index) => (
                <TournamentCard 
                  key={tournament.id} 
                  tournament={tournament} 
                  index={index}
                  isJoinedInitial={joinedIds.has(tournament.id)}
                  hasReminder={reminderTournamentIds.has(tournament.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Joined Tournaments */}
        {user && (
          <TabsContent value="joined" className="mt-6">
            {loading ? (
              <div className="glassmorphism-card p-8 text-center">
                <p className="text-muted-foreground font-light">Loading tournaments...</p>
              </div>
            ) : joinedTournaments.length === 0 ? (
              <div className="glassmorphism-card p-8 text-center">
                <p className="text-muted-foreground font-light">You haven't joined any tournaments yet</p>
              </div>
            ) : (
              <div ref={joinedScrollRef} className="flex md:grid overflow-x-auto md:overflow-x-visible gap-4 md:grid-cols-4 pb-4 md:pb-0 scrollbar-hide">
                {joinedTournaments.map((tournament, index) => (
                  <TournamentCard 
                    key={tournament.id} 
                    tournament={tournament} 
                    index={index}
                    isJoinedInitial={true}
                    hasReminder={reminderTournamentIds.has(tournament.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Past Tournaments */}
        <TabsContent value="past" className="mt-6">
          {loading ? (
            <div className="glassmorphism-card p-8 text-center">
              <p className="text-muted-foreground font-light">Loading tournaments...</p>
            </div>
          ) : pastTournaments.length === 0 ? (
            <div className="glassmorphism-card p-8 text-center">
              <p className="text-muted-foreground font-light">No past tournaments</p>
            </div>
          ) : (
            <div ref={pastScrollRef} className="flex md:grid overflow-x-auto md:overflow-x-visible gap-4 md:grid-cols-4 pb-4 md:pb-0 scrollbar-hide">
              {pastTournaments.map((tournament, index) => (
                <TournamentCard 
                  key={tournament.id} 
                  tournament={tournament} 
                  index={index}
                  isJoinedInitial={joinedIds.has(tournament.id)}
                  isPast 
                  hasReminder={reminderTournamentIds.has(tournament.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Tournaments */}
        <TabsContent value="all" className="mt-6">
          {loading ? (
            <div className="glassmorphism-card p-8 text-center">
              <p className="text-muted-foreground font-light">Loading tournaments...</p>
            </div>
          ) : allTournaments.length === 0 ? (
            <div className="glassmorphism-card p-8 text-center">
              <p className="text-muted-foreground font-light">No tournaments found</p>
            </div>
          ) : (
            <div ref={allScrollRef} className="flex md:grid overflow-x-auto md:overflow-x-visible gap-4 md:grid-cols-4 pb-4 md:pb-0 scrollbar-hide">
              {allTournaments.map((tournament, index) => (
                <TournamentCard 
                  key={tournament.id} 
                  tournament={tournament} 
                  index={index}
                  isJoinedInitial={joinedIds.has(tournament.id)}
                  hasReminder={reminderTournamentIds.has(tournament.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TournamentCard({ tournament, index, isPast = false, hasReminder = false, isJoinedInitial = false }: { tournament: Tournament; index: number; isPast?: boolean; hasReminder?: boolean; isJoinedInitial?: boolean }) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(isJoinedInitial);
  const [isJoining, setIsJoining] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentConfig, setConsentConfig] = useState<{
    title: string;
    description: string;
    amount: number;
    onConfirm: () => void;
  } | null>(null);

  const gameInfo = GAME_INFO[tournament.game as GameType];
  const isLive = tournament.status === 'live' || tournament.status === 'active';
  const isOpen = tournament.status === 'open';
  const isCancelled = tournament.status === 'cancelled';

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

      if (entryFee > 0 && currentBalance < entryFee) {
        throw new Error(`Insufficient Arena Currency. You need ${formatArenaCurrency(entryFee)} to join.`);
      }

      // NO MANUAL DEDUCTION HERE - Handled by database trigger on tournament_participants table

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

      await refreshProfile();
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
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className={`flex-shrink-0 w-56 md:w-auto ${isPast || isCancelled ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
      <Link to={`/tournaments/${tournament.id}`}>
        <div 
          className={`relative overflow-hidden rounded-lg border-2 shadow-lg transition-all duration-300 ${
            isCancelled ? 'border-destructive/40 shadow-destructive/10' : 'border-violet-500/50 shadow-violet-500/20 hover:shadow-violet-500/40'
          }`}
          style={{ height: '450px' }}
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
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
              {/* Game Name Tag */}
              <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 text-sm font-medium">
                {gameInfo.name}
              </Badge>
              
              {/* LIVE Badge */}
              {isLive && !isPast && (
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

              {/* Reminder Indicator */}
              {hasReminder && !isPast && !isLive && !isOpen && (
                <div className="flex items-center gap-1 bg-blue-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Bell className="h-3.5 w-3.5 text-white" />
                </div>
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
                  {formatCurrency(tournament.prize_pool)}
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
            {isOpen && !isJoined && !isPast && user && (
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
