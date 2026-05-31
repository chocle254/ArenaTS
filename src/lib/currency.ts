export const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', code: 'USD', rate: 1 },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', code: 'KES', rate: 129.5 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', code: 'NGN', rate: 1550 },
  GHS: { symbol: 'GH₵', name: 'Ghanaian Cedi', code: 'GHS', rate: 15.2 },
  UGX: { symbol: 'USh', name: 'Ugandan Shilling', code: 'UGX', rate: 3680 },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling', code: 'TZS', rate: 2580 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatCurrencyAmount(amount: number, currencyCode: CurrencyCode): string {
  const currency = CURRENCIES[currencyCode];
  return `${currency.symbol}${amount.toFixed(2)}`;
}

export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  return CURRENCIES[currencyCode]?.symbol || '$';
}

// Detect currency based on location (simplified)
export function detectCurrency(): CurrencyCode {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  if (timezone.includes('Nairobi')) return 'KES';
  if (timezone.includes('Lagos')) return 'NGN';
  if (timezone.includes('Accra')) return 'GHS';
  if (timezone.includes('Kampala')) return 'UGX';
  if (timezone.includes('Dar_es_Salaam')) return 'TZS';
  
  return 'USD';
}

/**
 * Convert amount from one currency to another
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount in target currency
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first, then to target currency
  const amountInUSD = amount / CURRENCIES[fromCurrency].rate;
  const convertedAmount = amountInUSD * CURRENCIES[toCurrency].rate;
  
  return convertedAmount;
}

/**
 * Convert amount from any currency to USD
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code
 * @returns Amount in USD
 */
export function convertToUSD(amount: number, fromCurrency: CurrencyCode): number {
  return amount / CURRENCIES[fromCurrency].rate;
}

/**
 * Convert amount from USD to any currency
 * @param amountUSD - Amount in USD
 * @param toCurrency - Target currency code
 * @returns Amount in target currency
 */
export function convertFromUSD(amountUSD: number, toCurrency: CurrencyCode): number {
  return amountUSD * CURRENCIES[toCurrency].rate;
}

/**
 * Get exchange rate between two currencies
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate
 */
export function getExchangeRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number {
  if (fromCurrency === toCurrency) return 1;
  return CURRENCIES[toCurrency].rate / CURRENCIES[fromCurrency].rate;
}
