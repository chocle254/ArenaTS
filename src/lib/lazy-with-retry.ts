import { type ComponentType, lazy } from 'react';

const RELOAD_KEY = 'arena:chunk-reload-at';

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \S+ failed|ChunkLoadError/i.test(
    message,
  );
}

/**
 * React.lazy with recovery for stale deployments.
 *
 * After a new deploy, a tab that was opened earlier still references the old,
 * now-deleted chunk files, so navigating to a lazy page fails and the app goes
 * blank. We retry once, then do a single full reload to pick up the new build.
 * The reload is rate-limited so a genuinely broken chunk can't loop forever.
 */
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (firstError) {
      if (!isChunkLoadError(firstError)) throw firstError;
      try {
        return await factory();
      } catch (secondError) {
        let last = 0;
        try {
          last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        } catch {
          /* storage unavailable */
        }
        if (Date.now() - last > 30_000) {
          try {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          } catch {
            /* storage unavailable */
          }
          window.location.reload();
          // Keep React suspended while the page reloads.
          return new Promise<{ default: T }>(() => {});
        }
        throw secondError;
      }
    }
  });
}

export { isChunkLoadError };
