import { formatArenaCurrency, formatKES } from './arena-currency';
/**
 * Format large numbers with K, M, B, T suffixes
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with suffix
 */
export function formatLargeNumber(num: number, decimals: number = 1): string {
  if (num < 1000) {
    return num.toString();
  }

  const units = [
    { value: 1e12, suffix: 'T' }, // Trillion
    { value: 1e9, suffix: 'B' },  // Billion
    { value: 1e6, suffix: 'M' },  // Million
    { value: 1e3, suffix: 'K' }   // Thousand
  ];

  for (const unit of units) {
    if (num >= unit.value) {
      const formatted = num / unit.value;
      
      // If the number is a whole number after division, don't show decimals
      if (formatted % 1 === 0) {
        return `${formatted}${unit.suffix}`;
      }
      
      // Otherwise, show decimals
      return `${formatted.toFixed(decimals)}${unit.suffix}`;
    }
  }

  return num.toString();
}

// Money is KES everywhere. These keep their old names so existing imports work.

export function formatUSD(amount: number): string {
  return formatArenaCurrency(amount);
}

export function formatCurrency(amount: number): string {
  return formatArenaCurrency(amount);
}

export function formatUSDWithDecimals(amount: number): string {
  return formatKES(amount);
}
