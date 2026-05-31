import { motion } from 'framer-motion';
import { Award, Medal, Star, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import type { Profile } from '@/types/database';

interface LeaderboardPlayer extends Profile {
  rank: number;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('total_earnings', { ascending: false })
        .limit(50);

      if (error) throw error;

      const rankedPlayers = (data || []).map((player, index) => ({
        ...player,
        rank: index + 1
      }));

      setPlayers(rankedPlayers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-5xl">
        <Skeleton className="h-12 w-64 bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full bg-muted" />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full mb-3 bg-muted" />
        ))}
      </div>
    );
  }

  const top3 = players.slice(0, 3);
  const remainingPlayers = players.slice(3);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12 max-w-5xl animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <Badge variant="outline" className="px-4 py-1 text-primary border-primary/20 bg-primary/5 uppercase tracking-widest text-[10px] font-bold">
          The Hall of Fame
        </Badge>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
          Leaderboard
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
          Recognizing the elite competitors who dominate the arena.
        </p>
      </div>

      {/* Podium Section */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end relative py-8">
          {/* Rank 2 (Silver) - Rendered first on desktop, second on mobile */}
          {top3[1] && (
            <div className="order-2 md:order-1 h-full flex flex-col justify-end">
              <PodiumCard player={top3[1]} rank={2} />
            </div>
          )}
          
          {/* Rank 1 (Gold) - Center */}
          {top3[0] && (
            <div className="order-1 md:order-2 h-full">
              <PodiumCard player={top3[0]} rank={1} isMain />
            </div>
          )}
          
          {/* Rank 3 (Bronze) - Last */}
          {top3[2] && (
            <div className="order-3 h-full flex flex-col justify-end">
              <PodiumCard player={top3[2]} rank={3} />
            </div>
          )}
        </div>
      )}

      {/* Remaining Players List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-6 py-2 border-b border-border/50">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rank & Player</span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground hidden md:inline">Stats</span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Earnings</span>
        </div>
        
        <div className="space-y-3">
          {remainingPlayers.map((player) => (
            <LeaderboardRow key={player.id} player={player} />
          ))}
          
          {players.length === 0 && (
            <div className="glassmorphism-card py-20 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground font-medium">No competitors have entered the arena yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PodiumCard({ player, rank, isMain = false }: { player: LeaderboardPlayer; rank: number; isMain?: boolean }) {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 via-gold to-yellow-600';
      case 2: return 'from-slate-300 via-slate-400 to-slate-500';
      case 3: return 'from-amber-600 via-amber-700 to-amber-800';
      default: return 'from-muted to-muted-foreground';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-8 w-8 text-yellow-900" />;
      case 2: return <Medal className="h-6 w-6 text-slate-900" />;
      case 3: return <Award className="h-6 w-6 text-amber-900" />;
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1, duration: 0.8, type: 'spring' }}
      className={`relative group ${isMain ? 'md:-translate-y-8 z-20' : 'z-10'}`}
    >
      {/* Decorative Light Behind */}
      {isMain && (
        <div className="absolute inset-0 bg-primary/10 blur-[80px] -z-10 rounded-full scale-150" />
      )}

      <Card className={`glassmorphism-card border-none p-0 overflow-hidden text-center transition-all duration-500 hover:scale-[1.02] ${
        isMain ? 'ring-2 ring-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.1)]' : 'ring-1 ring-border/50'
      }`}>
        {/* Header Background */}
        <div className={`h-2 w-full bg-gradient-to-r ${getRankColor(rank)}`} />
        
        <CardContent className="p-6 pt-8 space-y-4">
          <div className="relative mx-auto w-fit">
            <div className={`absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${getRankColor(rank)} shadow-lg`}>
              {getRankIcon(rank)}
            </div>
            <Avatar className={`mx-auto ring-offset-4 ring-offset-background transition-transform duration-500 group-hover:scale-105 ${
              isMain ? 'h-24 w-24 ring-4 ring-gold' : 'h-20 w-20 ring-2 ring-slate-400/50'
            }`}>
              <AvatarImage src={player.avatar_url || ''} alt={player.gamertag || 'Player'} />
              <AvatarFallback className="text-2xl font-bold bg-muted">
                {player.gamertag?.[0]?.toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-1">
            <h3 className={`font-display font-bold tracking-tight px-2 leading-tight ${isMain ? 'text-2xl' : 'text-xl'}`}>
              {player.gamertag || 'Anonymous'}
            </h3>
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              <Star className="h-3 w-3 fill-current" />
              <span>Rank #{player.rank}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/20 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Wins</p>
              <p className="text-lg font-bold font-display">{formatCompactNumber(player.wins || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Win Rate</p>
              <p className="text-lg font-bold font-display">{player.win_rate?.toFixed(0) || '0'}%</p>
            </div>
          </div>

          <div className={`mt-4 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
            isMain ? 'bg-gold/10 text-gold' : 'bg-primary/5 text-primary'
          }`}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Earned</span>
            <span className="font-mono font-bold text-lg">{formatArenaCurrency(player.total_earnings || 0)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LeaderboardRow({ player }: { player: LeaderboardPlayer }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="glassmorphism-card p-4 flex items-center justify-between gap-4 group hover:bg-white/5 transition-all duration-300"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-8 flex-shrink-0 text-center">
          <span className="text-lg font-display font-bold text-muted-foreground/40 group-hover:text-primary transition-colors">
            #{player.rank}
          </span>
        </div>

        <Avatar className="h-10 w-10 flex-shrink-0 border border-border group-hover:border-primary/50 transition-colors">
          <AvatarImage src={player.avatar_url || ''} alt={player.gamertag || 'Player'} />
          <AvatarFallback className="bg-muted text-xs">
            {player.gamertag?.[0]?.toUpperCase() || 'P'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 pr-4">
          <div className="font-display font-bold text-base md:text-lg text-foreground group-hover:text-primary transition-colors leading-tight break-words">
            {player.gamertag || 'Anonymous Player'}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[8px] h-4 uppercase border-border/50 text-muted-foreground font-bold tracking-tighter">
              Level {Math.floor((player.wins || 0) / 10) + 1}
            </Badge>
            {player.role === 'admin' && (
              <Badge variant="secondary" className="text-[8px] h-4 uppercase font-bold tracking-tighter">
                Admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-12 flex-shrink-0 mr-12 text-center">
        <div>
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Wins</p>
          <p className="font-display font-bold text-sm">{formatCompactNumber(player.wins || 0)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Rate</p>
          <p className="font-display font-bold text-sm flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            {player.win_rate?.toFixed(1) || '0.0'}%
          </p>
        </div>
      </div>

      <div className="text-right flex-shrink-0 bg-primary/5 group-hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors min-w-[100px]">
        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Earnings</p>
        <p className="text-primary font-mono font-bold text-base md:text-lg">
          {formatArenaCurrency(player.total_earnings || 0)}
        </p>
      </div>
    </motion.div>
  );
}
