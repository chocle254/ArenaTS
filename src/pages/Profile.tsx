import { Award, Calendar, DollarSign, MessageSquare, Swords, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SendChallengePanel } from '@/components/SendChallengePanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import type { Profile as ProfileType } from '@/types/database';

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { profile: currentUserProfile, user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [challengePanelOpen, setChallengePanelOpen] = useState(false);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);

  const isOwnProfile = !userId || userId === user?.id;
  const displayProfile = isOwnProfile ? currentUserProfile : profile;

  useEffect(() => {
    if (userId && userId !== user?.id) {
      fetchUserProfile();
    } else {
      setProfile(currentUserProfile);
      setLoading(false);
    }
  }, [userId, user?.id, currentUserProfile]);

  useEffect(() => {
    if (displayProfile?.id) {
      fetchMatchHistory();
      fetchPayoutHistory();
    }
  }, [displayProfile?.id]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchHistory = async () => {
    if (!displayProfile?.id) return;

    try {
      // Fetch both query types in parallel
      const [
        { data: challenges, error: challengesError },
        { data: tournamentMatches, error: tournamentError },
      ] = await Promise.all([
        supabase
          .from('challenges')
          .select('*')
          .or(`challenger_id.eq.${displayProfile.id},opponent_id.eq.${displayProfile.id}`)
          .in('status', ['completed', 'cancelled'])
          .order('completed_at', { ascending: false })
          .limit(10),
        supabase
          .from('match_results')
          .select('*, tournaments(name, game)')
          .or(`player1_id.eq.${displayProfile.id},player2_id.eq.${displayProfile.id}`)
          .eq('status', 'confirmed')
          .order('updated_at', { ascending: false })
          .limit(10),
      ]);

      if (challengesError) throw challengesError;
      if (tournamentError) throw tournamentError;

      // Combine and sort
      const combined = [
        ...(challenges || []).map(c => ({
          id: c.id,
          type: 'Quick Match',
          game: c.game,
          date: c.completed_at || c.created_at,
          winner_id: c.winner_id,
          stake: c.stake_amount,
          opponent_id: c.challenger_id === displayProfile.id ? c.opponent_id : c.challenger_id,
          status: c.status
        })),
        ...(tournamentMatches || []).map(m => ({
          id: m.id,
          type: 'Tournament',
          game: (m.tournaments as any)?.game || 'Tournament',
          tournamentName: (m.tournaments as any)?.name,
          date: m.updated_at,
          winner_id: m.winner_id,
          stake: 0, // Tournament matches don't have individual stakes usually
          opponent_id: m.player1_id === displayProfile.id ? m.player2_id : m.player1_id,
          status: m.status
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

      setRecentMatches(combined);
    } catch (error) {
      console.error('Error fetching match history:', error);
    }
  };

  const fetchPayoutHistory = async () => {
    if (!displayProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', displayProfile.id)
        .eq('type', 'payout')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPayouts(data || []);
    } catch (error) {
      console.error('Error fetching payout history:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!displayProfile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Profile not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <Card className="border border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage src={displayProfile?.avatar_url || ''} alt={displayProfile?.gamertag || 'Player'} />
              <AvatarFallback className="bg-primary/10 text-primary text-4xl font-display">
                {displayProfile?.gamertag?.[0]?.toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-2">
                <h1 className="text-4xl font-bold tracking-tight">
                  {displayProfile?.gamertag || 'Anonymous Player'}
                </h1>
                {displayProfile?.role === 'admin' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Admin</Badge>
                )}
              </div>
              {isOwnProfile && <p className="text-muted-foreground mb-6 font-light">{displayProfile?.email}</p>}
              
              {/* Stats Row - Prominent Display */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-8">
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {formatCompactNumber(displayProfile?.tournaments_played || 0)}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Tournaments</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-green-500">
                    {formatCompactNumber(displayProfile?.wins || 0)}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Wins</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-red-500">
                    {formatCompactNumber(displayProfile?.losses || 0)}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Losses</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-primary">
                    ⭐ {(displayProfile?.rating || 5.0).toFixed(1)}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Rating</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-amber-500">
                    {formatArenaCurrency(displayProfile?.total_earnings || 0)}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Earnings</div>
                </div>
              </div>

              {/* Action Buttons - Only show on other users' profiles */}
              {!isOwnProfile && user && (
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button
                    onClick={() => setChallengePanelOpen(true)}
                    size="lg"
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Swords className="h-5 w-5" />
                    CHALLENGE
                  </Button>
                  <Button
                    onClick={() => navigate(`/messages?user=${displayProfile.id}`)}
                    size="lg"
                    variant="outline"
                    className="gap-2 border-border"
                  >
                    <MessageSquare className="h-5 w-5" />
                    MESSAGE
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Challenge Panel */}
      {!isOwnProfile && displayProfile && user && (
        <SendChallengePanel
          open={challengePanelOpen}
          onOpenChange={setChallengePanelOpen}
          opponent={{
            user_id: displayProfile.id,
            gamertag: displayProfile.gamertag || 'Unknown',
            avatar_url: displayProfile.avatar_url,
            wins: displayProfile.wins || 0,
            losses: displayProfile.losses || 0,
            rank: 'Gold' // TODO: Add rank system
          }}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/30 border border-border p-1">
          <TabsTrigger value="overview">Match History</TabsTrigger>
          <TabsTrigger value="earnings">Payout History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card className="border border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-xl">Recent Matches</CardTitle>
            </CardHeader>
            <CardContent>
              {recentMatches.length > 0 ? (
                <div className="space-y-4">
                  {recentMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Swords className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm uppercase tracking-tight">
                            {match.game} <span className="text-[10px] font-normal text-muted-foreground ml-2">({match.type})</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {match.tournamentName || (new Date(match.date).toLocaleDateString())}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={match.winner_id === displayProfile.id ? "default" : "secondary"} className={match.winner_id === displayProfile.id ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                          {match.winner_id === displayProfile.id ? "WINNER" : match.winner_id ? "LOST" : match.status.toUpperCase()}
                        </Badge>
                        {match.stake > 0 && <p className="text-xs mt-1 font-mono text-muted-foreground">{formatArenaCurrency(match.stake)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <h3 className="text-xl font-semibold mb-2">No Match History</h3>
                  <p className="text-muted-foreground font-light">
                    Complete matches to start building your record
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="mt-6">
          <Card className="border border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-xl">Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              {payouts.length > 0 ? (
                <div className="space-y-4">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-500/10 rounded-full">
                          <DollarSign className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{payout.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-500 font-mono">+{formatArenaCurrency(payout.amount)}</p>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {payout.status || 'Completed'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <h3 className="text-xl font-semibold mb-2">No Payout History</h3>
                  <p className="text-muted-foreground font-light">
                    Win matches and tournaments to see your history here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
