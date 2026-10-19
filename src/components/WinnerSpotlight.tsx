import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Crown, Share2, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { shareLink, whatsappShareUrl } from '@/lib/share';
import { GAME_INFO, type GameType } from '@/types/database';

interface WinnerSpotlightProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winner: {
    user_id: string;
    gamertag: string | null | undefined;
    avatar_url: string | null | undefined;
  };
  tournamentId: string;
  tournamentName: string;
  /** First-place prize in Arena Currency */
  prizeAmount: number;
  game?: string;
  totalPlayers?: number;
}

const CONFETTI_COLORS = ['#F5C451', '#8B5CF6', '#38E1FF', '#FFFFFF'];

export function WinnerSpotlight({ open, onOpenChange, winner, tournamentId, tournamentName, prizeAmount, game, totalPlayers }: WinnerSpotlightProps) {
  const reduceMotion = useReducedMotion();
  const name = winner.gamertag || 'Champion';
  const gameName = game ? (GAME_INFO[game as GameType]?.name ?? game) : null;
  const prize = Number.isFinite(prizeAmount) ? prizeAmount : 0;
  const url = `${window.location.origin}/tournaments/${tournamentId}`;
  const shareText = `🏆 ${name} won ${tournamentName} on Arena${prize > 0 ? ` and took ${formatArenaCurrency(prize)}` : ''}!`;

  // Stable confetti layout per open (no re-randomising on every render)
  const confetti = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 12) * 0.12,
        duration: 2.4 + ((i * 7) % 10) / 10,
        rotate: (i * 47) % 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        wide: i % 3 === 0,
      })),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="winner-title"
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gold/30 bg-card shadow-[0_0_80px_-20px_hsl(var(--gold)/0.5)]"
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            {!reduceMotion && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                {confetti.map((c, i) => (
                  <motion.span
                    key={i}
                    className="absolute top-0 block rounded-sm"
                    style={{ left: `${c.left}%`, width: c.wide ? 8 : 5, height: c.wide ? 4 : 9, background: c.color }}
                    initial={{ y: -20, rotate: c.rotate, opacity: 0 }}
                    animate={{ y: 560, rotate: c.rotate + 540, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: c.duration, delay: c.delay, ease: 'easeIn', repeat: 1 }}
                  />
                ))}
              </div>
            )}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gold/25 blur-3xl" aria-hidden />

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex flex-col items-center px-6 pb-6 pt-10 text-center">
              <motion.div
                initial={reduceMotion ? false : { y: -16, opacity: 0, rotate: -12 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.25, type: 'spring', damping: 10 }}
              >
                <Crown className="h-10 w-10 text-gold drop-shadow-[0_0_12px_hsl(var(--gold)/0.7)]" />
              </motion.div>
              <Avatar className="mt-2 h-24 w-24 ring-4 ring-gold ring-offset-4 ring-offset-card">
                <AvatarImage src={winner.avatar_url || undefined} alt="" />
                <AvatarFallback className="font-score text-4xl">{name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <p className="mt-5 text-sm font-semibold text-gold">Champion</p>
              <h2 id="winner-title" className="mt-1 break-all text-4xl leading-none">
                {name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{tournamentName}</p>

              {prize > 0 && (
                <motion.div
                  className="mt-6 w-full rounded-2xl border border-gold/30 bg-gold/10 px-4 py-4"
                  initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.45, type: 'spring', damping: 14 }}
                >
                  <p className="text-xs text-gold/80">First-place prize</p>
                  <p className="font-score text-4xl font-bold text-gold">{formatArenaCurrency(prize)}</p>
                </motion.div>
              )}

              {(gameName || totalPlayers) && (
                <dl className="mt-4 grid w-full grid-cols-2 gap-2 text-left">
                  {gameName && (
                    <div className="rounded-xl border border-border bg-background/40 p-3">
                      <dt className="text-xs text-muted-foreground">Game</dt>
                      <dd className="truncate text-sm font-semibold">{gameName}</dd>
                    </div>
                  )}
                  {totalPlayers ? (
                    <div className="rounded-xl border border-border bg-background/40 p-3">
                      <dt className="text-xs text-muted-foreground">Field</dt>
                      <dd className="font-score text-lg font-bold leading-tight">{totalPlayers} players</dd>
                    </div>
                  ) : null}
                </dl>
              )}

              <div className="mt-6 flex w-full gap-2">
                <Button className="flex-1" onClick={() => shareLink({ title: `${name} won ${tournamentName}`, text: shareText, url })}>
                  <Share2 /> Share
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={whatsappShareUrl(shareText, url)} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
