import { motion } from 'framer-motion';
import { ArrowLeft, Play, Shield, Users, Volume2, VolumeX, Maximize2, Grid2X2 } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';

type ViewMode = 'split' | 'p1' | 'p2';

export default function LiveStream() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const challengerName = searchParams.get('p1') || 'Player 1';
  const opponentName = searchParams.get('p2') || 'Player 2';
  const streamerName = searchParams.get('streamer') || opponentName;
  const gameName = searchParams.get('game') || 'Unknown Game';
  const tournamentId = searchParams.get('tid');

  const [p1Twitch, setP1Twitch] = useState<string | null>(null);
  const [p2Twitch, setP2Twitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [p1Muted, setP1Muted] = useState(true);
  const [p2Muted, setP2Muted] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(0);

  useEffect(() => {
    if (!matchId) return;

    // Track presence for spectator count
    const presenceChannel = supabase.channel('global-spectators', {
      config: {
        presence: {
          key: user?.id || crypto.randomUUID(),
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.values(state).flat().filter((p: any) => p.match_id === matchId).length;
        setSpectatorCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            match_id: matchId,
            user_id: user?.id || 'anonymous',
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [matchId, user?.id]);

  useEffect(() => {
    async function fetchTwitchHandles() {
      try {
        const { data: p1Data } = await supabase
          .from('profiles')
          .select('twitch_handle, gamertag')
          .eq('gamertag', challengerName)
          .maybeSingle();
        
        const { data: p2Data } = await supabase
          .from('profiles')
          .select('twitch_handle, gamertag')
          .eq('gamertag', opponentName)
          .maybeSingle();

        const sanitizeHandle = (handle: string | null, fallback: string) => {
          if (!handle) {
            // If no handle in DB, use the fallback (gamertag)
            // Strip any spaces and convert to lowercase for Twitch
            return fallback.replace(/\s+/g, '').toLowerCase();
          }
          
          // If handle exists, sanitize it:
          // 1. Remove full URL if provided (e.g., https://twitch.tv/user -> user)
          // 2. Remove leading @ (e.g., @user -> user)
          let sanitized = handle.trim();
          if (sanitized.includes('twitch.tv/')) {
            sanitized = sanitized.split('twitch.tv/').pop()?.split('/')[0] || sanitized;
          }
          sanitized = sanitized.replace(/^@/, '');
          return sanitized.toLowerCase();
        };

        setP1Twitch(sanitizeHandle(p1Data?.twitch_handle, challengerName));
        setP2Twitch(sanitizeHandle(p2Data?.twitch_handle, opponentName));
      } catch (err) {
        console.error('Error fetching twitch handles:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTwitchHandles();
  }, [challengerName, opponentName]);

  const toggleAudio = (target: 'p1' | 'p2') => {
    if (target === 'p1') {
      setP1Muted(false);
      setP2Muted(true);
    } else {
      setP1Muted(true);
      setP2Muted(false);
    }
  };

  const parentDomain = window.location.hostname;
  const devDomains = ['localhost', 'miaoda-gg.com', 'medo.dev'];
  const parentParams = [parentDomain, ...devDomains]
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .map(domain => `&parent=${domain}`)
    .join('');

  return (
    <div className="min-h-screen bg-background font-montserrat p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link to={tournamentId ? `/tournaments/${tournamentId}` : '/dashboard'}>
              <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Tournament
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Match Stream</h1>
              <Badge variant="destructive" className="animate-pulse flex gap-1 uppercase tracking-widest text-[10px]">
                <div className="w-1 h-1 rounded-full bg-white self-center" />
                Live
              </Badge>
            </div>
            <p className="text-muted-foreground font-light">
              Spectating: <span className="font-semibold text-foreground">{challengerName}</span> vs <span className="font-semibold text-foreground">{opponentName}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Streaming Player</span>
              <span className="font-bold text-primary">{streamerName}</span>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <Play className="h-6 w-6 text-primary fill-primary" />
            </div>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-6 bg-muted/10 rounded-2xl border border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">View Mode</span>
            <div className="flex p-1 bg-background rounded-lg border border-border/50">
              <Button 
                variant={viewMode === 'p1' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 gap-2 text-[10px] uppercase font-bold tracking-tight"
                onClick={() => setViewMode('p1')}
              >
                <Maximize2 className="h-3 w-3" />
                {challengerName}
              </Button>
              <Button 
                variant={viewMode === 'split' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 gap-2 text-[10px] uppercase font-bold tracking-tight"
                onClick={() => setViewMode('split')}
              >
                <Grid2X2 className="h-3 w-3" />
                Split Screen
              </Button>
              <Button 
                variant={viewMode === 'p2' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 gap-2 text-[10px] uppercase font-bold tracking-tight"
                onClick={() => setViewMode('p2')}
              >
                <Maximize2 className="h-3 w-3" />
                {opponentName}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">Active Audio</span>
            <div className="flex p-1 bg-background rounded-lg border border-border/50">
              <Button 
                variant={!p1Muted ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 gap-2 text-[10px] uppercase font-bold tracking-tight"
                onClick={() => toggleAudio('p1')}
              >
                {!p1Muted ? <Volume2 className="h-3 w-3 text-primary" /> : <VolumeX className="h-3 w-3" />}
                {challengerName}
              </Button>
              <Button 
                variant={!p2Muted ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 gap-2 text-[10px] uppercase font-bold tracking-tight"
                onClick={() => toggleAudio('p2')}
              >
                {!p2Muted ? <Volume2 className="h-3 w-3 text-primary" /> : <VolumeX className="h-3 w-3" />}
                {opponentName}
              </Button>
            </div>
          </div>
        </div>

        {/* Browser Compatibility Note for Firefox Users */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-xs text-blue-200">
              <span className="font-bold">Firefox User?</span> If the stream doesn't load, ensure "Enhanced Tracking Protection" is disabled for this site.
            </p>
          </div>
          
          <div className="flex-1 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-xs text-amber-200">
              <span className="font-bold">Stream Offline?</span> Check if the Twitch username is correct in Settings. Ensure no '@' symbols or extra spaces.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Streams Grid */}
          <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Player 1 Stream */}
            {(viewMode === 'split' || viewMode === 'p1') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${!p1Muted ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                    <span className={`text-sm font-bold tracking-tight ${!p1Muted ? 'text-primary' : ''}`}>{challengerName}</span>
                  </div>
                  <Badge variant={!p1Muted ? 'secondary' : 'outline'} className={`text-[8px] uppercase tracking-tighter ${!p1Muted ? 'text-primary' : 'opacity-50'}`}>
                    {!p1Muted ? 'Audio Active' : 'Muted'}
                  </Badge>
                </div>
                <Card className={`overflow-hidden bg-black relative ring-offset-background transition-all duration-300 ${!p1Muted ? 'ring-2 ring-primary/20 shadow-lg shadow-primary/5' : 'border-border/50'} ${viewMode === 'p1' ? 'aspect-video md:aspect-[21/9]' : 'aspect-video'}`}>
                  {!loading && p1Twitch ? (
                    <iframe
                      src={`https://player.twitch.tv/?channel=${p1Twitch}${parentParams}&autoplay=true&muted=${p1Muted}`}
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary/40 animate-spin" />
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Player 2 Stream (Primary Streamer) */}
            {(viewMode === 'split' || viewMode === 'p2') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${!p2Muted ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                    <span className={`text-sm font-bold tracking-tight ${!p2Muted ? 'text-primary' : ''}`}>{opponentName}</span>
                  </div>
                  <Badge variant={!p2Muted ? 'secondary' : 'outline'} className={`text-[8px] uppercase tracking-tighter ${!p2Muted ? 'text-primary' : 'opacity-50'}`}>
                    {!p2Muted ? 'Audio Active' : 'Muted'}
                  </Badge>
                </div>
                <Card className={`overflow-hidden bg-black relative ring-offset-background transition-all duration-300 ${!p2Muted ? 'ring-2 ring-primary/20 shadow-lg shadow-primary/5' : 'border-border/50'} ${viewMode === 'p2' ? 'aspect-video md:aspect-[21/9]' : 'aspect-video'}`}>
                  {!loading && p2Twitch ? (
                    <iframe
                      src={`https://player.twitch.tv/?channel=${p2Twitch}${parentParams}&autoplay=true&muted=${p2Muted}`}
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-muted/20 rounded-2xl border border-border/50 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Fair Play Monitoring
                </h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  This dual-stream is being monitored for integrity. Any unsportsmanlike conduct or violation of {gameName} rules will result in immediate disqualification.
                </p>
              </div>
              <div className="p-6 bg-muted/20 rounded-2xl border border-border/50 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Spectator View
                  <Badge variant="secondary" className="ml-2 font-mono text-[10px] bg-primary/10 text-primary border-primary/20">
                    {spectatorCount} WATCHING
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  You are watching the match from both perspectives. By default, Player 2's audio is active as the primary broadcast.
                </p>
              </div>
            </div>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tournament</h4>
                  <p className="font-bold">{searchParams.get('tournamentName') || 'Standard Arena Cup'}</p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Matchup</h4>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setViewMode('p1')}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${viewMode === 'p1' ? 'bg-primary/20 border-primary' : 'bg-muted/30 border-border/50 hover:bg-muted/50'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">P1</div>
                      <span className="font-semibold text-sm">{challengerName}</span>
                    </button>
                    <button 
                      onClick={() => setViewMode('p2')}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${viewMode === 'p2' ? 'bg-primary/20 border-primary' : 'bg-muted/30 border-border/50 hover:bg-muted/50'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">P2</div>
                      <div className="flex-1 text-left">
                        <span className="font-semibold text-sm">{opponentName}</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant={viewMode === 'split' ? 'secondary' : 'outline'} 
                    className="text-[10px] font-bold tracking-tight uppercase"
                    onClick={() => setViewMode('split')}
                  >
                    <Grid2X2 className="h-3 w-3 mr-2" />
                    Split Screen View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
