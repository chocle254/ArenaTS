import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FriendRequestToast } from '@/components/FriendRequestToast';
import { supabase } from '@/db/supabase';
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
  const { user } = useAuth();
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
          .select('*, friend:profiles!friendships_friend_id_fkey (*)')
          .eq('user_id', user.id),
        supabase
          .from('friend_requests')
          .select('*, sender:profiles!friend_requests_sender_id_fkey (*)')
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
  }, [user]);

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
  }, [user]);

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
  }, [user]);

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
      read_at: null
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

      // Create a notification for the receiver
      supabase.from('notifications').insert({
        user_id: receiverId,
        type: 'direct_message',
        title: 'New Message',
        message: `You received a new message from ${user.user_metadata.gamertag || 'a user'}`,
        link: '/messages'
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
  }, [user, fetchConversations]);

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

  useEffect(() => {
    if (!user) return;

    fetchConversations();
    fetchSocialData();

    // Subscribe to real-time updates for DMs
    const dmChannel = supabase
      .channel('direct-messages-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages'
        },
        (payload) => {
          const newMessage = payload.new as DirectMessage;
          if (newMessage && (newMessage.sender_id === user.id || newMessage.receiver_id === user.id)) {
            // Update conversations list immediately in real-time
            setConversations(prev => {
              const newConversations = [...prev];
              const otherUserId = newMessage.sender_id === user.id ? newMessage.receiver_id : newMessage.sender_id;
              const index = newConversations.findIndex(c => c.other_user.id === otherUserId);
              
              if (index !== -1) {
                // Update existing conversation
                const conv = newConversations[index];
                const updatedConv = {
                  ...conv,
                  last_message: newMessage,
                  unread_count: (newMessage.receiver_id === user.id && !newMessage.read_at && activeChatUserIdRef.current !== otherUserId) 
                    ? conv.unread_count + 1 
                    : conv.unread_count
                };
                newConversations.splice(index, 1);
                return [updatedConv, ...newConversations];
              } else {
                // We might need to fetch the full list if it's a completely new friend
                // But for now, let's just trigger a refetch to be safe and get the profile
                fetchConversations();
                return prev;
              }
            });

            // Update unread total
            if (newMessage.receiver_id === user.id && !newMessage.read_at && activeChatUserIdRef.current !== newMessage.sender_id) {
              setUnreadTotal(prev => prev + 1);
              
              // Show a toast notification if not in the chat
              const senderId = newMessage.sender_id;
              supabase.from('profiles').select('gamertag, avatar_url').eq('id', senderId).single().then(({ data: sender }) => {
                if (sender) {
                  toast(`Message from ${sender.gamertag}`, {
                    description: newMessage.message.substring(0, 50) + (newMessage.message.length > 50 ? '...' : ''),
                    position: 'top-center',
                    icon: '💬'
                  });
                }
              });
            }
            
            // If the message is part of the active conversation, update it in real-time
            const currentOtherId = activeChatUserIdRef.current;
            if (currentOtherId && 
                ((newMessage.sender_id === user.id && newMessage.receiver_id === currentOtherId) ||
                 (newMessage.sender_id === currentOtherId && newMessage.receiver_id === user.id))) {
              
              setActiveConversation(prev => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                const filtered = prev.filter(m => !m.id.startsWith('temp-') || m.message !== newMessage.message);
                return [...filtered, newMessage];
              });

              // Mark as read immediately if we are in the chat
              if (newMessage.receiver_id === user.id) {
                markAsRead(currentOtherId);
              }
            }
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates for Social
    const socialChannel = supabase
      .channel('social-channel')
      // 1. Friend requests sent TO me (to show toasts and update lists)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRequest = payload.new as FriendRequest;
            // Fetch sender profile to show in toast
            const { data: sender } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newRequest.sender_id)
              .single();

            if (sender) {
              toast.custom((t) => (
                <FriendRequestToast
                  id={t as string}
                  senderName={sender.gamertag}
                  senderAvatar={sender.avatar_url}
                  onAccept={() => respondToFriendRequest(newRequest.id, 'accepted')}
                  onDecline={() => respondToFriendRequest(newRequest.id, 'declined')}
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
      // 2. Friend requests sent BY me (to update lists when they are accepted/declined)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${user.id}`
        },
        () => {
          fetchSocialData();
          fetchConversations();
        }
      )
      // 3. Direct friendship updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchSocialData();
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Refresh data when profiles change (e.g. last_seen_at)
          fetchSocialData();
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(socialChannel);
    };
  }, [user, fetchConversations, fetchSocialData]);

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
