import { formatLargeNumber } from './format-number';

/**
 * Format large numbers to compact notation (K, M, B)
 */
export function formatCompactNumber(number: number): string {
  return formatLargeNumber(number);
}

/**
 * Format Arena Currency as "1,250 AC" / "12.4K AC" (100 AC = $1).
 * Previously rendered as "A$1250", which read as Australian dollars and
 * didn't match the "AC" used on the wallet packs.
 */
export function formatArenaCurrency(amount: number): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const roundedAmount = Math.floor(safe);
  if (Math.abs(roundedAmount) < 1000) {
    return `${roundedAmount.toLocaleString()} AC`;
  }
  return `${roundedAmount < 0 ? '-' : ''}${formatLargeNumber(Math.abs(roundedAmount))} AC`;
}

/** Number part only, for places that render the AC unit separately (e.g. with a coin icon). */
export function formatArenaAmount(amount: number): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const roundedAmount = Math.floor(safe);
  if (Math.abs(roundedAmount) < 1000) return roundedAmount.toLocaleString();
  return `${roundedAmount < 0 ? '-' : ''}${formatLargeNumber(Math.abs(roundedAmount))}`;
}

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

/**
 * Lifetime cash winnings (profiles.total_earnings). Payout functions credit this
 * alongside the withdrawable USD balance, so it is shown in dollars.
 */
export function formatEarnings(amount: number | null | undefined): string {
  const value = Number(amount) || 0;
  if (Math.abs(value) >= 10_000) {
    return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
