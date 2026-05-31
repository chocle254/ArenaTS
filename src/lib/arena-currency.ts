import { formatLargeNumber } from './format-number';

/**
 * Format large numbers to compact notation (K, M, B)
 */
export function formatCompactNumber(number: number): string {
  return formatLargeNumber(number);
}

/**
 * Format Arena Currency with A$ prefix and compact notation for large amounts
 * 1$ = 100 AC
 */
export function formatArenaCurrency(amount: number): string {
  const roundedAmount = Math.floor(amount);
  if (roundedAmount < 1000) {
    return `A$${roundedAmount}`;
  }
  return `A$${formatLargeNumber(roundedAmount)}`;
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
