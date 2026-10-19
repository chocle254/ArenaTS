import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  /** Tournament status, if known. When 'completed' or 'cancelled', this
   *  always shows that outcome instead of a time-based guess. */
  status?: string;
  className?: string;
}

function getTimeLeft(target: Date) {
  const difference = new Date(target).getTime() - Date.now();
  if (!Number.isFinite(difference) || difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference % 86_400_000) / 3_600_000),
    minutes: Math.floor((difference % 3_600_000) / 60_000),
    seconds: Math.floor((difference % 60_000) / 1000),
    total: difference,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function CountdownTimer({ targetDate, onComplete, status, className }: CountdownTimerProps) {
  const targetMs = new Date(targetDate).getTime();
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const initial = getTimeLeft(new Date(targetMs));
    setTimeLeft(initial);
    if (initial.total <= 0) {
      onCompleteRef.current?.();
      return;
    }
    const timer = setInterval(() => {
      const next = getTimeLeft(new Date(targetMs));
      setTimeLeft(next);
      if (next.total <= 0) {
        clearInterval(timer);
        onCompleteRef.current?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetMs]);

  const base = cn('font-score text-2xl', className);

  if (status === 'completed') {
    return <span className={cn(base, 'text-muted-foreground')}>Ended</span>;
  }
  if (status === 'cancelled') {
    return <span className={cn(base, 'text-muted-foreground')}>Cancelled</span>;
  }
  if (timeLeft.total <= 0) {
    const live = status === 'active' || status === 'live';
    return (
      <span className={cn(base, 'inline-flex items-center gap-2', live ? 'text-live' : 'text-foreground')}>
        <span className={cn('h-2 w-2 rounded-full', live ? 'bg-live animate-pulse' : 'bg-primary')} />
        {live ? 'Live' : 'Starting'}
      </span>
    );
  }

  return (
    <span className={cn(base, 'tabular-nums')} aria-label="Time until start">
      {timeLeft.days > 0 && <>{timeLeft.days}d </>}
      {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </span>
  );
}
