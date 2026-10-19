import { cn } from '@/lib/utils';

interface LiveBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Live status chip. Cyan is reserved for live / online across the app. */
export function LiveBadge({ className = '', size = 'md' }: LiveBadgeProps) {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-live/40 bg-live/10 font-semibold text-live',
        sizeClasses[size],
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
      Live
    </span>
  );
}
