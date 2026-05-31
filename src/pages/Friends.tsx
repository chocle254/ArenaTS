
import { Gamepad2, MapPin, MessageSquare, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FriendRequestCard } from '@/components/FriendRequestCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDirectMessages } from '@/contexts/DirectMessageContext';

export default function Friends() {
  const { friends, pendingRequests } = useDirectMessages();
  const navigate = useNavigate();

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold gradient-text">Social Center</h1>
        <p className="text-muted-foreground">Manage your connections and coordinate with fellow competitors</p>
      </div>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center relative">
              <UserPlus className="h-5 w-5 text-primary" />
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white border-2 border-background animate-pulse">
                {pendingRequests.length}
              </Badge>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Friend Requests</h2>
              <p className="text-xs text-muted-foreground">{pendingRequests.length} new people want to connect</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.map((request) => (
              <FriendRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Friends List Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Friends ({friends.length})</h2>
        </div>
        
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary/50" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">No friends yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Connect with people in World Chat to start growing your social network and competing together.
              </p>
            </div>
            <Button onClick={() => navigate('/world-chat')} variant="outline">
              Go to World Chat
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div 
                key={friend.id}
                className="group p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/10 transition-all duration-300 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/50 transition-colors">
                      <AvatarImage src={friend.avatar_url || ''} alt={friend.gamertag} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {friend.gamertag?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Simplified online status - in a real app this would use a presence hook */}
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0a0015] animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate group-hover:text-primary transition-colors">{friend.gamertag}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{friend.location || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {friend.favorite_games && friend.favorite_games.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {friend.favorite_games.slice(0, 3).map((game) => (
                      <Badge 
                        key={game} 
                        variant="outline" 
                        className="bg-white/5 border-white/5 text-[10px] py-0 px-2 font-light"
                      >
                        {game.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => navigate(`/messages?user=${friend.id}`)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
