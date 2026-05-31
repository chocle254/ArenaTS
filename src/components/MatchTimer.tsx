import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MatchTimerProps {
  deadline: string | null;
  onExpire?: () => void;
}

export function MatchTimer({ deadline, onExpire }: MatchTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const remaining = Math.max(0, deadlineTime - now);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        onExpire?.();
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [deadline, isExpired, onExpire]);

  if (!deadline) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isWarning = minutes < 5 && minutes >= 1;
  const isCritical = minutes < 1;

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Clock className={`h-3 w-3 ${
        isCritical ? 'text-destructive animate-pulse' : 
        isWarning ? 'text-orange-500' : 
        'text-muted-foreground'
      }`} />
      <span className={`text-xs font-mono ${
        isCritical ? 'text-destructive font-semibold animate-pulse' : 
        isWarning ? 'text-orange-500 font-medium' : 
        'text-muted-foreground'
      }`}>
        {isExpired ? 'EXPIRED' : formattedTime}
      </span>
    </div>
  );
}
