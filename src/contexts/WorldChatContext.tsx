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
  const { user } = useAuth();
  const [messages, setMessages] = useState<WorldChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!user) {
      console.log('[WorldChat] No user authenticated, skipping message load');
      setMessages([]);
      setLoading(false);
      return;
    }

    console.log('[WorldChat] Loading messages for user:', user.id);
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

      console.log('[WorldChat] Fetched messages count:', data?.length || 0);

      const transformedData = (data || [])
        .slice()
        .reverse()
        .map(msg => ({
          ...msg,
          profiles: Array.isArray(msg.profiles) && msg.profiles.length > 0 
            ? msg.profiles[0] 
            : (msg.profiles as any) || { gamertag: 'Unknown User', avatar_url: null, wins: 0, losses: 0 }
        })) as WorldChatMessage[];

      console.log('[WorldChat] Transformed messages count:', transformedData.length);
      setMessages(transformedData);

      // Calculate unread count
      const storedTimestamp = localStorage.getItem('world-chat-last-read');
      if (storedTimestamp) {
        const unread = transformedData.filter(
          msg => msg.user_id !== user.id && new Date(msg.created_at) > new Date(storedTimestamp)
        ).length;
        setUnreadCount(unread);
        setLastReadTimestamp(storedTimestamp);
      }
    } catch (error) {
      console.error('[WorldChat] Error loading world chat messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      console.log('[WorldChat] useEffect: No user, skipping setup');
      return;
    }

    console.log('[WorldChat] useEffect: Setting up for user:', user.id);
    loadMessages();

    // Subscribe to real-time updates
    console.log('[WorldChat] Setting up real-time subscription');
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
          console.log('[WorldChat] Real-time INSERT received:', payload.new.id);
          
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

          setMessages((prev) => [...prev, newMessage]);

          // Increment unread count if message is from another user
          if (payload.new.user_id !== user.id) {
            setUnreadCount((prev) => prev + 1);
          }

          // Check for mentions
          const message = payload.new.message as string;
          const mentionRegex = /@(\w+)/g;
          const mentions = message.match(mentionRegex);
          
          if (mentions) {
            // Get current user's gamertag
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('gamertag')
              .eq('id', user.id)
              .single();

            if (currentProfile) {
              const isMentioned = mentions.some(
                mention => mention.toLowerCase() === `@${currentProfile.gamertag.toLowerCase()}`
              );

              if (isMentioned) {
                // Create notification for mention
                const senderProfile = profile || { gamertag: 'Someone' };
                await supabase
                  .from('notifications')
                  .insert({
                    user_id: user.id,
                    type: 'mention',
                    title: '💬 You were mentioned',
                    message: `${senderProfile.gamertag} mentioned you in World Chat`,
                    link: '/world-chat'
                  });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[WorldChat] Subscription status:', status);
      });

    return () => {
      console.log('[WorldChat] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [user, loadMessages]);

  const sendMessage = useCallback(async (message: string) => {
    if (!user || !message.trim()) {
      console.log('[WorldChat] Cannot send message - no user or empty message');
      return;
    }

    console.log('[WorldChat] Sending message:', message.substring(0, 50));

    const { error } = await supabase
      .from('world_chat_messages')
      .insert({
        user_id: user.id,
        message: message.trim()
      });

    if (error) {
      console.error('[WorldChat] Error sending message:', error);
      throw error;
    }

    console.log('[WorldChat] Message sent successfully');
  }, [user]);

  const markAsRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem('world-chat-last-read', now);
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
