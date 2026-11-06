import { useEffect } from 'react';

/**
 * One pointer listener for the whole app. Any element with the class
 * `spotlight` gets --mx / --my set to the pointer's position inside it,
 * which its ::after light (index.css) follows. Mouse and pen only.
 */
export function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const el = (e.target as Element | null)?.closest?.('.spotlight') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
