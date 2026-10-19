<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"

/**
 * Opens picker content (calendar, time lists, …) as a popover on larger screens and as a bottom sheet on
 * phones, where a small floating panel is hard to reach and easily covered by the keyboard.
 *
 * @remarks
 * Put the trigger button in the default slot and the picker in `#content`. Close it from the content with
 * the `close` slot prop or by setting `v-model:open`.
 */
defineProps<{
  /** Heading of the bottom sheet; also its accessible name. Popovers do not show it. */
  title: string
  /** Element the popover is positioned against, e.g. the whole input instead of the trigger icon. */
  reference?: HTMLElement
}>()

const open = defineModel<boolean>("open", { default: false })

const isDesktop = useBreakpoints(breakpointsTailwind).greaterOrEqual("sm")

const close = () => {
  open.value = false
}
</script>

<template>
  <UPopover v-if="isDesktop" v-model:open="open" :reference="reference" :content="{ align: 'start', side: 'bottom' }">
    <slot />
    <template #content>
      <slot name="content" :close="close" />
    </template>
  </UPopover>

  <UDrawer v-else v-model:open="open" :title="title" :ui="{ body: 'flex justify-center' }">
    <slot />
    <template #body>
      <slot name="content" :close="close" />
    </template>
  </UDrawer>
</template>
