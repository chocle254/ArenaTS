import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from './AuthContext';

interface WorldChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
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
  };
}

interface WorldChatContextType {
  messages: WorldChatMessage[];
  unreadCount: number;
  loading: boolean;
  sendMessage: (message: string) => Promise<void>;
  markAsRead: () => void;
  refreshMessages: () => Promise<void>;
}

const WorldChatContext = createContext<WorldChatContextType | undefined>(undefined);

export function WorldChatProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const myGamertagRef = React.useRef<string | null>(null);
  myGamertagRef.current = profile?.gamertag ?? null;
  const [messages, setMessages] = useState<WorldChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(null);

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
        .select(`
          id,
          user_id,
          message,
          created_at,
          profiles!world_chat_messages_user_id_fkey (
            id,
            gamertag,
            avatar_url,
            location,
            tier,
            favorite_games,
            wins,
            losses,
            win_rate,
            global_rank
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[WorldChat] Error fetching messages:', error);
        throw error;
      }


      const transformedData = (data || [])
        .slice()
        .reverse()
        .map(msg => ({
          ...msg,
          profiles: Array.isArray(msg.profiles) && msg.profiles.length > 0 
            ? msg.profiles[0] 
            : (msg.profiles as any) || { gamertag: 'Unknown User', avatar_url: null, wins: 0, losses: 0 }
        })) as WorldChatMessage[];

      setMessages(transformedData);

      // Calculate unread count
      let storedTimestamp: string | null = null;
      try {
        storedTimestamp = localStorage.getItem('world-chat-last-read');
      } catch {
        /* storage unavailable */
      }
      if (storedTimestamp) {
        const unread = transformedData.filter(
          msg => msg.user_id !== userId && new Date(msg.created_at) > new Date(storedTimestamp)
        ).length;
        setUnreadCount(unread);
        setLastReadTimestamp(storedTimestamp);
      }
    } catch (error) {
      console.error('[WorldChat] Error loading world chat messages:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('world-chat-global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'world_chat_messages'
        },
        async (payload) => {
          // Fetch the user profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, gamertag, avatar_url, location, tier, favorite_games, wins, losses, win_rate, global_rank')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            message: payload.new.message,
            created_at: payload.new.created_at,
            profiles: profile || { 
              id: payload.new.user_id,
              gamertag: 'Unknown User', 
              avatar_url: null, 
              location: 'Unknown',
              tier: 'Bronze',
              favorite_games: [],
              wins: 0, 
              losses: 0,
              win_rate: 0,
              global_rank: 0
            }
          } as WorldChatMessage;

          // Cap the in-memory list so long sessions don't grow without bound
          setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage].slice(-300)));

          // Increment unread count if message is from another user
          if (payload.new.user_id !== userId) {
            setUnreadCount((prev) => prev + 1);
          }

          // Check for mentions
          const message = payload.new.message as string;
          const mentionRegex = /@(\w+)/g;
          const mentions = message.match(mentionRegex);
          
          const myTag = myGamertagRef.current?.toLowerCase();
          if (mentions && myTag && payload.new.user_id !== userId) {
            const isMentioned = mentions.some((mention) => mention.toLowerCase() === `@${myTag}`);
            if (isMentioned) {
              const senderProfile = profile || { gamertag: 'Someone' };
              await supabase.from('notifications').insert({
                user_id: userId,
                type: 'mention',
                title: '💬 You were mentioned',
                message: `${senderProfile.gamertag} mentioned you in World Chat`,
                link: '/world-chat'
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadMessages]);

  const sendMessage = useCallback(async (message: string) => {
    if (!user || !message.trim()) {
      return;
    }

    const { data, error } = await supabase
      .from('world_chat_messages')
      .insert({
        user_id: user.id,
        message: message.trim()
      })
      .select('id, user_id, message, created_at')
      .single();

    if (error) {
      console.error('[WorldChat] Error sending message:', error);
      throw error;
    }

    // Show it immediately; the realtime echo is de-duplicated by id.
    if (data) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id)
          ? prev
          : [
              ...prev,
              {
                ...(data as Omit<WorldChatMessage, 'profiles'>),
                profiles: {
                  id: user.id,
                  gamertag: profile?.gamertag || 'You',
                  avatar_url: profile?.avatar_url ?? null,
                  wins: profile?.wins ?? 0,
                  losses: profile?.losses ?? 0,
                },
              },
            ].slice(-300),
      );
    }
  }, [user, profile?.gamertag, profile?.avatar_url, profile?.wins, profile?.losses]);

  const markAsRead = useCallback(() => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem('world-chat-last-read', now);
    } catch {
      /* storage unavailable */
    }
    setLastReadTimestamp(now);
    setUnreadCount(0);
  }, []);

  const refreshMessages = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

  return (
    <WorldChatContext.Provider
      value={{
        messages,
        unreadCount,
        loading,
        sendMessage,
        markAsRead,
        refreshMessages
      }}
    >
      {children}
    </WorldChatContext.Provider>
  );
}

export function useWorldChat() {
  const context = useContext(WorldChatContext);
  if (context === undefined) {
    throw new Error('useWorldChat must be used within a WorldChatProvider');
  }
  return context;
}
