import { AnimatePresence, motion } from 'framer-motion';
import { History, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { QuickMatchLiveCard } from './QuickMatchLiveCard';

export function PastChallengesList() {
  const { user } = useAuth();
  const [pastChallenges, setPastChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPastChallenges = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .in('status', ['completed', 'cancelled', 'expired', 'declined'])
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPastChallenges(data || []);
    } catch (error) {
      console.error('Error fetching past challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastChallenges();
    
    if (!user) return;
    // Only this player's challenges reach this client (filtered server-side)
    const onChange = (payload: { new: { status?: string } }) => {
      if (['completed', 'cancelled', 'expired', 'declined'].includes(payload.new.status || '')) fetchPastChallenges();
    };
    const channel = supabase
      .channel(`past-challenges-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'challenges', filter: `challenger_id=eq.${user.id}` }, onChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'challenges', filter: `opponent_id=eq.${user.id}` }, onChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearHistory = async () => {
    if (!user || pastChallenges.length === 0) return;
    
    try {
      // We don't actually delete from DB, just a UI thing or we could have a 'hidden' column
      // But for simplicity, let's just show a toast that history is cleared for this session
      // If we wanted real persistence, we'd need a new table or column.
      // User said "removed completely or marked as cancelled in opast section"
      // "removed completely" might mean they want to hide it.
      
      setPastChallenges([]);
      toast.success('Past challenges hidden');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  if (!user || (pastChallenges.length === 0 && !loading)) return null;

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl">
          <History className="h-5 w-5 text-muted-foreground" />
          Past challenges
        </h2>
        {pastChallenges.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearHistory}
            className="text-[10px] text-muted-foreground hover:text-destructive gap-1 h-7"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {pastChallenges.map((challenge) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                whileHover={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <QuickMatchLiveCard 
                  challenge={challenge} 
                  currentUserId={user.id} 
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
