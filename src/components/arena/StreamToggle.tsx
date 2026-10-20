import { Loader2, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { invalidateLiveMatches } from '@/hooks/use-live-streams';
import { twitchLogin } from '@/lib/twitch';
import { cn } from '@/lib/utils';

/**
 * "Stream this match" for a player in a live quick match or tournament match.
 * When on, the match shows on the Streams page with the player's Twitch.
 */
export function StreamToggle({ challengeId, matchResultId, className }: { challengeId?: string | null; matchResultId?: string | null; className?: string }) {
  const { user, profile } = useAuth();
  const login = twitchLogin((profile as { twitch_handle?: string | null } | null)?.twitch_handle);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || (!challengeId && !matchResultId)) return;
    let q = supabase.from('match_streams').select('id').eq('user_id', user.id);
    q = challengeId ? q.eq('challenge_id', challengeId) : q.eq('match_result_id', matchResultId!);
    q.maybeSingle().then(({ data }) => setOn(!!data));
  }, [user, challengeId, matchResultId]);

  const toggle = async (next: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc('set_match_streaming', { p_challenge: challengeId ?? null, p_match: matchResultId ?? null, p_on: next });
    setBusy(false);
    if (error) return void toast.error(error.message);
    setOn(next);
    invalidateLiveMatches();
    toast.success(next ? 'Your match is on the Streams page' : 'Removed from the Streams page');
  };

  if (!user) return null;

  return (
    <div className={cn('rounded-xl border p-3', on ? 'border-live/50 bg-live/10' : 'border-border bg-background/40', className)}>
      <div className="flex items-center gap-3">
        <Radio className={cn('h-5 w-5 shrink-0', on ? 'text-live' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Stream this match</p>
          <p className="truncate text-xs text-muted-foreground">
            {login ? (on ? `Live as twitch.tv/${login}` : 'Go live on Twitch and let people watch') : 'Add your Twitch in Settings to stream'}
          </p>
        </div>
        {login ? (
          busy ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Switch checked={on} onCheckedChange={toggle} aria-label="Stream this match on Twitch" />
        ) : (
          <Link to="/settings" className="shrink-0 text-sm font-semibold text-primary-soft hover:underline">
            Add Twitch
          </Link>
        )}
      </div>
    </div>
  );
}
