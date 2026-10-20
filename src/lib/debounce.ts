/**
 * Trailing debounce with a maximum wait: bursts of realtime events (a busy
 * registration, a flurry of results) collapse into one refetch, but a steady
 * stream still refreshes at least every `maxWait` ms.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 800, maxWait = 4000) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let first = 0;
  let lastArgs: A;
  const run = () => {
    timer = null;
    first = 0;
    fn(...lastArgs);
  };
  const debounced = (...args: A) => {
    lastArgs = args;
    const now = Date.now();
    if (!first) first = now;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, now - first >= maxWait ? 0 : wait);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    first = 0;
  };
  return debounced;
}
