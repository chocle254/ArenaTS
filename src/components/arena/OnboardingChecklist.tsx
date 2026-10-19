import { Check, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProgress } from '@/hooks/use-player-progress';
import { cn } from '@/lib/utils';

const dismissKey = (uid: string) => `arena:onboarding-dismissed:${uid}`;

/** First-week checklist. Each step is derived from real account data. */
export function OnboardingChecklist() {
  const { user, profile } = useAuth();
  const { counts, friendsCount, loading } = usePlayerProgress();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!user && localStorage.getItem(dismissKey(user.id)) === '1';
    } catch {
      return false;
    }
  });

  if (!user || loading || dismissed) return null;

  const steps = [
    { done: (counts?.gameAccounts ?? 0) > 0, label: 'Add your in-game ID', hint: 'So opponents can find you in the lobby', to: '/settings' },
    { done: (counts?.tournamentsJoined ?? 0) > 0, label: 'Join your first tournament', hint: 'Free and paid brackets every day', to: '/tournaments' },
    { done: (counts?.challengesPlayed ?? 0) > 0, label: 'Play a quick match', hint: 'Challenge someone who is online now', to: '/quick-match' },
    { done: friendsCount > 0, label: 'Add a friend', hint: 'Squad up and message each other', to: '/world-chat' },
    { done: profile?.kyc_status === 'verified', label: 'Verify your identity', hint: 'Needed before you can withdraw winnings', to: '/wallet' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(user.id), '1');
    } catch {
      /* storage unavailable */
    }
    setDismissed(true);
  };

  return (
    <section className="surface p-5" aria-labelledby="onboarding-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="onboarding-title" className="text-xl">Get match-ready</h2>
          <p className="text-sm text-muted-foreground">
            {doneCount} of {steps.length} done
          </p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground" aria-label="Hide checklist">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, i) => (
          <li key={step.label}>
            <Link
              to={step.to}
              className={cn(
                'flex h-full items-center gap-3 rounded-xl border p-3 transition-colors',
                step.done ? 'border-success/30 bg-success/5' : 'border-border hover:border-primary/50',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-score text-sm',
                  step.done ? 'bg-success text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                {step.done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm font-semibold leading-tight', step.done && 'text-muted-foreground line-through decoration-1')}>{step.label}</span>
                <span className="block text-xs text-muted-foreground">{step.hint}</span>
              </span>
              {!step.done && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
