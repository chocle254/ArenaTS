import { motion } from 'framer-motion';
import { ArrowLeft, Play, Shield, Users } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';

export default function LiveStream() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const challengerName = searchParams.get('p1') || 'Player 1';
  const opponentName = searchParams.get('p2') || 'Player 2';
  const streamerName = searchParams.get('streamer') || opponentName;
  const gameName = searchParams.get('game') || 'Unknown Game';
  const tournamentId = searchParams.get('tid');

  const [streamerTwitch, setStreamerTwitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTwitchHandle() {
      // In a real scenario, we'd fetch the streamer's Twitch handle from their profile
      // For now, we'll try to find it via the username or use a fallback
      try {
        const { data } = await supabase
          .from('profiles')
          .select('twitch_handle, gamertag')
          .eq('gamertag', streamerName)
          .maybeSingle();
        
        if (data?.twitch_handle) {
          setStreamerTwitch(data.twitch_handle);
        } else {
          // Fallback to the gamertag itself if no handle is set
          setStreamerTwitch(streamerName.replace(/\s+/g, '').toLowerCase());
        }
      } catch (err) {
        console.error('Error fetching twitch handle:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTwitchHandle();
  }, [streamerName]);

  const parentDomain = window.location.hostname;

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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Stream Container */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="overflow-hidden border-border/50 bg-black aspect-video relative group">
              {!loading && streamerTwitch ? (
                <iframe
                  src={`https://player.twitch.tv/?channel=${streamerTwitch}&parent=${parentDomain}&autoplay=true`}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-muted-foreground font-light">Connecting to Twitch stream...</p>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-muted/20 rounded-2xl border border-border/50 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Fair Play Monitoring
                </h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  This stream is being monitored for integrity. Any unsportsmanlike conduct or violation of {gameName} rules will result in immediate disqualification.
                </p>
              </div>
              <div className="p-6 bg-muted/20 rounded-2xl border border-border/50 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Community Spectating
                </h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  You are watching as a spectator. Feel free to follow the streamer on Twitch to support the competitive community.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar / Info */}
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tournament</h4>
                  <p className="font-bold">{searchParams.get('tournamentName') || 'Standard Arena Cup'}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Match Format</h4>
                  <p className="font-medium">{searchParams.get('format') || 'Best of 3'}</p>
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Competitors</h4>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">P1</div>
                    <span className="font-semibold text-sm">{challengerName}</span>
                  </div>

                  <div className="flex items-center justify-center -my-2">
                    <span className="text-[10px] font-bold text-muted-foreground">VS</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">P2</div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm">{opponentName}</span>
                      <div className="flex items-center gap-1 text-[8px] text-primary font-bold uppercase tracking-tighter">
                        <Play className="h-2 w-2 fill-primary" />
                        Streaming
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold tracking-tight h-12" asChild>
                  <a href={`https://twitch.tv/${streamerTwitch}`} target="_blank" rel="noopener noreferrer">
                    Open in Twitch
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
