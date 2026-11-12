import { Play, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sponsor trailer. Plays muted and looping only while it's on screen, and
 * doesn't download anything until it's about to scroll into view. Tap for
 * sound, tap again to mute. On data saver or reduced motion it waits for a
 * tap instead of autoplaying.
 */
interface TrailerPlayerProps {
  src: string;
  poster?: string | null;
  title?: string;
  className?: string;
  /** Where the sound button sits when the player is used as a card background */
  controls?: 'bottom-right' | 'top-right';
}

function prefersNoAutoplay(): boolean {
  try {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    return !!saveData || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function TrailerPlayer({ src, poster, title = 'Tournament trailer', className, controls = 'bottom-right' }: TrailerPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false); // close enough to start loading
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false); // user tapped play (no-autoplay mode)
  const [failed, setFailed] = useState(false);
  const [autoplay] = useState(() => !prefersNoAutoplay());

  // Load when within ~300px of the screen; play only when mostly visible
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      setVisible(true);
      return;
    }
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '300px' });
    const visObs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    nearObs.observe(el);
    visObs.observe(el);
    return () => {
      nearObs.disconnect();
      visObs.disconnect();
    };
  }, []);

  // React doesn't reliably set the muted attribute, and iOS only autoplays truly muted video
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, near]);

  // Play while visible (and the tab is showing), pause otherwise
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !near) return;
    const sync = () => {
      const shouldPlay = visible && document.visibilityState === 'visible' && (autoplay || started);
      if (shouldPlay) void v.play().catch(() => {});
      else v.pause();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [visible, near, autoplay, started]);

  if (failed) return null;

  const onTap = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!autoplay && !started) {
      setStarted(true);
      v.muted = false;
      setMuted(false);
      return;
    }
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) void v.play().catch(() => {});
  };

  return (
    <div ref={wrapRef} className={cn('relative overflow-hidden rounded-xl bg-black', className)}>
      <video
        ref={videoRef}
        src={near ? src : undefined}
        poster={poster || undefined}
        muted={muted}
        loop
        playsInline
        preload={near ? 'metadata' : 'none'}
        aria-label={title}
        onError={() => setFailed(true)}
        onClick={onTap}
        className="h-full w-full cursor-pointer object-cover"
      />
      <button
        type="button"
        onClick={onTap}
        aria-label={!autoplay && !started ? `Play ${title}` : muted ? 'Turn sound on' : 'Mute'}
        className={cn(
          'absolute z-20 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition',
          !autoplay && !started
            ? controls === 'top-right' ? 'right-3 top-3 h-11 w-11' : 'left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2'
            : controls === 'top-right' ? 'right-3 top-3 h-9 w-9' : 'bottom-2 right-2 h-9 w-9',
        )}
      >
        {!autoplay && !started ? <Play className="h-6 w-6" /> : muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
