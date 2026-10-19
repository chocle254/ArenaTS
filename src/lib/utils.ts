import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Params = Partial<
  Record<keyof URLSearchParams, string | number | null | undefined>
>;

export function createQueryString(
  params: Params,
  searchParams: URLSearchParams
) {
  const newSearchParams = new URLSearchParams(searchParams?.toString());

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      newSearchParams.delete(key);
    } else {
      newSearchParams.set(key, String(value));
    }
  }

  return newSearchParams.toString();
}

export function formatDate(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat(undefined, {
    month: opts.month ?? "long",
    day: opts.day ?? "numeric",
    year: opts.year ?? "numeric",
    ...opts,
  }).format(new Date(date));
}

export function formatTimeUntil(startTime: string | Date): string {
  const timeLeftMs = new Date(startTime).getTime() - Date.now();
  if (!Number.isFinite(timeLeftMs)) return '—';
  if (timeLeftMs <= 0) return 'Started';

  const days = Math.floor(timeLeftMs / 86_400_000);
  const hours = Math.floor((timeLeftMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((timeLeftMs % 3_600_000) / 60_000);

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${Math.max(1, minutes)}m`;
}

/** "in 3h", "2d ago" style relative time. */
export function formatRelativeTime(date: string | Date): string {
  const diff = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(diff)) return '';
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  return rtf.format(Math.round(diff / 86_400_000), 'day');
}


/** Haptic buzz, only once the user has interacted (browsers block it before that). */
export function buzz(pattern: number | number[]) {
  try {
    const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
    if (nav.userActivation && !nav.userActivation.hasBeenActive) return;
    nav.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
