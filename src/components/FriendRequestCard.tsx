import { Check, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { GAME_INFO, type FriendRequest, type GameType } from '@/types/database';

interface FriendRequestCardProps {
  request: FriendRequest;
}

export function FriendRequestCard({ request }: FriendRequestCardProps) {
  const { respondToFriendRequest } = useDirectMessages();
  const [busy, setBusy] = useState<'accepted' | 'declined' | null>(null);
  const sender = request.sender;
  if (!sender) return null;

  const respond = async (status: 'accepted' | 'declined') => {
    setBusy(status);
    try {
      await respondToFriendRequest(request.id, status);
    } finally {
      setBusy(null);
    }
  };

  const games = ((sender.favorite_games as string[] | null) || []).slice(0, 3);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
      <Link to={`/profile/${sender.id}`} className="flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-primary/40">
          <AvatarImage src={sender.avatar_url || undefined} alt="" />
          <AvatarFallback className="font-score">{sender.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold hover:text-primary-soft">{sender.gamertag}</p>
          {sender.location && (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" /> {sender.location}
            </p>
          )}
        </div>
      </Link>

      {games.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {games.map((g) => (
            <span key={g} className="rounded-md border border-border bg-background/40 px-2 py-0.5 text-xs text-muted-foreground">
              {GAME_INFO[g as GameType]?.shortName ?? g}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={!!busy} onClick={() => respond('accepted')}>
          <Check /> Accept
        </Button>
        <Button size="sm" variant="outline" className="flex-1" disabled={!!busy} onClick={() => respond('declined')}>
          <X /> Decline
        </Button>
      </div>
    </div>
  );
}
