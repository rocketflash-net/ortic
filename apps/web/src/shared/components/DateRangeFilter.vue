<script setup lang="ts">
import { type DateValue, parseDate, toCalendarDate } from "@internationalized/date"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import { computed, useTemplateRef } from "vue"

import { translate } from "@/plugins/language"

/**
 * Date range filter: typed segments (`UInputDate`) with a calendar popover (`UCalendar`).
 *
 * @remarks
 * The models are `YYYY-MM-DD` strings (empty = unbounded) so they can live in the URL and go to the API as-is.
 */
const from = defineModel<string>("from", { required: true })
const to = defineModel<string>("to", { required: true })

const inputDate = useTemplateRef("inputDate")
const isDesktop = useBreakpoints(breakpointsTailwind).greaterOrEqual("sm")

const parse = (value: string): DateValue | undefined => {
  if (!value) return undefined
  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

const format = (value: DateValue | undefined): string => (value ? toCalendarDate(value).toString() : "")

const range = computed({
  get: () => ({ start: parse(from.value), end: parse(to.value) }),
  set: (value: { start?: DateValue; end?: DateValue } | null | undefined) => {
    from.value = format(value?.start)
    to.value = format(value?.end)
  },
})

const hasValue = computed(() => Boolean(from.value || to.value))

const clear = () => {
  range.value = null
}
</script>

<template>
  <UInputDate ref="inputDate" v-model="range" range size="md" class="w-full sm:w-auto">
    <template #trailing>
      <UButton
        v-if="hasValue"
        color="neutral"
        variant="link"
        size="sm"
        icon="i-lucide-x"
        class="ms-1 px-0"
        :aria-label="translate('utils.common.clear_dates')"
        @click="clear"
      />

      <UPopover :reference="inputDate?.inputsRef[0]?.$el">
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-calendar"
          class="px-0"
          :aria-label="translate('utils.common.pick_dates')"
        />

        <template #content>
          <UCalendar v-model="range" range class="p-2" :number-of-months="isDesktop ? 2 : 1" />
        </template>
      </UPopover>
    </template>
  </UInputDate>
</template>
