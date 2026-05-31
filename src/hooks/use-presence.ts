import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update last_seen_at immediately
    const updatePresence = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating presence:', error);
      }
    };

    updatePresence();

    // Set up interval to update presence every 2 minutes
    const interval = setInterval(updatePresence, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);
}
