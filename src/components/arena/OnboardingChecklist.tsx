import { ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProgress } from '@/hooks/use-player-progress';

const dismissKey = (uid: string) => `arena:onboarding-dismissed:${uid}`;

/**
 * New-player setup, one step at a time: only the next unfinished step is
 * shown, so the home screen stays about playing.
 */
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
    { done: (counts?.gameAccounts ?? 0) > 0, label: 'Add your in-game ID', hint: 'Opponents and referees use it to find you in the lobby.', to: '/settings', cta: 'Add ID' },
    { done: (counts?.tournamentsJoined ?? 0) > 0, label: 'Join your first tournament', hint: 'Pick an open bracket below and lock in your spot.', to: '/tournaments?tab=upcoming', cta: 'Browse' },
    { done: (counts?.challengesPlayed ?? 0) > 0, label: 'Play a quick match', hint: 'Challenge someone who is online right now.', to: '/quick-match', cta: 'Find a match' },
    { done: friendsCount > 0, label: 'Add a friend', hint: 'Find players in World Chat and squad up.', to: '/world-chat', cta: 'Find players' },
    { done: profile?.kyc_status === 'verified', label: 'Verify your identity', hint: 'Needed before you can withdraw winnings.', to: '/wallet', cta: 'Verify' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  if (!next) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(user.id), '1');
    } catch {
      /* storage unavailable */
    }
    setDismissed(true);
  };

  return (
    <section className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] p-3 pl-4" aria-label="Account setup">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden>
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(doneCount / steps.length) * 94.2} 94.2`} />
        </svg>
        <span className="font-score text-sm font-bold">
          {doneCount}/{steps.length}
        </span>
      </span>
      <Link to={next.to} className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Next step: {next.label}</span>
        <span className="block truncate text-xs text-muted-foreground">{next.hint}</span>
      </Link>
      <Link to={next.to} className="hidden h-9 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-white sm:flex">
        {next.cta} <ChevronRight className="h-4 w-4" />
      </Link>
      <button type="button" onClick={dismiss} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-foreground" aria-label="Hide setup steps">
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
