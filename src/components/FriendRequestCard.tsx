
import { Check, Gamepad2, MapPin, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { FriendRequest } from '@/types/database';

interface FriendRequestCardProps {
  request: FriendRequest;
}

export function FriendRequestCard({ request }: FriendRequestCardProps) {
  const { respondToFriendRequest } = useDirectMessages();
  const sender = request.sender;

  if (!sender) return null;

  return (
    <div className="relative group overflow-hidden rounded-xl border border-white/10 p-4 transition-all duration-300 hover:scale-[1.02]">
      {/* Dark Ocean Marine Background */}
      <div 
        className="absolute inset-0 z-0 opacity-60"
        style={{
          background: 'linear-gradient(135deg, #001219 0%, #005f73 50%, #0a9396 100%)',
        }}
      />
      
      {/* Animated Bubbles Effect */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute bottom-[-10%] left-[10%] w-4 h-4 bg-white rounded-full animate-bubble" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-[-10%] left-[30%] w-2 h-2 bg-white rounded-full animate-bubble" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[-10%] left-[50%] w-3 h-3 bg-white rounded-full animate-bubble" style={{ animationDelay: '2.5s' }} />
        <div className="absolute bottom-[-10%] left-[70%] w-2 h-2 bg-white rounded-full animate-bubble" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[-10%] left-[90%] w-4 h-4 bg-white rounded-full animate-bubble" style={{ animationDelay: '3s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-white/20">
            <AvatarImage src={sender.avatar_url || ''} alt={sender.gamertag} />
            <AvatarFallback className="bg-white/10 text-white">
              {sender.gamertag?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white truncate">{sender.gamertag}</h4>
            <div className="flex items-center gap-1 text-xs text-white/70">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{sender.location || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {sender.favorite_games && sender.favorite_games.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sender.favorite_games.slice(0, 3).map((game) => (
              <Badge 
                key={game} 
                variant="outline" 
                className="bg-white/5 border-white/10 text-[10px] py-0 px-2 text-white/90"
              >
                {game.toUpperCase()}
              </Badge>
            ))}
            {sender.favorite_games.length > 3 && (
              <span className="text-[10px] text-white/60">+{sender.favorite_games.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-1">
          <Button
            size="sm"
            className="flex-1 bg-emerald-500/80 hover:bg-emerald-500 text-white border-none backdrop-blur-md transition-all duration-300"
            onClick={() => respondToFriendRequest(request.id, 'accepted')}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-300"
            onClick={() => respondToFriendRequest(request.id, 'declined')}
          >
            <X className="h-4 w-4 mr-1.5" />
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
