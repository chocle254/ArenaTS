import { formatLargeNumber } from './format-number';

/**
 * Format large numbers to compact notation (K, M, B)
 */
export function formatCompactNumber(number: number): string {
  return formatLargeNumber(number);
}

/** Kenyan shillings: "KES 1,250", "KES 12.4K". All balances, fees and prizes are in KES. */
export function formatArenaCurrency(amount: number): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const rounded = Math.round(safe);
  const sign = rounded < 0 ? '-' : '';
  if (Math.abs(rounded) < 100_000) return `${sign}KES ${Math.abs(rounded).toLocaleString('en-KE')}`;
  return `${sign}KES ${formatLargeNumber(Math.abs(rounded))}`;
}

/** Same as formatArenaCurrency without the unit, for layouts that render "KES" separately. */
export function formatArenaAmount(amount: number): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const rounded = Math.round(safe);
  if (Math.abs(rounded) < 100_000) return rounded.toLocaleString('en-KE');
  return `${rounded < 0 ? '-' : ''}${formatLargeNumber(Math.abs(rounded))}`;
}

/** Exact KES with cents when present, for receipts and the wallet. */
export function formatKES(amount: number | null | undefined): string {
  const v = Number(amount) || 0;
  return `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export const CURRENCY = 'KES';

/**
 * Check if user has sufficient Arena Currency
 */
export function hasSufficientBalance(userBalance: number, required: number): boolean {
  return userBalance >= required;
}

/**
 * Calculate tournament cost based on type
 */
export function calculateTournamentCost(entryFee: number, prizePool: number): number {
  if (entryFee > 0) {
    // Entry fee tournament: $10 deposit
    return 10;
  } else {
    // Fully sponsored: full prize pool
    return prizePool;
  }
}

/**
 * Calculate final prize pool after platform fee
 */
export function calculateFinalPrizePool(
  entryFee: number,
  participants: number,
  creatorDeposit: number = 10
): { totalPool: number; platformFee: number; finalPool: number } {
  const totalPool = (entryFee * participants) + creatorDeposit;
  const platformFee = totalPool * 0.10;
  const finalPool = totalPool - platformFee;
  
  return { totalPool, platformFee, finalPool };
}

/** Lifetime winnings (profiles.total_earnings), in KES. */
export function formatEarnings(amount: number | null | undefined): string {
  return formatArenaCurrency(Number(amount) || 0);
}
