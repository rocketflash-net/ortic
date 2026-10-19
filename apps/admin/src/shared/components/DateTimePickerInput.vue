<script setup lang="ts">
import { type CalendarDate, CalendarDateTime, toCalendarDate, today, getLocalTimeZone } from "@internationalized/date"
import { computed, ref, watch } from "vue"

import { translate } from "@/plugins/language"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"

import ResponsivePicker from "./ResponsivePicker.vue"

/**
 * Date and 24-hour time in one field, shown as "12 Oktober 2026, 23:45". Clicking the field opens a calendar
 * with hour and minute dropdowns (a bottom sheet on phones, see {@link ResponsivePicker}); the choice is
 * applied with "Pilih", so browsing the calendar never changes the value by accident.
 */
const props = defineProps<{
  /** Field label; heads the bottom sheet on phones and names the field for screen readers. */
  label: string
  /** Suggested date and time while the field is empty, e.g. two hours after the start for an end time. */
  suggestion?: CalendarDateTime
  /** Shows a button that empties the field, for optional values. */
  clearable?: boolean
  /** Marks the field as invalid; pass the `error` slot prop of the surrounding `UFormField`. */
  invalid?: boolean
}>()

const value = defineModel<CalendarDateTime | null | undefined>({ required: true })

/** Start time offered for a new event when nothing else suggests one. */
const DEFAULT_HOUR = 9

const { formatDateTime } = useDateFormatter()

const toLocalDate = (picked: CalendarDateTime) =>
  new Date(picked.year, picked.month - 1, picked.day, picked.hour, picked.minute)

/** The picked value as people read it, e.g. "12 Oktober 2026, 23:45". */
const display = computed(() => (value.value ? formatDateTime(toLocalDate(value.value), "d MMMM yyyy, HH:mm") : ""))

const isOpen = ref(false)

// The picker edits a draft; the value only changes when the user confirms.
const draftDate = ref<CalendarDate>()
const draftHour = ref(DEFAULT_HOUR)
const draftMinute = ref(0)

watch(isOpen, (open) => {
  if (!open) return
  const start = value.value ?? props.suggestion
  draftDate.value = start ? toCalendarDate(start) : today(getLocalTimeZone())
  draftHour.value = start?.hour ?? DEFAULT_HOUR
  draftMinute.value = start?.minute ?? 0
})

const draftValue = computed(() => {
  const date = draftDate.value
  if (!date) return undefined
  return new CalendarDateTime(date.year, date.month, date.day, draftHour.value, draftMinute.value)
})

/** Summary above the buttons, e.g. "Minggu, 20 Desember 2026, 08:00". */
const draftSummary = computed(() =>
  draftValue.value ? formatDateTime(toLocalDate(draftValue.value), "EEEE, d MMMM yyyy, HH:mm") : "",
)

const confirm = () => {
  if (!draftValue.value) return
  value.value = draftValue.value
  isOpen.value = false
}
const cancel = () => {
  isOpen.value = false
}

const pad = (number: number) => String(number).padStart(2, "0")
const HOUR_ITEMS = Array.from({ length: 24 }, (_, hour) => ({ label: pad(hour), value: hour }))
const MINUTE_ITEMS = Array.from({ length: 60 }, (_, minute) => ({ label: pad(minute), value: minute }))
</script>

<template>
  <div class="relative w-full">
    <ResponsivePicker v-model:open="isOpen" :title="label">
      <button
        type="button"
        :aria-label="`${label}: ${display || translate('utils.common.pick_date_time')}`"
        class="flex w-full cursor-pointer items-center gap-2 rounded-md bg-elevated/50 px-3 py-2 text-start text-base transition-colors hover:bg-elevated focus-visible:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
        :class="[clearable && value ? 'pe-10' : undefined, invalid ? 'ring ring-error ring-inset' : undefined]"
        :aria-invalid="invalid || undefined"
      >
        <UIcon name="i-lucide-calendar-clock" class="size-6 shrink-0 text-dimmed" />
        <span class="min-w-0 flex-1 truncate" :class="display ? 'text-highlighted' : 'text-dimmed'">
          {{ display || translate("utils.common.pick_date_time") }}
        </span>
      </button>

      <template #content>
        <div class="mx-auto w-full max-w-sm">
          <UCalendar v-model="draftDate" class="p-3" />

          <div class="flex items-center gap-2 border-t border-default px-3 py-3">
            <UIcon name="i-lucide-clock" class="size-5 shrink-0 text-dimmed" />
            <span class="me-auto text-sm font-medium text-default">{{ translate("utils.common.time") }}</span>
            <USelect
              v-model="draftHour"
              :items="HOUR_ITEMS"
              size="md"
              :aria-label="translate('utils.common.hour')"
              :ui="{ base: '!w-24 tabular-nums', content: 'max-h-60' }"
            />
            <span class="font-semibold text-muted" aria-hidden="true">:</span>
            <USelect
              v-model="draftMinute"
              :items="MINUTE_ITEMS"
              size="md"
              :aria-label="translate('utils.common.minute')"
              :ui="{ base: '!w-24 tabular-nums', content: 'max-h-60' }"
            />
          </div>

          <div class="space-y-3 border-t border-default p-3">
            <p class="text-center text-sm text-muted" aria-live="polite">{{ draftSummary }}</p>
            <div class="flex gap-2">
              <UButton
                :label="translate('utils.common.cancel')"
                color="neutral"
                variant="outline"
                size="md"
                block
                class="flex-1"
                @click="cancel"
              />
              <UButton
                :label="translate('utils.common.choose')"
                size="md"
                block
                class="flex-1"
                :disabled="!draftValue"
                @click="confirm"
              />
            </div>
          </div>
        </div>
      </template>
    </ResponsivePicker>

    <UButton
      v-if="clearable && value"
      color="neutral"
      variant="link"
      size="sm"
      icon="i-lucide-x"
      class="absolute end-2 top-1/2 -translate-y-1/2 px-1"
      :aria-label="translate('utils.common.clear_value', { label })"
      @click="value = undefined"
    />
  </div>
</template>
