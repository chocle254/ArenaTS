import { AlertCircle, CheckCircle, Clock, MessageSquare, Search, ShieldAlert, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TournamentBracket } from '@/components/TournamentBracket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatCurrency, formatLargeNumber } from '@/lib/format-number';

const formatCompactNumber = (n: number) => formatLargeNumber(n);

interface MatchResult {
  id: string;
  match_id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  status: 'pending' | 'confirmed' | 'disputed';
  winner_id: string | null;
  created_at: string;
  tournaments: {
    name: string;
    game: string;
  };
}

export default function RefereeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchMatches();
    const channel = supabase
      .channel('referee_matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_results' },
        () => fetchMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('match_results')
        .select('*, tournaments(name, game)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match => {
    const matchesSearch = 
      match.tournaments.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.match_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'disputed') return match.status === 'disputed' && matchesSearch;
    if (activeTab === 'pending') return match.status === 'pending' && matchesSearch;
    if (activeTab === 'confirmed') return match.status === 'confirmed' && matchesSearch;
    return matchesSearch;
  });

  // Sort disputed to top
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (a.status === 'disputed' && b.status !== 'disputed') return -1;
    if (a.status !== 'disputed' && b.status === 'disputed') return 1;
    return 0;
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="referee-header-title uppercase">Referee Control Center</h1>
          <p className="text-[#64748b] font-inter font-light text-[15px]">Monitor matches and resolve disputes</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
          <Input
            placeholder="Search matches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 referee-search-bar h-11 border-none placeholder:text-[#64748b] focus-visible:ring-0"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="referee-tabs-list">
          <TabsTrigger value="all" className="referee-tab uppercase">All Matches</TabsTrigger>
          <TabsTrigger value="disputed" className="referee-tab uppercase">
            Disputed {matches.filter(m => m.status === 'disputed').length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                {formatCompactNumber(matches.filter(m => m.status === 'disputed').length)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="referee-tab uppercase">Pending</TabsTrigger>
          <TabsTrigger value="confirmed" className="referee-tab uppercase">Confirmed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse h-48 rounded-xl bg-white/5" />
              ))
            ) : sortedMatches.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <ShieldAlert className="h-16 w-16 text-[#64748b] opacity-20 mx-auto mb-4" />
                <p className="text-[#64748b] font-inter font-light">No matches found matching your criteria</p>
              </div>
            ) : (
              sortedMatches.map((match) => {
                const statusClass = 
                  match.status === 'disputed' ? 'match-card-disputed' :
                  match.status === 'pending' ? 'match-card-pending' :
                  'match-card-confirmed';
                
                const pillClass = 
                  match.status === 'disputed' ? 'pill-disputed' :
                  match.status === 'pending' ? 'pill-pending' :
                  'pill-confirmed';

                return (
                  <div 
                    key={match.id} 
                    className={`match-card ${statusClass}`}
                    onClick={() => navigate(`/tournaments/${match.tournament_id}?match=${match.match_id}`)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="game-tag">{match.tournaments.game}</span>
                      <span className={`status-pill ${pillClass}`}>{match.status}</span>
                    </div>

                    <div className="flex-1">
                      <h3 className="match-tournament-name truncate">{match.tournaments.name}</h3>
                      <p className="match-id-text">Match ID: {match.match_id}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-[#64748b]">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-[12px]">
                          {new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button className="view-match-btn uppercase">
                        View Match
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
