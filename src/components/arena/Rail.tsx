import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RailProps {
  children: React.ReactNode;
  className?: string;
  /** Accessible label for the scroll region */
  label: string;
}

/**
 * Horizontal scroller with snap points.
 *
 * Mouse-wheel scrolling only drives the row while the row can still move in
 * that direction, then hands back to the page. (The previous implementation
 * always called preventDefault, which trapped page scrolling whenever the
 * cursor was over a row.)
 */
export function Rail({ children, className, label }: RailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateEdges();
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // trackpad horizontal: native
      const canScroll = el.scrollWidth > el.clientWidth + 4;
      if (!canScroll) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return; // let the page scroll
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', updateEdges, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', updateEdges);
    };
  }, [updateEdges]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className={cn('group/rail relative', className)}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 scrollbar-hide md:mx-0 md:scroll-px-0 md:px-0"
      >
        {children}
      </div>
      {!edges.start && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          className="absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 shadow-lg backdrop-blur md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {!edges.end && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 shadow-lg backdrop-blur md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/** Section heading used across redesigned screens. */
export function SectionHeader({
  title,
  action,
  description,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-2xl">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Empty state that points to the next action instead of a dead end. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      {icon && <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>}
      <div className="space-y-1">
        <p className="text-lg font-semibold">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
