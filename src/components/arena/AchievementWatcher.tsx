import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProgress } from '@/hooks/use-player-progress';
import { RARITY_STYLES } from '@/lib/progression';
import { buzz, cn } from '@/lib/utils';

const seenKey = (uid: string) => `arena:achievements-seen:${uid}`;
const levelKey = (uid: string) => `arena:level-seen:${uid}`;

function readSeen(uid: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(seenKey(uid));
    return raw ? new Set(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * Celebrates newly unlocked achievements and level-ups once. The first time
 * it runs for a player it records what's already unlocked without toasting,
 * so existing players aren't flooded.
 */
export function AchievementWatcher() {
  const { user, profile } = useAuth();
  const { achievements, level, loading } = usePlayerProgress();
  const navigate = useNavigate();
  const ready = useRef(false);

  useEffect(() => {
    ready.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!user || !profile || loading) return;
    const unlocked = achievements.filter((a) => a.unlocked);
    const seen = readSeen(user.id);

    if (!seen) {
      try {
        localStorage.setItem(seenKey(user.id), JSON.stringify(unlocked.map((a) => a.id)));
        localStorage.setItem(levelKey(user.id), String(level.level));
      } catch {
        /* storage unavailable */
      }
      ready.current = true;
      return;
    }

    const fresh = unlocked.filter((a) => !seen.has(a.id));
    if (fresh.length) {
      fresh.slice(0, 3).forEach((a, i) => {
        const Icon = a.icon;
        const style = RARITY_STYLES[a.rarity];
        setTimeout(() => {
          toast.custom(
            (t) => (
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t);
                  navigate('/achievements');
                }}
                className="flex w-[356px] max-w-[92vw] items-center gap-3 rounded-xl border border-gold/40 bg-card p-3 text-left shadow-2xl"
              >
                <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-2', style.bg, style.ring)}>
                  <Icon className={cn('h-6 w-6', style.text)} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-gold">Achievement unlocked</span>
                  <span className="block truncate font-score text-lg leading-tight">{a.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.description}</span>
                </span>
              </button>
            ),
            { duration: 6000 },
          );
        }, i * 700);
      });
      try {
        buzz([40, 30, 80]);
      } catch {
        /* not supported */
      }
      fresh.forEach((a) => seen.add(a.id));
      try {
        localStorage.setItem(seenKey(user.id), JSON.stringify([...seen]));
      } catch {
        /* storage unavailable */
      }
    }

    let lastLevel = 0;
    try {
      lastLevel = Number(localStorage.getItem(levelKey(user.id)) || 0);
    } catch {
      /* storage unavailable */
    }
    if (lastLevel && level.level > lastLevel) {
      toast.success(`Level ${level.level} reached`, {
        description: `${level.toNext.toLocaleString()} XP to level ${level.level + 1}. Keep winning.`,
        action: { label: 'View', onClick: () => navigate('/achievements') },
      });
    }
    if (level.level !== lastLevel) {
      try {
        localStorage.setItem(levelKey(user.id), String(level.level));
      } catch {
        /* storage unavailable */
      }
    }
    ready.current = true;
  }, [user, profile, achievements, level.level, level.toNext, loading, navigate]);

  return null;
}
