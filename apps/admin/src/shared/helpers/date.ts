import { format, formatDistanceToNow, isValid, parseISO } from "date-fns"
import type { Locale } from "date-fns"
import { enUS, id } from "date-fns/locale"

import type { DateLocaleCode } from "../models"

/**
 * Maps vue-i18n locale codes to date-fns locale objects.
 *
 * @remarks
 * Keys must match the base locale codes configured in vue-i18n (e.g. `en`, `id`).
 */
export const DATE_FNS_LOCALES: Record<string, Locale> = {
  en: enUS,
  id,
}

/**
 * Normalizes a date input into a valid {@link Date} instance.
 *
 * @param date - ISO string or Date object.
 * @returns Parsed date, or `null` when the value is invalid.
 */
const toDate = (date: string | Date): Date | null => {
  const parsed = typeof date === "string" ? parseISO(date) : date
  return isValid(parsed) ? parsed : null
}

/**
 * Formats a date safely, returning a fallback when parsing fails.
 *
 * @param date - ISO string or Date object.
 * @param pattern - date-fns format pattern.
 * @param locale - date-fns locale used for month/day names.
 */
const formatSafe = (date: string | Date, pattern: string, locale: Locale): string => {
  const parsed = toDate(date)
  if (!parsed) return "-"

  return format(parsed, pattern, { locale })
}

/**
 * Formats a date into a readable string.
 *
 * @param date - ISO string or Date object.
 * @param localeCode - App locale code. Defaults to `"en"`.
 * @param pattern - date-fns format pattern. Defaults to `"dd MMM yyyy"`.
 * @returns Formatted date, or `"-"` when invalid.
 *
 * @example
 * formatDate("2025-01-21") // "21 Jan 2025"
 */
export const formatDate = (
  date: string | Date,
  localeCode: DateLocaleCode = "en",
  pattern = "dd MMM yyyy",
): string => {
  const locale = DATE_FNS_LOCALES[localeCode] ?? enUS
  return formatSafe(date, pattern, locale)
}

/**
 * Formats a date together with its time component.
 *
 * @param date - ISO string or Date object.
 * @param localeCode - App locale code. Defaults to `"en"`.
 * @param pattern - date-fns format pattern. Defaults to `"dd MMM yyyy, HH:mm"`.
 * @returns Formatted date-time, or `"-"` when invalid.
 *
 * @example
 * formatDateTime("2025-01-21T14:30:00") // "21 Jan 2025, 14:30"
 */
export const formatDateTime = (
  date: string | Date,
  localeCode: DateLocaleCode = "en",
  pattern = "dd MMM yyyy, HH:mm",
): string => {
  const locale = DATE_FNS_LOCALES[localeCode] ?? enUS
  return formatSafe(date, pattern, locale)
}

/**
 * Formats a timestamp as relative time from now.
 *
 * @param date - ISO string or Date object.
 * @param localeCode - App locale code. Defaults to `"en"`.
 * @returns Relative label such as `"5 minutes ago"`, or `"-"` when invalid.
 *
 * @remarks
 * Avoid date-only strings (`YYYY-MM-DD`) because timezone differences can
 * produce misleading relative results.
 */
export const formatTimeStampRelative = (
  date: string | Date,
  localeCode: DateLocaleCode = "en",
): string => {
  const parsed = toDate(date)
  if (!parsed) return "-"

  const locale = DATE_FNS_LOCALES[localeCode] ?? enUS

  return formatDistanceToNow(parsed, {
    addSuffix: true,
    locale,
  })
}

/**
 * Type guard for supported date locale codes.
 *
 * @param locale - Raw locale string, usually from vue-i18n.
 */
export const isSupportedDateLocale = (locale: string): locale is DateLocaleCode =>
  locale in DATE_FNS_LOCALES
