import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LevelRingProps {
  level: number;
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
}

/** Circular XP ring around an avatar or the level number. */
export function LevelRing({ level, progress, size = 96, stroke = 6, className, children }: LevelRingProps) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, progress));

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#lvl-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="lvl-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary-soft))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ padding: stroke + 4 }}>
        {children ?? (
          <div className="text-center leading-none">
            <span className="block font-score text-[0.32em]" style={{ fontSize: size * 0.32 }}>
              {level}
            </span>
            <span className="block text-[10px] text-muted-foreground">Level</span>
          </div>
        )}
      </div>
      <span className="sr-only">
        Level {level}, {Math.round(pct * 100)}% to next level
      </span>
    </div>
  );
}
