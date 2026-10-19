import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** "Install Arena" support for Chrome/Edge/Android (home-screen app). */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(() => !!deferred && !isStandalone());

  useEffect(() => {
    const update = () => setCanInstall(!!deferred && !isStandalone());
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    const prompt = deferred;
    deferred = null;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    listeners.forEach((l) => l());
    return choice.outcome === 'accepted';
  }, []);

  return { canInstall, install, isStandalone: isStandalone() };
}
