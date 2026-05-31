import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

export function useHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error updating last seen:', error);
      }
    };

    // Initial update
    updateLastSeen();

    // Set up interval for heartbeat every 2 minutes
    const interval = setInterval(updateLastSeen, 120000);

    return () => clearInterval(interval);
  }, [user]);
}
