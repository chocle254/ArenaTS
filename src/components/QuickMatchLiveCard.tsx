import { Clock, MessageCircle, Shield, Swords } from 'lucide-react';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { QuickMatchDetailModal } from './QuickMatchDetailModal';

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_team_id: string | null;
  opponent_team_id: string | null;
  game: string;
  stake_amount: number;
  prize_pool: number;
  status: string;
  created_at: string;
  accepted_at: string | null;
  both_players_ready: boolean;
  challenger_checked_in: boolean;
  opponent_checked_in: boolean;
  check_in_deadline: string | null;
  updated_at?: string;
}

interface QuickMatchLiveCardProps {
  challenge: Challenge;
  currentUserId: string;
}

const GAME_LABELS: Record<string, string> = {
  codm: 'COD Mobile',
  fortnite: 'Fortnite',
  valorant: 'Valorant',
  apex: 'Apex Legends',
  warzone: 'Warzone',
  fifa: 'FIFA',
  injustice: 'Injustice',
  mortal_kombat: 'Mortal Kombat',
  efootball: 'eFootball',
  pubg_mobile: 'PUBG Mobile'
};

export function QuickMatchLiveCard({ challenge, currentUserId }: QuickMatchLiveCardProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [entities, setEntities] = React.useState<{challenger: any, opponent: any} | null>(null);
  const isChallenger = challenge.challenger_id === currentUserId || (challenge.challenger_team_id && entities?.challenger?.id === challenge.challenger_team_id);
  
  const myCheckedIn = challenge.challenger_id === currentUserId ? challenge.challenger_checked_in : challenge.opponent_checked_in;
  const opponentCheckedIn = challenge.challenger_id === currentUserId ? challenge.opponent_checked_in : challenge.challenger_checked_in;

  React.useEffect(() => {
    const fetchEntities = async () => {
      let challengerData, opponentData;

      if (challenge.challenger_team_id) {
        const { data } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', challenge.challenger_team_id)
          .maybeSingle();
        challengerData = { ...data, gamertag: data?.name, isTeam: true };
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, gamertag, avatar_url')
          .eq('id', challenge.challenger_id)
          .maybeSingle();
        challengerData = { ...data, isTeam: false };
      }

      if (challenge.opponent_team_id) {
        const { data } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', challenge.opponent_team_id)
          .maybeSingle();
        opponentData = { ...data, gamertag: data?.name, isTeam: true };
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, gamertag, avatar_url')
          .eq('id', challenge.opponent_id)
          .maybeSingle();
        opponentData = { ...data, isTeam: false };
      }
        
      setEntities({
        challenger: challengerData,
        opponent: opponentData
      });
    };
    
    fetchEntities();
  }, [challenge.challenger_id, challenge.opponent_id, challenge.challenger_team_id, challenge.opponent_team_id]);

  const isUserChallenger = challenge.challenger_id === currentUserId;
  const otherEntity = isUserChallenger ? entities?.opponent : entities?.challenger;

  if (!entities) {
    return (
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24 bg-muted" />
            <Skeleton className="h-4 w-12 bg-muted" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-3 w-1/2 bg-muted" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="overflow-hidden cursor-pointer hover:border-primary/50 transition-all group relative border-primary/20 bg-primary/5"
        onClick={() => setModalOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-tighter" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {GAME_LABELS[challenge.game] || challenge.game}
              </span>
              {['accepted', 'disputed'].includes(challenge.status) ? (
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 animate-pulse text-[8px] uppercase tracking-wider h-4 px-1">
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className={`text-[8px] uppercase tracking-wider h-4 px-1 ${
                  challenge.status === 'completed' ? 'border-green-500/50 text-green-500' : 
                  challenge.status === 'cancelled' ? 'border-destructive/50 text-destructive' :
                  'border-muted text-muted-foreground'
                }`}>
                  {challenge.status}
                </Badge>
              )}
            </div>
            <div className="text-xs font-mono font-bold text-green-500">
              {formatArenaCurrency(challenge.prize_pool)}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={otherEntity?.avatar_url || ''} />
                <AvatarFallback>{otherEntity?.gamertag?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{otherEntity?.gamertag}</span>
                {challenge.both_players_ready && (
                  <Badge variant="outline" className="h-4 px-1 text-[8px] border-green-500/50 text-green-500">READY</Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                {['accepted', 'disputed'].includes(challenge.status) ? (
                  <>
                    <MessageCircle className="h-3 w-3" />
                    Click to open match chat
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    {new Date(challenge.updated_at || challenge.created_at).toLocaleDateString()}
                  </>
                )}
              </p>
            </div>
            
            {!challenge.both_players_ready && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${myCheckedIn ? 'bg-green-500' : 'bg-muted'}`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${opponentCheckedIn ? 'bg-green-500' : 'bg-muted'}`} />
                </div>
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Check-in</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {modalOpen && (
        <QuickMatchDetailModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          challenge={challenge}
          currentUserId={currentUserId}
          profiles={entities}
        />
      )}
    </>
  );
}
