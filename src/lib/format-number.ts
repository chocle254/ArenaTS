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

/**
 * Format USD currency with $ prefix and compact notation for large amounts
 * Input is in Arena Currency units (100 AC = 1 USD)
 */
export function formatUSD(acAmount: number): string {
  const usdAmount = acAmount / 100;
  if (usdAmount < 1000) {
    return `$${usdAmount.toFixed(2)}`;
  }
  return `$${formatLargeNumber(usdAmount)}`;
}

/**
 * Format currency with K, M, B, T suffixes (Legacy, avoid for USD/AC specific needs)
 */
export function formatCurrency(amount: number): string {
  if (amount < 1000) {
    return `$${amount.toFixed(2)}`;
  }
  return `$${formatLargeNumber(amount)}`;
}

/**
 * Format USD currency with 1 decimal place for amounts >= 1000
 * @param amount - The amount to format
 */
export function formatUSDWithDecimals(amount: number): string {
  if (amount < 1000) {
    return `$${amount.toFixed(2)}`;
  }
  return formatUSD(amount);
}
