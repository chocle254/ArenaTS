import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/db/supabase';

/**
 * "online" and "typing…" for a private chat, over a realtime channel shared by
 * the two players (nothing is stored). Online here means the partner has this
 * chat or the app open in the foreground.
 */
export function useDmPresence(me: string | undefined, partner: string | undefined) {
  const [partnerHere, setPartnerHere] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const typingTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!me || !partner) return;
    const name = `dm-presence:${[me, partner].sort().join(':')}`;
    const channel = supabase.channel(name, { config: { presence: { key: me } } });
    channelRef.current = channel;

    const sync = () => {
      const state = channel.presenceState() as Record<string, { visible?: boolean }[]>;
      setPartnerHere(!!state[partner]?.some((p) => p.visible !== false));
    };

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.from !== partner) return;
        setPartnerTyping(!!payload.typing);
        window.clearTimeout(typingTimer.current);
        // Stop showing it if no update arrives (closed tab, lost connection)
        if (payload.typing) typingTimer.current = window.setTimeout(() => setPartnerTyping(false), 5000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ visible: document.visibilityState === 'visible' });
      });

    const onVisibility = () => {
      channel.track({ visible: document.visibilityState === 'visible' });
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(typingTimer.current);
      channelRef.current = null;
      setPartnerHere(false);
      setPartnerTyping(false);
      supabase.removeChannel(channel);
    };
  }, [me, partner]);

  /** Call on every keystroke; sends at most one "typing" every 2.5 s, and "stopped" when the draft empties or is sent. */
  const setTyping = useCallback(
    (typing: boolean) => {
      const ch = channelRef.current;
      if (!ch || !me) return;
      const now = Date.now();
      if (typing && now - lastSent.current < 2500) return;
      lastSent.current = typing ? now : 0;
      ch.send({ type: 'broadcast', event: 'typing', payload: { from: me, typing } });
    },
    [me],
  );

  return { partnerHere, partnerTyping, setTyping };
}
