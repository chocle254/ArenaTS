import { AlertCircle, Calendar, Check, DollarSign, Download, Loader2, Shield, ShieldAlert, TrendingUp, Trophy, Users, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';

interface TournamentRevenue {
  id: string;
  name: string;
  game: string;
  prize_pool: number;
  platform_fee: number;
  status: string;
  start_time: string;
  current_players: number;
}

interface RevenueStats {
  totalFees: number;
  monthlyFees: number;
  yearlyFees: number;
  completedTournaments: number;
  totalUsers: number;
  platformRevenueBalance: number;
}

interface QueuedWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'queued' | 'processing' | 'failed';
  reason: string | null;
  failure_reason: string | null;
  created_at: string;
  profiles: { gamertag: string } | null;
}

interface PlatformFloat {
  availableCents: number;
  pendingCents: number;
  queuedWithdrawals: QueuedWithdrawal[];
  queuedTotal: number;
}

interface DisputedChallenge {
  id: string;
  game: string;
  stake_amount: number;
  challenger_id: string;
  opponent_id: string;
  challenger_reported_winner: string | null;
  opponent_reported_winner: string | null;
  challenger: { gamertag: string };
  opponent: { gamertag: string };
  created_at: string;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RevenueStats>({
    totalFees: 0,
    monthlyFees: 0,
    yearlyFees: 0,
    completedTournaments: 0,
    totalUsers: 0,
    platformRevenueBalance: 0,
  });
  const [tournaments, setTournaments] = useState<TournamentRevenue[]>([]);
  const [disputedChallenges, setDisputedChallenges] = useState<DisputedChallenge[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawingRevenue, setWithdrawingRevenue] = useState(false);
  const [platformFloat, setPlatformFloat] = useState<PlatformFloat>({
    availableCents: 0,
    pendingCents: 0,
    queuedWithdrawals: [],
    queuedTotal: 0,
  });
  const [floatLoading, setFloatLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      return;
    }

    if (profile) {
      if (profile.role !== 'admin') {
        toast.error('Access denied. Admin only.');
        navigate('/dashboard');
        return;
      }
      
      // If we have profile but stats are not loaded, we might still want to show a small indicator
      // but not the full screen loader if possible.
      // For now, let's just fetch the data.
      Promise.all([
        fetchRevenueData(false),
        fetchDisputedChallenges(),
        fetchPlatformUsers(),
        fetchPlatformFloat()
      ]);
    }
  }, [user, profile, navigate]);

  const fetchDisputedChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          challenger:challenger_id(gamertag),
          opponent:opponent_id(gamertag)
        `)
        .eq('status', 'disputed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputedChallenges(data || []);
    } catch (error) {
      console.error('Error fetching disputed challenges:', error);
    }
  };

  const fetchPlatformFloat = async () => {
    setFloatLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await invokeEdgeFunction<PlatformFloat>('get-platform-float', {
        accessToken: token,
        body: {},
      });

      if (error) throw error;
      if (data) setPlatformFloat(data);
    } catch (error) {
      console.error('Error fetching platform float:', error);
      toast.error('Failed to load platform float');
    } finally {
      setFloatLoading(false);
    }
  };

  const retryQueuedWithdrawal = async (queueId: string) => {
    setRetryingId(queueId);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await invokeEdgeFunction<{ amount?: number }>('retry-queued-withdrawal', {
        accessToken: token,
        body: { queueId },
      });

      if (error) throw error;

      toast.success(`Released withdrawal of $${(data?.amount ?? 0).toFixed(2)}`);
      fetchPlatformFloat();
    } catch (error: any) {
      console.error('Error retrying withdrawal:', error);
      toast.error(error.message || 'Still insufficient funds — try again once the float has topped up');
    } finally {
      setRetryingId(null);
    }
  };

  const fetchPlatformUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPlatformUsers(data || []);
    } catch (error) {
      console.error('Error fetching platform users:', error);
    }
  };

  const resolveChallenge = async (challengeId: string, winnerId: string | 'cancel') => {
    setResolving(challengeId);
    try {
      if (winnerId === 'cancel') {
        // Handle cancellation
        const { error } = await supabase
          .from('challenges')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', challengeId);
        
        if (error) throw error;
        toast.success('Match cancelled and stakes refunded');
      } else {
        // Handle picking a winner
        const { error } = await supabase
          .from('challenges')
          .update({ 
            status: 'completed',
            winner_id: winnerId,
            challenger_reported_winner: winnerId,
            opponent_reported_winner: winnerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', challengeId);
        
        if (error) throw error;
        toast.success('Winner confirmed and prize distributed');
      }
      
      await fetchDisputedChallenges();
    } catch (error) {
      console.error('Error resolving challenge:', error);
      toast.error('Failed to resolve challenge');
    } finally {
      setResolving(null);
    }
  };

  const fetchRevenueData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // Fire status update in the background — don't block data fetching
      supabase.rpc('check_and_update_tournament_status');

      // Fetch all data in parallel
      const [
        { data: completedTournaments, error: tournamentError },
        { data: completedChallenges, error: challengeError },
        { count: totalUsers, error: userError },
        { data: platformSettings, error: settingsError },
      ] = await Promise.all([
        supabase
          .from('tournaments')
          .select('id, name, game, prize_pool, platform_fee_percentage, status, start_time, current_players')
          .eq('status', 'completed')
          .order('start_time', { ascending: false }),
        supabase
          .from('challenges')
          .select('id, platform_fee, completed_at')
          .eq('status', 'completed'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('platform_settings')
          .select('maintenance_balance')
          .single(),
      ]);

      if (tournamentError) throw tournamentError;
      if (challengeError) throw challengeError;
      if (userError) throw userError;

      // Calculate platform fees for each tournament
      const tournamentsWithFees: TournamentRevenue[] = (completedTournaments || []).map(t => ({
        id: t.id,
        name: t.name,
        game: t.game,
        prize_pool: t.prize_pool,
        platform_fee: t.prize_pool * (t.platform_fee_percentage / 100),
        status: t.status,
        start_time: t.start_time,
        current_players: t.current_players
      }));

      setTournaments(tournamentsWithFees);

      // Calculate total revenue (Tournaments + Challenges)
      const tournamentFees = tournamentsWithFees.reduce((sum, t) => sum + t.platform_fee, 0);
      const challengeFees = (completedChallenges || []).reduce((sum, c) => sum + Number(c.platform_fee || 0), 0);
      const totalFees = tournamentFees + challengeFees;
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Monthly Revenue
      const monthlyTournamentFees = tournamentsWithFees
        .filter((t: TournamentRevenue) => {
          const date = new Date(t.start_time);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.platform_fee, 0);
      
      const monthlyChallengeFees = (completedChallenges || [])
        .filter(c => {
          const date = new Date(c.completed_at!);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, c) => sum + Number(c.platform_fee || 0), 0);

      const monthlyFees = monthlyTournamentFees + monthlyChallengeFees;
      
      // Yearly Revenue
      const yearlyTournamentFees = tournamentsWithFees
        .filter((t: TournamentRevenue) => {
          const date = new Date(t.start_time);
          return date.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.platform_fee, 0);

      const yearlyChallengeFees = (completedChallenges || [])
        .filter(c => {
          const date = new Date(c.completed_at!);
          return date.getFullYear() === currentYear;
        })
        .reduce((sum, c) => sum + Number(c.platform_fee || 0), 0);

      const yearlyFees = yearlyTournamentFees + yearlyChallengeFees;

      setStats({
        totalFees,
        monthlyFees,
        yearlyFees,
        completedTournaments: tournamentsWithFees.length,
        totalUsers: totalUsers || 0,
        platformRevenueBalance: Number(platformSettings?.maintenance_balance || 0),
      });
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRevenue = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > stats.platformRevenueBalance) {
      toast.error('Amount exceeds platform revenue balance');
      return;
    }

    setWithdrawingRevenue(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await invokeEdgeFunction<{ message?: string; usdAmount?: number }>('admin-withdraw-revenue', {
        accessToken: token,
        body: { amount: Math.round(amount * 100) / 100 },
      });

      if (error) {
        const msg = error.message;
        if (msg.toLowerCase().includes('insufficient')) {
          toast.error('Platform revenue balance is too low for this withdrawal');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Platform revenue withdrawal of $${amount.toFixed(2)} initiated`);
      setWithdrawAmount('');
      fetchRevenueData(false);
    } catch (error: any) {
      console.error('Revenue withdrawal error:', error);
      toast.error(error.message || 'Failed to withdraw platform revenue');
    } finally {
      setWithdrawingRevenue(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Tournament Name', 'Game', 'Prize Pool', 'Platform Fee (10%)', 'Players', 'Date'];
    const rows = tournaments.map(t => [
      t.name,
      t.game,
      `A$${t.prize_pool.toFixed(2)}`,
      `A$${t.platform_fee.toFixed(2)}`,
      t.current_players,
      new Date(t.start_time).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arena-revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="admin-header-title uppercase">Admin Control Center</h1>
            <p className="text-[#64748b] font-inter font-light text-[15px]">Platform revenue, disputes, and tournament analytics</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={async () => {
                const { error } = await supabase.rpc('expire_old_challenges');
                if (error) toast.error('Failed to resolve matches');
                else {
                  toast.success('Check-in deadlines and expired matches processed');
                  fetchDisputedChallenges();
                }
              }} 
              className="admin-btn-primary gap-2 flex items-center"
            >
              <Shield className="h-4 w-4" />
              Process Match Deadlines
            </button>
            <button onClick={() => navigate('/admin/referees')} className="admin-btn-secondary gap-2 flex items-center">
              <Users className="h-4 w-4" />
              Manage Referees
            </button>
            <button onClick={() => navigate('/admin/kyc')} className="admin-btn-secondary gap-2 flex items-center">
              <Shield className="h-4 w-4" />
              KYC Review
            </button>
            <button onClick={exportToCSV} className="admin-btn-secondary gap-2 flex items-center">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">
              <DollarSign className="h-[18px] w-[18px] text-blue-400" />
              Total Revenue
            </div>
            <div className="admin-stat-value">{formatArenaCurrency(stats.totalFees)}</div>
            <div className="admin-stat-sub">Platform lifetime</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-label">
              <Calendar className="h-[18px] w-[18px] text-cyan-400" />
              Monthly
            </div>
            <div className="admin-stat-value">{formatArenaCurrency(stats.monthlyFees)}</div>
            <div className="admin-stat-sub">Current period</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-label">
              <TrendingUp className="h-[18px] w-[18px] text-cyan-400" />
              Yearly
            </div>
            <div className="admin-stat-value">{formatArenaCurrency(stats.yearlyFees)}</div>
            <div className="admin-stat-sub">Annual performance</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-label">
              <Wallet className="h-[18px] w-[18px] text-emerald-400" />
              Withdrawable Revenue
            </div>
            <div className="admin-stat-value">${stats.platformRevenueBalance.toFixed(2)}</div>
            <div className="admin-stat-sub">Platform wallet balance</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-label">
              <Trophy className="h-[18px] w-[18px] text-amber-500" />
              Tournaments
            </div>
            <div className="admin-stat-value">{formatCompactNumber(stats.completedTournaments)}</div>
            <div className="admin-stat-sub">Events completed</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-label">
              <Users className="h-[18px] w-[18px] text-purple-500" />
              Users
            </div>
            <div className="admin-stat-value">{formatCompactNumber(stats.totalUsers)}</div>
            <div className="admin-stat-sub">Total registered</div>
          </div>
        </div>

        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="referee-tabs-list">
            <TabsTrigger value="revenue" className="referee-tab uppercase">
              Revenue Reports
            </TabsTrigger>
            <TabsTrigger value="disputes" className="referee-tab uppercase">
              Challenge Disputes
              {disputedChallenges.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                  {formatCompactNumber(disputedChallenges.length)}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="referee-tab uppercase">
              Platform Users
            </TabsTrigger>
            <TabsTrigger value="float" className="referee-tab uppercase">
              Platform Float
              {platformFloat.queuedWithdrawals.filter(q => q.status === 'queued').length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">
                  {formatCompactNumber(platformFloat.queuedWithdrawals.filter(q => q.status === 'queued').length)}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-8 space-y-6">
            {/* Platform Revenue Withdrawal Card */}
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Withdraw Platform Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex-1 w-full">
                    <p className="text-xs text-muted-foreground mb-1.5">Amount to withdraw</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={stats.platformRevenueBalance / 100}
                        placeholder="0.00"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="pl-7 font-mono"
                        disabled={withdrawingRevenue || stats.platformRevenueBalance <= 0}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWithdrawAmount(stats.platformRevenueBalance.toFixed(2))}
                      disabled={stats.platformRevenueBalance <= 0}
                    >
                      Max
                    </Button>
                    <Button
                      onClick={handleWithdrawRevenue}
                      disabled={withdrawingRevenue || !withdrawAmount || stats.platformRevenueBalance <= 0}
                      className="gap-2"
                    >
                      {withdrawingRevenue ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                      Withdraw
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available platform revenue: <span className="font-mono font-semibold">${stats.platformRevenueBalance.toFixed(2)}</span>.
                  This is the sum of all platform fees collected from tournaments and challenges. It can be withdrawn to ARENA's Stripe wallet.
                </p>
              </CardContent>
            </Card>

            <div className="admin-table-container">
              <Table>
                <TableHeader>
                  <TableRow className="admin-table-header hover:bg-transparent border-none">
                    <TableHead className="admin-table-header">Tournament</TableHead>
                    <TableHead className="admin-table-header">Game</TableHead>
                    <TableHead className="admin-table-header text-right">Prize Pool</TableHead>
                    <TableHead className="admin-table-header text-right">Platform Fee</TableHead>
                    <TableHead className="admin-table-header text-center">Players</TableHead>
                    <TableHead className="admin-table-header text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-[#64748b] font-light">
                        No completed tournaments yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    tournaments.map((tournament) => (
                      <TableRow key={tournament.id} className="admin-table-row">
                        <TableCell className="text-white font-semibold">{tournament.name}</TableCell>
                        <TableCell className="text-[#64748b] font-medium capitalize">{tournament.game}</TableCell>
                        <TableCell className="text-right text-white font-semibold">
                          {formatArenaCurrency(tournament.prize_pool)}
                        </TableCell>
                        <TableCell className="text-right text-[#22c55e] font-bold">
                          {formatArenaCurrency(tournament.platform_fee)}
                        </TableCell>
                        <TableCell className="text-center text-[#a855f7] font-medium">
                          {formatCompactNumber(tournament.current_players)}
                        </TableCell>
                        <TableCell className="text-right text-[#64748b] font-inter text-[13px]">
                          {new Date(tournament.start_time).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="disputes" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disputedChallenges.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <ShieldAlert className="h-16 w-16 text-[#64748b] opacity-20 mx-auto mb-4" />
                  <p className="text-[#64748b] font-inter font-light">No disputed challenges found</p>
                </div>
              ) : (
                disputedChallenges.map((challenge) => (
                  <div key={challenge.id} className="match-card match-card-disputed">
                    <div className="flex items-center justify-between mb-4">
                      <span className="game-tag">{challenge.game}</span>
                      <span className="status-pill pill-disputed">DISPUTED</span>
                    </div>

                    <div className="flex-1">
                      <h3 className="match-tournament-name truncate">
                        {challenge.challenger?.gamertag} vs {challenge.opponent?.gamertag}
                      </h3>
                      <p className="match-id-text">Amount: {formatArenaCurrency(challenge.stake_amount)}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-6">
                      <button 
                        onClick={() => resolveChallenge(challenge.id, challenge.challenger_id)}
                        disabled={resolving === challenge.id}
                        className="btn-approve text-[11px] py-2"
                      >
                        {challenge.challenger?.gamertag} Wins
                      </button>
                      <button 
                        onClick={() => resolveChallenge(challenge.id, challenge.opponent_id)}
                        disabled={resolving === challenge.id}
                        className="btn-approve text-[11px] py-2"
                      >
                        {challenge.opponent?.gamertag} Wins
                      </button>
                      <button 
                        onClick={() => resolveChallenge(challenge.id, 'cancel')}
                        disabled={resolving === challenge.id}
                        className="btn-reject text-[11px] py-2 col-span-2"
                      >
                        Cancel & Refund
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-8">
            <div className="admin-table-container">
              <Table>
                <TableHeader>
                  <TableRow className="admin-table-header hover:bg-transparent border-none">
                    <TableHead className="admin-table-header">User</TableHead>
                    <TableHead className="admin-table-header">Role</TableHead>
                    <TableHead className="admin-table-header text-right">Balance</TableHead>
                    <TableHead className="admin-table-header text-right">Earnings</TableHead>
                    <TableHead className="admin-table-header text-center">Record</TableHead>
                    <TableHead className="admin-table-header text-right">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformUsers.map((pUser) => (
                    <TableRow key={pUser.id} className="admin-table-row">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border-none bg-white/5">
                            <AvatarImage src={pUser.avatar_url} />
                            <AvatarFallback className="bg-white/5 text-[10px]">{pUser.gamertag?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-white font-semibold">{pUser.gamertag}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={pUser.role === 'admin' ? 'admin-badge-admin' : 'admin-badge-user'}>
                          {pUser.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-white font-semibold">
                        {formatArenaCurrency(pUser.arena_currency || 0)}
                      </TableCell>
                      <TableCell className="text-right text-[#22c55e] font-bold">
                        {formatArenaCurrency(pUser.total_earnings || 0)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        <span className="text-[#22c55e]">{pUser.wins || 0}W</span>
                        <span className="text-[#64748b] mx-1">/</span>
                        <span className="text-[#ef4444]">{pUser.losses || 0}L</span>
                      </TableCell>
                      <TableCell className="text-right text-[#64748b] font-inter text-[13px]">
                        {new Date(pUser.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="float" className="mt-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Available (Stripe)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    ${(platformFloat.availableCents / 100).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Funds ready to cover withdrawals now</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Pending (Stripe)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    ${(platformFloat.pendingCents / 100).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Settling from recent charges, not yet available</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Queued Withdrawals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-amber-500">
                    ${platformFloat.queuedTotal.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {platformFloat.queuedWithdrawals.filter(q => q.status === 'queued').length} waiting on float
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground max-w-xl">
                Stripe's available balance replenishes automatically as customer payments settle — there's no way to
                deposit into it on demand. When a withdrawal is queued, retry it here once the available balance
                covers it.
              </p>
              <Button variant="ghost" size="sm" onClick={fetchPlatformFloat} disabled={floatLoading} className="gap-2">
                {floatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Refresh
              </Button>
            </div>

            <div className="admin-table-container">
              <Table>
                <TableHeader>
                  <TableRow className="admin-table-header hover:bg-transparent border-none">
                    <TableHead className="admin-table-header">User</TableHead>
                    <TableHead className="admin-table-header text-right">Amount</TableHead>
                    <TableHead className="admin-table-header">Status</TableHead>
                    <TableHead className="admin-table-header">Queued</TableHead>
                    <TableHead className="admin-table-header text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformFloat.queuedWithdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-[#64748b] font-light">
                        No queued withdrawals — the platform float is covering everyone
                      </TableCell>
                    </TableRow>
                  ) : (
                    platformFloat.queuedWithdrawals.map((q) => (
                      <TableRow key={q.id} className="admin-table-row">
                        <TableCell className="text-white font-semibold">
                          {q.profiles?.gamertag || q.user_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-right text-white font-semibold font-mono">
                          ${Number(q.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              q.status === 'failed'
                                ? 'admin-badge-admin'
                                : q.status === 'processing'
                                ? 'admin-badge-user'
                                : 'admin-badge-user'
                            }
                          >
                            {q.status === 'queued' ? 'Queued' : q.status === 'processing' ? 'Processing' : 'Failed'}
                          </span>
                          {q.failure_reason && (
                            <p className="text-[11px] text-[#ef4444] mt-1">{q.failure_reason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-[#64748b] font-inter text-[13px]">
                          {new Date(q.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => retryQueuedWithdrawal(q.id)}
                            disabled={retryingId === q.id || q.status === 'processing'}
                            className="gap-2"
                          >
                            {retryingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Retry
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
