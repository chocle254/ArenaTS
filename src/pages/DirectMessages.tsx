import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, MoreVertical, Paperclip, Search, Send, Smile, Swords, User, UserPlus } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SendChallengePanel } from '@/components/SendChallengePanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { supabase } from '@/db/supabase';
import { Profile } from '@/types/database';

export default function DirectMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');
  const { 
    conversations, 
    activeConversation, 
    sendMessage, 
    fetchMessages, 
    markAsRead, 
    friends, 
    loading, 
    setActiveChatUserId,
    unreadTotal,
    pendingRequests 
  } = useDirectMessages();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(targetUserId);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showChat, setShowChat] = useState(!!targetUserId);
  const [isSending, setIsSending] = useState(false);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (targetUserId) {
      setSelectedUserId(targetUserId);
      setShowChat(true);
    }
  }, [targetUserId]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      setActiveChatUserId(selectedUserId);
      fetchMessages(selectedUserId);
      markAsRead(selectedUserId);
      if (isMobileView) setShowChat(true);
    } else {
      setActiveChatUserId(null);
    }
  }, [selectedUserId, fetchMessages, markAsRead, isMobileView, setActiveChatUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation]);

  const handleSendMessage = async () => {
    if (!selectedUserId || !messageText.trim() || isSending) return;
    try {
      setIsSending(true);
      const currentText = messageText;
      setMessageText(''); // Clear input immediately for better UX
      await sendMessage(selectedUserId, currentText);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = React.useMemo(() => 
    conversations.filter((conv) =>
      conv.other_user.gamertag.toLowerCase().includes(searchQuery.toLowerCase())
    ), [conversations, searchQuery]
  );

  // Combine conversations and friends for the sidebar list
  const sidebarList = React.useMemo(() => {
    const listMap = new Map<string, { profile: Profile; lastMessage?: any; unreadCount: number }>();
    
    // Add all friends first
    friends.forEach(friend => {
      listMap.set(friend.id, { profile: friend, unreadCount: 0 });
    });
    
    // Add or update with conversation data
    conversations.forEach(conv => {
      listMap.set(conv.other_user.id, { 
        profile: conv.other_user, 
        lastMessage: conv.last_message, 
        unreadCount: conv.unread_count 
      });
    });
    
    return Array.from(listMap.values()).sort((a, b) => {
      const aOnline = a.profile.last_seen_at && new Date().getTime() - new Date(a.profile.last_seen_at).getTime() < 300000;
      const bOnline = b.profile.last_seen_at && new Date().getTime() - new Date(b.profile.last_seen_at).getTime() < 300000;
      
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    }).filter(item => 
      item.profile.gamertag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, conversations, searchQuery]);

  const [activeUser, setActiveUser] = useState<Profile | null>(null);

  useEffect(() => {
    const conv = conversations.find((c) => c.other_user.id === selectedUserId);
    if (conv) {
      setActiveUser(conv.other_user);
    } else if (selectedUserId) {
      // Fetch profile if not in conversations (new chat)
      const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', selectedUserId).maybeSingle();
        if (data) setActiveUser(data);
      };
      fetchProfile();
    } else {
      setActiveUser(null);
    }
  }, [selectedUserId, conversations]);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#080810] overflow-hidden border-t border-white/5">
      {/* Conversation List */}
      <div className={`w-full md:w-80 flex flex-col dm-sidebar border-r border-white/5 transition-all ${isMobileView && showChat ? 'hidden' : 'block'}`}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white font-rajdhani">Messages</h1>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 dm-search-bar h-10 border-none placeholder:text-[#64748b] focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {/* Friend Requests Shortcut in DM Sidebar */}
            {pendingRequests.length > 0 && (
              <button
                onClick={() => navigate('/friends')}
                className="w-full p-4 flex items-center gap-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left border-b border-white/5"
              >
                <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center relative">
                  <UserPlus className="h-6 w-6 text-primary" />
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white border-2 border-[#0f0f1a] animate-pulse">
                    {pendingRequests.length}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-primary">New Friend Requests</span>
                  <p className="text-[10px] text-muted-foreground">{pendingRequests.length} people want to be friends</p>
                </div>
              </button>
            )}

            {sidebarList.length > 0 ? (
              sidebarList.map((item) => {
                const isOnline = item.profile.last_seen_at && new Date().getTime() - new Date(item.profile.last_seen_at).getTime() < 300000;
                return (
                  <button
                    key={item.profile.id}
                    onClick={() => setSelectedUserId(item.profile.id)}
                    className={`dm-conversation-item flex items-center gap-3 text-left ${
                      selectedUserId === item.profile.id ? 'active' : ''
                    }`}
                  >
                    <div className="dm-avatar-container shrink-0">
                      <Avatar className="h-11 w-11 border-none bg-[#1a1a2e]">
                        <AvatarImage src={item.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#1a1a2e] text-[#64748b]">
                          {item.profile.gamertag[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`dm-status-dot ${isOnline ? 'dm-status-online' : 'dm-status-offline'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="dm-username truncate">{item.profile.gamertag}</span>
                        {item.lastMessage && (
                          <span className="dm-timestamp">
                            {format(new Date(item.lastMessage.created_at), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <p className="dm-preview-text line-clamp-1 flex-1">
                          {item.lastMessage ? (
                            <span className="flex items-center gap-1">
                              {item.lastMessage.sender_id === user?.id && <span className="text-[10px] font-bold text-[#7c3aed]/70">YOU:</span>}
                              {item.lastMessage.message}
                            </span>
                          ) : (
                            <span className="italic">No messages yet</span>
                          )}
                        </p>
                        {item.unreadCount > 0 && (
                          <div className="h-2 w-2 bg-[#7c3aed] rounded-full ml-2 shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-[#64748b] font-inter text-sm">
                <p>No connections found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col bg-[#080810] transition-all ${isMobileView && !showChat ? 'hidden' : 'flex'}`}>
        {selectedUserId && activeUser ? (
          <>
            {/* Header */}
            <div className="dm-chat-header flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3">
                {isMobileView && (
                  <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="text-[#64748b] -ml-2">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <div className="relative">
                  <Avatar className="h-10 w-10 border-none bg-[#1a1a2e]">
                    <AvatarImage src={activeUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#1a1a2e] text-[#64748b]">
                      {activeUser.gamertag[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`dm-status-dot h-2.5 w-2.5 border-[#0f0f1a] ${
                    activeUser.last_seen_at && new Date().getTime() - new Date(activeUser.last_seen_at).getTime() < 300000 
                      ? 'dm-status-online' 
                      : 'dm-status-offline'
                  }`} />
                </div>
                <div>
                  <h2 className="dm-header-username leading-none">{activeUser.gamertag}</h2>
                  <p className={`text-[12px] mt-1 font-medium ${
                    activeUser.last_seen_at && new Date().getTime() - new Date(activeUser.last_seen_at).getTime() < 300000 
                      ? 'text-[#22c55e]' 
                      : 'text-[#64748b]'
                  }`}>
                    {activeUser.last_seen_at && new Date().getTime() - new Date(activeUser.last_seen_at).getTime() < 300000 
                      ? 'Online' 
                      : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  className="dm-challenge-btn uppercase"
                  onClick={() => setChallengeModalOpen(true)}
                >
                  Challenge
                </button>
                <Button variant="ghost" size="icon" className="text-[#64748b] hover:text-white" onClick={() => {}}>
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 dm-chat-area">
              <div ref={scrollRef} className="flex flex-col gap-4 min-h-full p-6">
                {activeConversation.map((msg, index) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showAvatar = !isOwn && (index === 0 || activeConversation[index-1].sender_id !== msg.sender_id);
                  
                  return (
                    <div key={msg.id} className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} items-start gap-3`}>
                      {!isOwn && (
                        <div className="w-8 flex-shrink-0">
                          {showAvatar ? (
                            <Avatar className="h-8 w-8 border-none bg-[#1a1a2e]">
                              <AvatarImage src={activeUser.avatar_url || undefined} />
                              <AvatarFallback>{activeUser.gamertag[0]}</AvatarFallback>
                            </Avatar>
                          ) : <div className="w-8" />}
                        </div>
                      )}
                      <div className={`flex flex-col min-w-0 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} gap-1.5`}>
                        <div className={isOwn ? 'dm-bubble-sent' : 'dm-bubble-received'}>
                          {msg.message}
                        </div>
                        <p className="dm-timestamp mx-1">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="dm-input-container">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-[#64748b] hover:text-[#a855f7] shrink-0" onClick={() => {}}>
                  <Smile className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-[#64748b] hover:text-[#a855f7] shrink-0" onClick={() => {}}>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  className="flex-1 dm-input-field h-11 border-none focus-visible:ring-0 shadow-none placeholder:text-[#64748b]"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  size="icon" 
                  className={`dm-send-btn shrink-0 ${(!messageText.trim() || isSending) ? 'opacity-50' : ''}`}
                  disabled={!messageText.trim() || isSending}
                  onClick={handleSendMessage}
                >
                  <Send className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="h-20 w-20 bg-secondary-background rounded-full flex items-center justify-center mb-4">
              <Send className="h-10 w-10 opacity-20" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Your Messages</h3>
            <p className="max-w-xs text-center text-sm mt-2">
              Select a conversation from the left to start chatting with other players.
            </p>
          </div>
        )}
      </div>

      {activeUser && (
        <SendChallengePanel
          open={challengeModalOpen}
          onOpenChange={setChallengeModalOpen}
          opponent={{
            ...activeUser,
            user_id: activeUser.id
          }}
        />
      )}
    </div>
  );
}
