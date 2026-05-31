import { Check, ExternalLink, Globe, MapPin, MessageCircle, Send, Smile, Trophy, User as UserIcon, UserPlus } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { useWorldChat } from '@/contexts/WorldChatContext';
import { supabase } from '@/db/supabase';
import { Profile } from '@/types/database';

const CUSTOM_EMOJIS = ['🔥', '🎮', '🏆', '💪', '🚀', '⭐', '💀', '💯', '👾', '👑'];

const getRankColor = (wins: number) => {
  if (wins >= 100) return 'text-amber-400';
  if (wins >= 50) return 'text-purple-400';
  if (wins >= 20) return 'text-blue-400';
  return 'text-green-400';
};

const getRankTitle = (wins: number) => {
  if (wins >= 100) return 'Legend';
  if (wins >= 50) return 'Elite';
  if (wins >= 20) return 'Pro';
  return 'Rookie';
};

export function WorldChat() {
  const { user } = useAuth();
  const { messages, loading, sendMessage: sendChatMessage, markAsRead } = useWorldChat();
  const { sendFriendRequest, friends, pendingRequests } = useDirectMessages();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{ id: string; gamertag: string }>>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mark messages as read when component mounts
    if (user) {
      markAsRead();
    }
  }, [user, markAsRead]);

  useEffect(() => {
    // Close profile dialog when navigating away from world chat
    if (location.pathname !== '/world-chat' && selectedProfile) {
      setSelectedProfile(null);
    }
  }, [location.pathname, selectedProfile]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    // Handle @mention autocomplete
    const lastAtIndex = message.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === message.length - 1) {
      // Just typed @
      setShowMentionSuggestions(true);
      setMentionSearch('');
      loadMentionSuggestions('');
    } else if (lastAtIndex !== -1) {
      const afterAt = message.substring(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setShowMentionSuggestions(true);
        setMentionSearch(afterAt);
        loadMentionSuggestions(afterAt);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  }, [message]);

  const loadMentionSuggestions = async (search: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('profiles')
        .select('id, gamertag')
        .neq('id', user.id)
        .limit(5);

      if (search) {
        query = query.ilike('gamertag', `${search}%`);
      }

      const { data } = await query;
      setMentionSuggestions(data || []);
    } catch (error) {
      console.error('Error loading mention suggestions:', error);
    }
  };

  const insertMention = (gamertag: string) => {
    const lastAtIndex = message.lastIndexOf('@');
    const beforeAt = message.substring(0, lastAtIndex);
    setMessage(`${beforeAt}@${gamertag} `);
    setShowMentionSuggestions(false);
  };

  const handleSendMessage = async () => {
    if (!user || !message.trim()) return;

    setSending(true);
    try {
      await sendChatMessage(message);
      setMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (text: string) => {
    // Highlight @mentions
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-primary font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (!user) {
    return (
      <Card className="backdrop-blur-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            World Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Sign in to join the conversation</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-card border-border overflow-hidden flex flex-col h-[500px] md:h-[calc(100vh-280px)] min-h-[500px]">
      <CardHeader className="flex-shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary animate-pulse" />
            <span className="font-display tracking-tight">World Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Live</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
        {/* Chat Messages with Background */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <img 
            src="https://miaoda-site-img.s3cdn.medo.dev/images/KLing_9b9cb9e2-41d5-4700-89bc-a0ed1a0fc2a4.jpg" 
            alt="Background" 
            className="w-full h-full object-cover"
          />
        </div>

        <ScrollArea 
          className="flex-1 p-4 relative z-10"
          ref={scrollRef}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <MessageCircle className="h-12 w-12 text-primary opacity-20 animate-bounce" />
              <p className="text-sm text-muted-foreground mt-4">Syncing transmissions...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground opacity-10" />
              <p className="text-sm text-muted-foreground mt-4">The void is silent. Say something!</p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg, idx) => {
                const isCurrentUser = msg.user_id === user.id;
                const profiles = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
                const gamertag = profiles?.gamertag || 'Unknown User';
                const avatarUrl = profiles?.avatar_url;
                const wins = profiles?.wins || 0;
                const rankColor = getRankColor(wins);
                const rankTitle = getRankTitle(wins);
                
                return (
                  <div key={`${msg.id}-${idx}`} className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start animate-in slide-in-from-bottom-2 duration-300`}>
                    <button 
                      onClick={() => !isCurrentUser && setSelectedProfile(profiles as Profile)}
                      className={`h-9 w-9 border border-border/50 shrink-0 rounded-full overflow-hidden transition-transform hover:scale-110 active:scale-95 ${!isCurrentUser ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <Avatar className="h-full w-full">
                        <AvatarImage src={avatarUrl || ''} />
                        <AvatarFallback className="bg-muted text-[10px]">
                          {gamertag[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>

                    <div className={`flex flex-col w-full max-w-[85%] md:max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <button 
                          onClick={() => !isCurrentUser && setSelectedProfile(profiles as Profile)}
                          className={`text-xs font-medium text-muted-foreground hover:text-primary transition-colors ${!isCurrentUser ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {isCurrentUser ? 'You' : gamertag}
                        </button>
                        <div className={`flex items-center gap-1 bg-background/40 backdrop-blur-sm border border-border/50 rounded-full px-2 py-0.5`}>
                          <Trophy className={`h-2.5 w-2.5 ${rankColor}`} />
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${rankColor}`}>
                            {rankTitle}
                          </span>
                        </div>
                      </div>

                      <div 
                        className={`relative rounded-2xl px-4 py-2.5 shadow-xl transition-all hover:scale-[1.01] max-w-full ${
                          isCurrentUser 
                            ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20' 
                            : 'bg-gradient-to-br from-blue-600/30 via-blue-700/20 to-blue-900/40 border border-blue-500/20'
                        }`}
                        style={!isCurrentUser ? {
                          backgroundImage: 'linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(29, 78, 216, 0.2) 65%, rgba(30, 58, 138, 0.4) 100%)'
                        } : undefined}
                      >
                        <p className="text-sm leading-relaxed break-words font-light">
                          {renderMessage(msg.message)}
                        </p>
                        <div className={`mt-1 flex items-center gap-1 ${isCurrentUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          <span className="text-[9px] font-mono">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Chat Input Area */}
        <div className="p-4 bg-background/80 backdrop-blur-lg border-t border-border/50 relative z-10">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 relative">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 bg-muted/30 border-border/50 hover:bg-muted/50">
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 grid grid-cols-5 gap-1 bg-background/95 backdrop-blur-xl border-border/50" side="top">
                  {CUSTOM_EMOJIS.map(emoji => (
                    <Button 
                      key={emoji} 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-lg hover:bg-primary/20 transition-colors"
                      onClick={() => setMessage(prev => prev + emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>

              <div className="relative flex-1">
                <Input
                  placeholder="Broadcast message to the Arena... (use @ to mention)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sending}
                  maxLength={500}
                  className="bg-muted/30 border-border/50 focus-visible:ring-primary/30 h-11 pr-12"
                />
                <Button 
                  onClick={handleSendMessage} 
                  size="icon"
                  className={`absolute right-1 top-1 h-9 w-9 transition-all ${!message.trim() ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                  disabled={sending || !message.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>

                {/* Mention Suggestions Dropdown */}
                {showMentionSuggestions && mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {mentionSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => insertMention(suggestion.gamertag)}
                        className="w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors flex items-center gap-2"
                      >
                        <span className="text-primary font-semibold">@{suggestion.gamertag}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium opacity-50">
                Encrypted Arena Channel
              </span>
              <span className="text-[9px] text-muted-foreground font-mono opacity-50">
                {message.length}/500
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Player Card Modal */}
      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-background border-border font-montserrat">
          <div className="relative h-24 bg-secondary-background">
            <div className="absolute -bottom-10 left-6">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={selectedProfile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl bg-muted">{selectedProfile?.gamertag?.[0]}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          
          <div className="pt-12 p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedProfile?.gamertag}</h2>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{selectedProfile?.location || 'Unknown Location'}</span>
                </div>
              </div>
              <div className="bg-secondary-background px-3 py-1 rounded-full border border-border">
                <span className="text-xs font-bold text-foreground">{selectedProfile?.tier || 'Bronze'}</span>
              </div>
            </div>

            {selectedProfile?.favorite_games && selectedProfile.favorite_games.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {selectedProfile.favorite_games.map(game => (
                  <Badge key={game} variant="outline" className="text-[9px] px-1 py-0 bg-primary/5">{game}</Badge>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-border">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Wins</p>
                <p className="text-sm font-bold text-foreground">{selectedProfile?.wins || 0}</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Win Rate</p>
                <p className="text-sm font-bold text-foreground">{selectedProfile?.win_rate || 0}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rank</p>
                <p className="text-sm font-bold text-foreground">#{selectedProfile?.global_rank || '-'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-foreground text-background hover:bg-foreground/90 font-bold h-11"
                  onClick={() => {
                    const targetId = selectedProfile?.id;
                    setSelectedProfile(null);
                    navigate(`/messages?user=${targetId}`);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Message
                </Button>
                
                {selectedProfile && !friends.some(f => f.id === selectedProfile.id) && (
                  <Button 
                    variant="default"
                    className="flex-1 bg-primary text-white hover:bg-primary/90 font-bold h-11"
                    onClick={() => {
                      sendFriendRequest(selectedProfile.id);
                      setSelectedProfile(null);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                )}

                {selectedProfile && friends.some(f => f.id === selectedProfile.id) && (
                  <div 
                    className="flex-1 border border-emerald-500/50 text-emerald-500 font-bold h-11 rounded-md flex items-center justify-center bg-transparent opacity-80"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Friends
                  </div>
                )}
              </div>
              
              <Button 
                variant="outline" 
                className="w-full border-border text-primary hover:bg-secondary-background font-bold h-11"
                onClick={() => {
                  setSelectedProfile(null);
                  navigate(`/profile/${selectedProfile?.id}`);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
