import type { DATE_FNS_LOCALES } from "../helpers/date"

/**
 * Named routes for shared utility pages.
 */
export enum UtilsPageName {
  PAGE_NOT_FOUND = "PageNotFound",
  FORBIDDEN = "Forbidden",
}

/** Supported date-fns locale codes aligned with vue-i18n locale keys. */
export type DateLocaleCode = keyof typeof DATE_FNS_LOCALES

/**
 * Props for {@link BaseFormField}.
 *
 * @remarks
 * This component handles layout and accessibility only.
 * Validation state must be supplied by the parent form.
 */
export type BaseFormFieldProps = {
  /** Visible label text. An invisible placeholder reserves height when empty. */
  label?: string
  /** Value for the `for` attribute and `aria-*` ID generation. */
  fieldName?: string
  /** Validation or server error message. Hidden when the field is disabled. */
  error?: string | null
  /** Shows a required asterisk next to the label. */
  required?: boolean
  /** Helper text shown when no error is present. */
  hint?: string
  /** Disables error display and dims the label. */
  disabled?: boolean
}

/** Discount an admin set on a price: a percent (1-99) or a fixed rupiah amount, optionally until `ends_at`. */
export type Discount = {
  type: "percent" | "fixed"
  value: number
  /** ISO date; `null` = until an admin removes it. May be in the past (then `final_price` equals `price`). */
  ends_at: string | null
}

/**
 * Price fields the API sends for every sellable item (event type package, add-on, guest quota tier).
 *
 * @remarks
 * `final_price` is what is charged now. Show `price` struck through only when `final_price` is lower.
 */
export type ItemPrice = {
  /** Normal price in whole rupiah. */
  price: number
  discount: Discount | null
  final_price: number
}
