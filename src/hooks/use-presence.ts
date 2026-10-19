import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

const HEARTBEAT_MS = 2 * 60 * 1000;

/**
 * Single app-wide presence heartbeat: updates profiles.last_seen_at every two
 * minutes while the tab is visible, and immediately when the player returns
 * to the tab. (Previously two separate hooks wrote the same column.)
 */
export function usePresence() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    let lastSent = 0;
    const updatePresence = async (force = false) => {
      if (document.visibilityState !== 'visible') return;
      if (!force && Date.now() - lastSent < HEARTBEAT_MS - 5000) return;
      lastSent = Date.now();
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) console.error('Error updating presence:', error);
    };

    updatePresence(true);
    const interval = window.setInterval(() => updatePresence(), HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') updatePresence();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);
}
