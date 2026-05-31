
import { Check, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface FriendRequestToastProps {
  id: string;
  senderName: string;
  senderAvatar: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const FriendRequestToast = ({
  id,
  senderName,
  senderAvatar,
  onAccept,
  onDecline
}: FriendRequestToastProps) => {
  return (
    <div className="w-[350px] bg-background border border-border rounded-xl shadow-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-right-full duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Friend Request</p>
          <p className="text-xs text-muted-foreground">New request from {senderName}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground"
          onClick={() => toast.dismiss(id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-secondary/30 p-2 rounded-lg">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src={senderAvatar || ''} />
          <AvatarFallback>{senderName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{senderName}</p>
          <p className="text-[10px] text-muted-foreground">Wants to be your friend</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1 gap-2"
          onClick={() => {
            onAccept();
            toast.dismiss(id);
          }}
        >
          <Check className="h-4 w-4" />
          Accept
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 gap-2"
          onClick={() => {
            onDecline();
            toast.dismiss(id);
          }}
        >
          <X className="h-4 w-4" />
          Decline
        </Button>
      </div>
    </div>
  );
};
