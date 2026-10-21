import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from './AuthContext';

type ChatProfile = {
  id: string;
  gamertag: string;
  avatar_url: string | null;
  location?: string;
  tier?: string;
  favorite_games?: string[];
  wins: number;
  losses: number;
  win_rate?: number;
  global_rank?: number;
  tournaments_played?: number;
};

interface WorldChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: ChatProfile;
}

interface WorldChatContextType {
  messages: WorldChatMessage[];
  unreadCount: number;
  loading: boolean;
  sendMessage: (message: string) => Promise<void>;
  markAsRead: () => void;
  refreshMessages: () => Promise<void>;
  /**
   * Call while the World Chat screen is open. Returns a release function.
   * Messages stream in live only while at least one screen holds this.
   */
  goLive: () => () => void;
}

const WorldChatContext = createContext<WorldChatContextType | undefined>(undefined);

const PROFILE_COLUMNS = 'id, gamertag, avatar_url, location, tier, favorite_games, wins, losses, win_rate, global_rank, tournaments_played';
const LAST_READ_KEY = 'world-chat-last-read';
const UNREAD_POLL_MS = 60_000;

const readLastRead = () => {
  try {
    return localStorage.getItem(LAST_READ_KEY);
  } catch {
    return null;
  }
};

/**
 * World Chat at scale:
 * - The live subscription only exists while someone has the chat open. On
 *   every other screen the unread badge is a single cheap count query per
 *   minute, so a message no longer fans out to every signed-in player.
 * - Sender profiles are cached, so an incoming message doesn't trigger a
 *   profile lookup on every connected client.
 * - @mention notifications are created by the sender, so mentioned players
 *   are notified even when they're offline.
 */
export function WorldChatProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const [messages, setMessages] = useState<WorldChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liveHolders, setLiveHolders] = useState(0);
  const profileCache = useRef(new Map<string, ChatProfile>());
  const pendingProfiles = useRef(new Map<string, Promise<ChatProfile | null>>());

  const profileFor = useCallback(async (id: string): Promise<ChatProfile | null> => {
    const known = profileCache.current.get(id);
    if (known) return known;
    const pending = pendingProfiles.current.get(id);
    if (pending) return pending;
    const p = Promise.resolve(supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle()).then(({ data }) => {
      pendingProfiles.current.delete(id);
      if (data) profileCache.current.set(id, data as ChatProfile);
      return (data as ChatProfile | null) ?? null;
    });
    pendingProfiles.current.set(id, p);
    return p;
  }, []);

  const loadMessages = useCallback(async () => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('world_chat_messages')
        .select(`id, user_id, message, created_at, profiles!world_chat_messages_user_id_fkey (${PROFILE_COLUMNS})`)
        .order('created_at', { ascending: false })
        .limit(150);
      if (error) throw error;

      const rows = (data || [])
        .slice()
        .reverse()
        .map((msg) => {
          const p = (Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles) as ChatProfile | undefined;
          if (p?.id) profileCache.current.set(p.id, p);
          return { ...msg, profiles: p || { id: msg.user_id, gamertag: 'Player', avatar_url: null, wins: 0, losses: 0 } } as WorldChatMessage;
        });
      setMessages(rows);
    } catch (error) {
      console.error('[WorldChat] Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Unread badge without a live subscription: one count query a minute while the tab is visible
  const refreshUnread = useCallback(async () => {
    if (!userId || document.visibilityState !== 'visible') return;
    const since = readLastRead() || new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { count } = await supabase
      .from('world_chat_messages')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', since)
      .neq('user_id', userId);
    if (typeof count === 'number') setUnreadCount(count);
  }, [userId]);

  const live = liveHolders > 0;

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }
    if (!live) {
      refreshUnread();
      const t = setInterval(refreshUnread, UNREAD_POLL_MS);
      document.addEventListener('visibilitychange', refreshUnread);
      return () => {
        clearInterval(t);
        document.removeEventListener('visibilitychange', refreshUnread);
      };
    }

    // Live: fresh history, then stream new messages
    loadMessages();
    const channel = supabase
      .channel('world-chat-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'world_chat_messages' }, async (payload) => {
        const row = payload.new as { id: string; user_id: string; message: string; created_at: string };
        const p = await profileFor(row.user_id);
        const msg: WorldChatMessage = {
          ...row,
          profiles: p || { id: row.user_id, gamertag: 'Player', avatar_url: null, wins: 0, losses: 0 },
        };
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg].slice(-300)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, live, loadMessages, profileFor, refreshUnread]);

  const goLive = useCallback(() => {
    setLiveHolders((n) => n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setLiveHolders((n) => Math.max(0, n - 1));
    };
  }, []);

  const notifyMentions = useCallback(
    async (text: string) => {
      if (!userId) return;
      const tags = [...new Set((text.match(/@(\w+)/g) || []).map((m) => m.slice(1)))].slice(0, 5);
      if (!tags.length) return;
      const { data } = await supabase.from('profiles').select('id, gamertag').in('gamertag', tags);
      const targets = (data || []).filter((p) => p.id !== userId);
      if (!targets.length) return;
      const from = profile?.gamertag || 'A player';
      await Promise.all(
        targets.map((t) =>
          supabase.rpc('notify_player', {
            p_user_id: t.id,
            p_type: 'mention',
            p_title: 'mentioned you',
            p_message: `${from} mentioned you in World Chat: “${text.slice(0, 80)}${text.length > 80 ? '…' : ''}”`,
            p_link: '/world-chat',
          }),
        ),
      );
    },
    [userId, profile?.gamertag],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const body = message.trim();
      if (!user || !body) return;
      const { data, error } = await supabase
        .from('world_chat_messages')
        .insert({ user_id: user.id, message: body })
        .select('id, user_id, message, created_at')
        .single();
      if (error) {
        console.error('[WorldChat] Error sending message:', error);
        throw error;
      }
      // Show it immediately; the realtime echo is de-duplicated by id.
      if (data) {
        const me: ChatProfile = {
          id: user.id,
          gamertag: profile?.gamertag || 'You',
          avatar_url: profile?.avatar_url ?? null,
          wins: profile?.wins ?? 0,
          losses: profile?.losses ?? 0,
          tournaments_played: profile?.tournaments_played ?? 0,
        };
        profileCache.current.set(user.id, me);
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, { ...(data as Omit<WorldChatMessage, 'profiles'>), profiles: me }].slice(-300)));
      }
      notifyMentions(body).catch((e) => console.error('[WorldChat] Mention notification failed:', e));
    },
    [user, profile?.gamertag, profile?.avatar_url, profile?.wins, profile?.losses, profile?.tournaments_played, notifyMentions],
  );

  const markAsRead = useCallback(() => {
    try {
      localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
    } catch {
      /* storage unavailable */
    }
    setUnreadCount(0);
  }, []);

  const refreshMessages = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

  return (
    <WorldChatContext.Provider value={{ messages, unreadCount, loading, sendMessage, markAsRead, refreshMessages, goLive }}>{children}</WorldChatContext.Provider>
  );
}

export function useWorldChat() {
  const context = useContext(WorldChatContext);
  if (context === undefined) {
    throw new Error('useWorldChat must be used within a WorldChatProvider');
  }
  return context;
}
