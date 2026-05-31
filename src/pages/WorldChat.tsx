
import { Globe } from 'lucide-react';
import { WorldChat as WorldChatComponent } from '@/components/WorldChat';

export default function WorldChat() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Globe className="h-8 w-8 text-primary" />
          World Chat
        </h1>
        <p className="text-muted-foreground font-light">
          Connect with players from around the world. Share strategies, find teammates, and build your gaming community.
        </p>
      </div>

      <WorldChatComponent />
    </div>
  );
}
