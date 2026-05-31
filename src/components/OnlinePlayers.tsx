import { AnimatePresence, motion } from 'framer-motion';
import { Swords, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SendChallengePanel } from '@/components/SendChallengePanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatCompactNumber } from '@/lib/arena-currency';

interface OnlinePlayer {
  id: string;
  gamertag: string;
  avatar_url: string | null;
  wins: number;
  losses: number;
  last_seen_at: string;
  rating: number;
}

export function OnlinePlayers() {
  const { user } = useAuth();
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<any>(null);
  const [challengePanelOpen, setChallengePanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnlinePlayers();

    // Subscribe to profile changes to update online list in real-time
    const channel = supabase
      .channel('online-players')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchOnlinePlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchOnlinePlayers = async () => {
    if (!user) return;

    // A player is considered online if last_seen_at is within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, gamertag, avatar_url, wins, losses, last_seen_at, rating')
      .neq('id', user.id)
      .gt('last_seen_at', fiveMinutesAgo)
      .order('last_seen_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching online players:', error);
    } else {
      setOnlinePlayers(data || []);
    }
    setLoading(false);
  };

  const handleChallenge = (player: OnlinePlayer) => {
    setSelectedOpponent({
      user_id: player.id,
      gamertag: player.gamertag || 'Unknown',
      avatar_url: player.avatar_url,
      wins: player.wins || 0,
      losses: player.losses || 0,
      rank: 'Gold' // Default for now
    });
    setChallengePanelOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Users className="h-6 w-6 animate-pulse text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-green-500" />
          Online Players
          {onlinePlayers.length > 0 && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
              {formatCompactNumber(onlinePlayers.length)}
            </Badge>
          )}
        </h2>
      </div>

      {onlinePlayers.length === 0 ? (
        <div className="glassmorphism-card p-6 text-center">
          <p className="text-muted-foreground text-sm">No players online right now. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {onlinePlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="glassmorphism-card p-4 flex items-center gap-4 group hover:border-primary/30 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={player.avatar_url || ''} alt={player.gamertag} />
                    <AvatarFallback className="bg-muted text-xs">
                      {player.gamertag?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{player.gamertag}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatCompactNumber(player.wins)}W - {formatCompactNumber(player.losses)}L
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs font-semibold text-primary">
                      ⭐ {(player.rating || 5.0).toFixed(1)}
                    </p>
                  </div>
                </div>

                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all group-hover:border-primary/50"
                  onClick={() => handleChallenge(player)}
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Challenge</span>
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {selectedOpponent && (
        <SendChallengePanel
          open={challengePanelOpen}
          onOpenChange={setChallengePanelOpen}
          opponent={selectedOpponent}
        />
      )}
    </div>
  );
}
