

interface LiveBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LiveBadge({ className = '', size = 'md' }: LiveBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  return (
    <div className={`inline-flex items-center gap-2 bg-red-600 text-white font-bold rounded ${sizeClasses[size]} ${className}`}>
      <span className={`${dotSizes[size]} bg-white rounded-full animate-pulse`} />
      LIVE
    </div>
  );
}
