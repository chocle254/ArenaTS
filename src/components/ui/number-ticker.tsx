import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

/**
 * Counts up to `value` when it scrolls into view, and glides between
 * values when it changes later (a balance after a top-up).
 */
export function NumberTicker({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 1.1,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || !inView) {
      el.textContent = format(reduce ? value : from.current);
      if (reduce) from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        el.textContent = format(n);
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, inView, reduce, duration, format]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(reduce ? value : 0)}
    </span>
  );
}
