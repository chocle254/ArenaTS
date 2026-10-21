import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FriendRequestToast } from '@/components/FriendRequestToast';
import { supabase } from '@/db/supabase';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/profile-columns';
import { buzz } from '@/lib/utils';
import { DirectMessage, FriendRequest, Friendship, Profile } from '@/types/database';
import { useAuth } from './AuthContext';

interface Conversation {
  other_user: Profile;
  last_message: DirectMessage;
  unread_count: number;
}

interface DirectMessageContextType {
  conversations: Conversation[];
  activeConversation: DirectMessage[];
  unreadTotal: number;
  loading: boolean;
  friends: Profile[];
  pendingRequests: FriendRequest[];
  sendMessage: (receiverId: string, message: string, imageUrl?: string) => Promise<void>;
  markAsRead: (senderId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (otherUserId: string) => Promise<void>;
  fetchSocialData: () => Promise<void>;
  sendFriendRequest: (receiverId: string) => Promise<void>;
  respondToFriendRequest: (requestId: string, status: 'accepted' | 'declined') => Promise<void>;
  setActiveChatUserId: (userId: string | null) => void;
  subscribeToSocial: () => void;
}

const DirectMessageContext = createContext<DirectMessageContextType | undefined>(undefined);

export function DirectMessageProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<DirectMessage[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const activeChatUserIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    activeChatUserIdRef.current = activeChatUserId;
  }, [activeChatUserId]);

  const fetchSocialData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch friendships and pending requests in parallel
      const [
        { data: friendData, error: friendError },
        { data: requestData, error: requestError },
      ] = await Promise.all([
        supabase
          .from('friendships')
          .select(`*, friend:profiles!friendships_friend_id_fkey (${PUBLIC_PROFILE_COLUMNS})`)
          .eq('user_id', user.id),
        supabase
          .from('friend_requests')
          .select(`*, sender:profiles!friend_requests_sender_id_fkey (${PUBLIC_PROFILE_COLUMNS})`)
          .eq('receiver_id', user.id)
          .eq('status', 'pending'),
      ]);

      if (friendError) throw friendError;
      if (requestError) throw requestError;

      setFriends(friendData?.map(f => f.friend) || []);
      setPendingRequests(requestData || []);
    } catch (error) {
      console.error('Error fetching social data:', error);
    }
  }, [userId]);

  const sendFriendRequest = useCallback(async (receiverId: string) => {
    if (!user) return;

    if (user.id === receiverId) {
      toast.error("You cannot add yourself as a friend");
      return;
    }

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Friend request already sent or users are already friends');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Friend request sent!');
      fetchSocialData();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    }
  }, [user, fetchSocialData]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // This is a complex query to get unique conversations with last message and unread count
      // For simplicity in this demo environment, we'll fetch all DMs and process them
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey (id, gamertag, avatar_url, last_seen_at),
          receiver:profiles!direct_messages_receiver_id_fkey (id, gamertag, avatar_url, last_seen_at)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const dms = data as (DirectMessage & { sender: Profile; receiver: Profile })[];
      const conversationMap = new Map<string, Conversation>();
      let totalUnread = 0;

      dms.forEach((dm) => {
        const otherUser = dm.sender_id === user.id ? dm.receiver : dm.sender;
        if (!otherUser) return;

        if (!conversationMap.has(otherUser.id)) {
          conversationMap.set(otherUser.id, {
            other_user: otherUser,
            last_message: dm,
            unread_count: 0
          });
        }

        if (dm.receiver_id === user.id && !dm.read_at) {
          totalUnread++;
          const conv = conversationMap.get(otherUser.id)!;
          conv.unread_count++;
        }
      });

      setConversations(Array.from(conversationMap.values()));
      setUnreadTotal(totalUnread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchMessages = useCallback(async (otherUserId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey (id, gamertag, avatar_url),
          receiver:profiles!direct_messages_receiver_id_fkey (id, gamertag, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActiveConversation((data || []).reverse());
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [userId]);

  const sendMessage = useCallback(async (receiverId: string, message: string, imageUrl?: string) => {
    if (!user) return;

    // Create optimistic message
    const optimisticMessage: DirectMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: receiverId,
      message,
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
      read_at: null,
      parent_message_id: null
    };

    // Update active conversation immediately
    setActiveConversation(prev => [...prev, optimisticMessage]);

    // Update conversations list immediately (optimistic last message)
    setConversations(prev => {
      const newConversations = [...prev];
      const index = newConversations.findIndex(c => c.other_user.id === receiverId);
      if (index !== -1) {
        const updatedConversation = {
          ...newConversations[index],
          last_message: optimisticMessage
        };
        newConversations.splice(index, 1);
        return [updatedConversation, ...newConversations];
      } else {
        // Find friend profile to add new conversation
        const friend = friends.find(f => f.id === receiverId);
        if (friend) {
          return [{
            other_user: friend,
            last_message: optimisticMessage,
            unread_count: 0
          }, ...prev];
        }
      }
      return newConversations;
    });

    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message,
          image_url: imageUrl || null
        });

      if (error) throw error;

      // Create a notification for the receiver. (Previously this query was
      // built but never awaited, so it never actually ran.)
      void supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'direct_message',
          title: 'New Message',
          message: `You received a new message from ${profile?.gamertag || user.user_metadata?.gamertag || 'a player'}`,
          link: '/messages'
        })
        .then(({ error: notifError }) => {
          if (notifError) console.error('Error creating DM notification:', notifError);
        });

      // No need to refetch everything immediately, real-time will handle the replacement of temp message if we handle it correctly
      // But for now, let's just trigger a conversation fetch to sync up
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Rollback optimistic update
      setActiveConversation(prev => prev.filter(m => m.id !== optimisticMessage.id));
      fetchConversations();
    }
  }, [user, profile?.gamertag, friends, fetchConversations]);

  const markAsRead = useCallback(async (senderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      fetchConversations();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user, fetchConversations]);

  const respondToFriendRequest = useCallback(async (requestId: string, status: 'accepted' | 'declined') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      if (status === 'accepted') {
        toast.success('Friend request accepted!');
      } else {
        toast.info('Friend request declined');
      }
      
      fetchSocialData();
      fetchConversations();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast.error('Failed to respond to friend request');
    }
  }, [user, fetchSocialData, fetchConversations]);

  // Keep the latest callbacks in refs so realtime handlers never go stale and
  // the subscription effect only re-runs when the signed-in user changes.
  const markAsReadRef = React.useRef(markAsRead);
  markAsReadRef.current = markAsRead;
  const respondRef = React.useRef(respondToFriendRequest);
  respondRef.current = respondToFriendRequest;

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setActiveConversation([]);
      setUnreadTotal(0);
      setFriends([]);
      setPendingRequests([]);
      return;
    }

    fetchConversations();
    fetchSocialData();

    const handleDmChange = (payload: { eventType: string; new: unknown }) => {
      const newMessage = payload.new as DirectMessage;
      if (!newMessage || !newMessage.id) return;
      if (newMessage.sender_id !== userId && newMessage.receiver_id !== userId) return;

      const otherUserId = newMessage.sender_id === userId ? newMessage.receiver_id : newMessage.sender_id;
      const isIncomingUnread =
        payload.eventType === 'INSERT' &&
        newMessage.receiver_id === userId &&
        !newMessage.read_at &&
        activeChatUserIdRef.current !== otherUserId;

      if (payload.eventType === 'UPDATE') {
        // Read receipts: update the message in place, don't reorder anything.
        setActiveConversation((prev) => prev.map((m) => (m.id === newMessage.id ? { ...m, ...newMessage } : m)));
        return;
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.other_user.id === otherUserId);
        if (index === -1) {
          // New conversation partner: refetch to get their profile.
          fetchConversations();
          return prev;
        }
        const conv = prev[index];
        const updated = {
          ...conv,
          last_message: newMessage,
          unread_count: isIncomingUnread ? conv.unread_count + 1 : conv.unread_count,
        };
        return [updated, ...prev.slice(0, index), ...prev.slice(index + 1)];
      });

      if (isIncomingUnread) {
        setUnreadTotal((prev) => prev + 1);
        supabase
          .from('profiles')
          .select('gamertag')
          .eq('id', newMessage.sender_id)
          .maybeSingle()
          .then(({ data: sender }) => {
            if (!sender) return;
            const text = newMessage.message || '';
            toast(`Message from ${sender.gamertag}`, {
              description: text.substring(0, 50) + (text.length > 50 ? '…' : ''),
              position: 'top-center',
              icon: '💬',
            });
            try {
              buzz(30);
            } catch {
              /* not supported */
            }
          });
      }

      const currentOtherId = activeChatUserIdRef.current;
      if (currentOtherId && otherUserId === currentOtherId) {
        setActiveConversation((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          const filtered = prev.filter((m) => !m.id.startsWith('temp-') || m.message !== newMessage.message);
          return [...filtered, newMessage];
        });
        if (newMessage.receiver_id === userId) {
          markAsReadRef.current(currentOtherId);
        }
      }
    };

    // Only receive DM events that involve this user.
    const dmChannel = supabase
      .channel(`direct-messages-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${userId}` }, handleDmChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${userId}` }, handleDmChange)
      .subscribe();

    const socialChannel = supabase
      .channel(`social-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRequest = payload.new as FriendRequest;
            const { data: sender } = await supabase
              .from('profiles')
              .select('gamertag, avatar_url')
              .eq('id', newRequest.sender_id)
              .maybeSingle();

            if (sender) {
              toast.custom((t) => (
                <FriendRequestToast
                  id={t as string}
                  senderName={sender.gamertag}
                  senderAvatar={sender.avatar_url}
                  onAccept={() => respondRef.current(newRequest.id, 'accepted')}
                  onDecline={() => respondRef.current(newRequest.id, 'declined')}
                />
              ), {
                duration: 10000,
                position: 'bottom-right'
              });
            }
          }
          fetchSocialData();
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${userId}` },
        () => {
          fetchSocialData();
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${userId}` },
        () => {
          fetchSocialData();
          fetchConversations();
        }
      )
      .subscribe();

    // Friends' online status (last_seen_at) is refreshed on a gentle interval
    // while the tab is visible. Previously every client re-fetched friends and
    // 200 DMs on *any* profile update platform-wide, i.e. on every heartbeat.
    const presenceTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchSocialData();
    }, 60_000);

    return () => {
      window.clearInterval(presenceTimer);
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(socialChannel);
    };
  }, [userId, fetchConversations, fetchSocialData]);

  return (
    <DirectMessageContext.Provider
      value={{
        conversations,
        activeConversation,
        unreadTotal,
        loading,
        friends,
        pendingRequests,
        sendMessage,
        markAsRead,
        fetchConversations,
        fetchMessages,
        fetchSocialData,
        sendFriendRequest,
        respondToFriendRequest,
        setActiveChatUserId,
        subscribeToSocial: () => {}
      }}
    >
      {children}
    </DirectMessageContext.Provider>
  );
}

export function useDirectMessages() {
  const context = useContext(DirectMessageContext);
  if (context === undefined) {
    throw new Error('useDirectMessages must be used within a DirectMessageProvider');
  }
  return context;
}
