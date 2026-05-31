import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Search, Gamepad2, Users, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { GAME_INFO } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

interface LiveMatch {
  id: string;
  match_id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  status: string;
  tournaments: {
    name: string;
    game: string;
  };
  player1: {
    gamertag: string;
    avatar_url: string | null;
  };
  player2: {
    gamertag: string;
    avatar_url: string | null;
  };
}

export default function StreamingLounge() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [spectatorCounts, setSpectatorCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchLiveMatches();

    // Subscribe to match changes
    const matchChannel = supabase
      .channel('live-matches-lounge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_results'
        },
        (payload) => {
          console.log('Match change detected:', payload);
          fetchLiveMatches();
        }
      )
      .subscribe();

    // Subscribe to spectator presence
    const presenceChannel = supabase.channel('global-spectators');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const counts: Record<string, number> = {};
        
        Object.values(state).flat().forEach((p: any) => {
          if (p.match_id) {
            counts[p.match_id] = (counts[p.match_id] || 0) + 1;
          }
        });
        
        setSpectatorCounts(counts);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  const fetchLiveMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('match_results')
        .select(`
          id,
          match_id,
          tournament_id,
          player1_id,
          player2_id,
          status,
          tournaments (
            name,
            game
          ),
          player1:player1_id (
            gamertag,
            avatar_url
          ),
          player2:player2_id (
            gamertag,
            avatar_url
          )
        `)
        .eq('both_players_ready', true)
        .neq('status', 'confirmed');

      if (error) throw error;
      setMatches((data as any) || []);
    } catch (error) {
      console.error('Error fetching live matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match => 
    match.tournaments.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.player1?.gamertag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.player2?.gamertag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const game = match.tournaments.game;
    if (!acc[game]) acc[game] = [];
    acc[game].push(match);
    return acc;
  }, {} as Record<string, LiveMatch[]>);

  const handleViewStream = (match: LiveMatch) => {
    const params = new URLSearchParams({
      p1: match.player1?.gamertag || 'Player 1',
      p2: match.player2?.gamertag || 'Player 2',
      streamer: match.player2?.gamertag || 'Player 2',
      tid: match.tournament_id,
      tournamentName: match.tournaments.name,
      game: match.tournaments.game
    });
    navigate(`/live/${match.id}?${params.toString()}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Play className="h-8 w-8 text-primary fill-primary" />
            Streaming Lounge
          </h1>
          <p className="text-muted-foreground font-light max-w-2xl">
            Watch live matches currently in progress. Witness the skills and strategies of top players in real-time.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search matches or players..." 
            className="pl-10 bg-muted/20 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[280px] w-full rounded-2xl bg-muted/20" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-muted/5">
          <CardContent className="py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">No Live Matches</h3>
              <p className="text-muted-foreground font-light max-w-sm">
                There are currently no active matches being streamed. Check back later or browse upcoming tournaments.
              </p>
            </div>
            <Link to="/tournaments">
              <Badge variant="outline" className="px-4 py-1.5 hover:bg-primary/10 cursor-pointer transition-colors">
                Browse Tournaments
              </Badge>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedMatches).map(([game, gameMatches]) => (
            <div key={game} className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold tracking-tight uppercase">
                  {GAME_INFO[game as keyof typeof GAME_INFO]?.name || game}
                </h2>
                <Badge variant="secondary" className="ml-2 font-mono text-[10px]">
                  {gameMatches.length} LIVE
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gameMatches.map((match) => (
                  <motion.div
                    key={match.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card 
                      className="overflow-hidden group cursor-pointer border-border/50 hover:border-primary/50 transition-all bg-card/50 backdrop-blur-sm"
                      onClick={() => handleViewStream(match)}
                    >
                      {/* Fake Thumbnail / Stream Preview Placeholder */}
                      <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 z-10" />
                        
                        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                          <Badge variant="destructive" className="animate-pulse flex items-center gap-1 text-[8px] tracking-widest px-1.5 py-0">
                            <span className="w-1 h-1 rounded-full bg-white mr-0.5" />
                            LIVE
                          </Badge>
                        </div>

                        <div className="text-center space-y-2 p-6 z-20">
                          <Play className="h-12 w-12 text-white/40 group-hover:text-primary transition-colors mx-auto" />
                          <p className="text-[10px] text-white/60 font-bold uppercase tracking-[0.2em]">Watch Perspective</p>
                        </div>

                        {/* Animated overlay on hover */}
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                      </div>

                      <CardContent className="p-5 space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                            <Trophy className="h-2.5 w-2.5" />
                            {match.tournaments.name}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-base truncate flex items-center gap-2">
                                {match.player1?.gamertag} 
                                <span className="text-muted-foreground font-light text-xs">vs</span> 
                                {match.player2?.gamertag}
                              </h4>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <div className="flex -space-x-2">
                            <div className="h-6 w-6 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-bold overflow-hidden">
                              {match.player1?.avatar_url ? (
                                <img src={match.player1.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                match.player1?.gamertag?.[0]?.toUpperCase()
                              )}
                            </div>
                            <div className="h-6 w-6 rounded-full border border-background bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary overflow-hidden">
                              {match.player2?.avatar_url ? (
                                <img src={match.player2.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                match.player2?.gamertag?.[0]?.toUpperCase()
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-light italic">
                            {spectatorCounts[match.id] || 0} spectators watching
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
