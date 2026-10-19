import { computed } from "vue"
import { useI18n } from "vue-i18n"

import {
  formatDate,
  formatDateTime,
  formatTimeStampRelative,
  isSupportedDateLocale,
} from "@/shared/helpers/date"

import type { DateLocaleCode } from "../models"

/**
 * Locale-aware date formatting helpers bound to the active vue-i18n locale.
 *
 * @returns Formatter functions that automatically resolve the current locale.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { formatDate, formatRelativeTime } = useDateFormatter()
 * </script>
 *
 * <template>
 *   <span>{{ formatDate(order.createdAt) }}</span>
 * </template>
 * ```
 */
export const useDateFormatter = () => {
  const { locale } = useI18n()

  /** Normalized locale code supported by {@link DATE_FNS_LOCALES}. */
  const resolvedLocale = computed<DateLocaleCode>(() => {
    const rawLocale = locale.value || "en"
    const [baseLocale = "en"] = rawLocale.split("-")

    if (isSupportedDateLocale(baseLocale)) {
      return baseLocale
    }

    return "en"
  })

  /**
   * Formats a date using the active i18n locale.
   *
   * @param date - ISO string or Date object.
   * @param pattern - Optional date-fns format pattern override.
   */
  const formatDateWithLocale = (date: string | Date, pattern?: string) => {
    return formatDate(date, resolvedLocale.value, pattern)
  }

  /**
   * Formats a date-time value using the active i18n locale.
   *
   * @param date - ISO string or Date object.
   * @param pattern - Optional date-fns format pattern override.
   */
  const formatDateTimeWithLocale = (date: string | Date, pattern?: string) => {
    return formatDateTime(date, resolvedLocale.value, pattern)
  }

  /**
   * Formats a timestamp as relative time using the active i18n locale.
   *
   * @param date - ISO string or Date object.
   */
  const formatRelativeTimeWithLocale = (date: string | Date) => {
    return formatTimeStampRelative(date, resolvedLocale.value)
  }

  return {
    formatDate: formatDateWithLocale,
    formatDateTime: formatDateTimeWithLocale,
    formatRelativeTime: formatRelativeTimeWithLocale,
  }
}
