/**
 * Selling price preview, same formula as the API (`utils/price.util.ts`): base × (1 + markup%), rounded up to
 * the store's rounding step. The API recalculates on save, so this only drives the form preview.
 *
 * @example
 * sellingPrice(23000, 5, 500) // 24500
 */
export const sellingPrice = (basePrice: number, markupPercent: number, rounding: number): number => {
  const raw = Math.round(basePrice * (100 + markupPercent)) / 100
  const step = rounding > 0 ? rounding : 1
  return Math.ceil(raw / step) * step
}

/** Markup that applies: variant, else product, else category, else global (same order as the API). */
export const effectiveMarkup = (
  variantMarkup: number | null | undefined,
  productMarkup: number | null | undefined,
  globalMarkup: number,
  categoryMarkup: number | null | undefined = undefined,
): number => variantMarkup ?? productMarkup ?? categoryMarkup ?? globalMarkup
