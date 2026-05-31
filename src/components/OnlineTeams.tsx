import { AnimatePresence, motion } from 'framer-motion';
import { Shield, Swords, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SendChallengePanel } from '@/components/SendChallengePanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';


interface OnlineTeam {
  id: string;
  name: string;
  captain_id: string;
  captain_gamertag: string;
  captain_avatar: string | null;
  member_count: number;
  online_member_count: number;
}

export function OnlineTeams() {
  const { user } = useAuth();
  const [onlineTeams, setOnlineTeams] = useState<OnlineTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [challengePanelOpen, setChallengePanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnlineTeams();

    const channel = supabase
      .channel('online-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => fetchOnlineTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchOnlineTeams())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchOnlineTeams = async () => {
    if (!user) return;

    try {
      // 1. Fetch all teams with their member counts and captains
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          profiles:captain_id (gamertag, avatar_url),
          team_members (user_id)
        `);

      if (teamsError) throw teamsError;

      // 2. Filter teams that have 5 members
      const qualifiedTeams = (teamsData || []).filter(t => t.team_members.length === 5);

      // 3. For each qualified team, check online status of members
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const onlineTeamsList: OnlineTeam[] = [];

      for (const team of qualifiedTeams) {
        const memberIds = team.team_members.map((m: any) => m.user_id);
        
        const { data: onlineMembers, error: onlineError } = await supabase
          .from('profiles')
          .select('id')
          .in('id', memberIds)
          .gt('last_seen_at', fiveMinutesAgo);

        if (onlineError) continue;

        const onlineCount = onlineMembers?.length || 0;
        
        const profiles = Array.isArray(team.profiles) ? team.profiles[0] : team.profiles;
        
        // We only show teams that have at least one person online (captain usually)
        if (onlineCount >= 1) {
          onlineTeamsList.push({
            id: team.id,
            name: team.name,
            captain_id: team.captain_id,
            captain_gamertag: profiles?.gamertag || 'Unknown',
            captain_avatar: profiles?.avatar_url,
            member_count: team.team_members.length,
            online_member_count: onlineCount
          });
        }
      }

      setOnlineTeams(onlineTeamsList);
    } catch (error) {
      console.error('Error fetching online teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChallenge = (team: OnlineTeam) => {
    if (team.online_member_count < 5) {
      toast.error(`Team ${team.name} is not ready. All 5 members must be online to accept challenges.`);
      return;
    }
    setSelectedTeam({
      team_id: team.id,
      gamertag: team.name,
      avatar_url: team.captain_avatar,
      wins: 0,
      losses: 0
    });
    setChallengePanelOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Users className="h-6 w-6 animate-pulse text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2 tracking-tight">
          <Shield className="h-5 w-5 text-blue-500" />
          Ready Teams (5v5)
          {onlineTeams.length > 0 && (
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              {onlineTeams.length}
            </Badge>
          )}
        </h2>
      </div>

      {onlineTeams.length === 0 ? (
        <div className="glassmorphism-card p-12 text-center border-dashed border-2 border-border/50">
          <Users className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" />
          <p className="text-muted-foreground font-light italic">No teams ready for 5v5 yet. Form a team with 5 members and go online!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {onlineTeams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="glassmorphism-card p-5 flex flex-col gap-4 group hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-background ring-2 ring-blue-500/20">
                      <AvatarImage src={team.captain_avatar || ''} alt={team.name} />
                      <AvatarFallback className="bg-muted text-lg font-display">
                        {team.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${team.online_member_count === 5 ? 'bg-green-500' : 'bg-amber-500'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate group-hover:text-blue-400 transition-colors">{team.name}</h3>
                    <p className="text-xs text-muted-foreground font-light">
                      Captain: {team.captain_gamertag}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-light">Readiness</span>
                    <span className={`text-sm font-bold ${team.online_member_count === 5 ? 'text-green-500' : 'text-amber-500'}`}>
                      {team.online_member_count}/5 Online
                    </span>
                  </div>

                  <Button 
                    size="sm" 
                    className={`h-9 gap-2 transition-all ${team.online_member_count === 5 ? 'sheen-effect bg-blue-600 hover:bg-blue-500' : 'bg-muted cursor-not-allowed opacity-50'}`}
                    disabled={team.online_member_count < 5}
                    onClick={() => handleChallenge(team)}
                  >
                    <Swords className="h-4 w-4" />
                    Challenge
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {selectedTeam && (
        <SendChallengePanel
          open={challengePanelOpen}
          onOpenChange={setChallengePanelOpen}
          opponent={selectedTeam}
        />
      )}
    </div>
  );
}
