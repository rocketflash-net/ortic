/**
 * Formats an amount in Rupiah without decimals (the API stores whole rupiah).
 *
 * @param value - Amount to format.
 * @param locale - BCP 47 locale. Defaults to `"id-ID"`.
 *
 * @example
 * formatCurrency(99000) // "Rp 99.000"
 */
export const formatCurrency = (value: number, locale = "id-ID"): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)

/**
 * Formats a number with grouping separators.
 *
 * @param value - Number to format.
 * @param locale - BCP 47 locale. Defaults to `"id-ID"`.
 * @param maximumFractionDigits - Defaults to `0`.
 */
export const formatNumber = (value: number, locale = "id-ID", maximumFractionDigits = 0): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)
