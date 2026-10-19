<script setup lang="ts">
import { translate } from "@/plugins/language"

/**
 * Toolbar search field with a clear button.
 *
 * @remarks
 * Emits raw keystrokes; debounce in the parent (e.g. `refDebounced`) before querying.
 */
defineProps<{
  placeholder: string
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <UInput
    v-model="model"
    icon="i-lucide-search"
    size="md"
    variant="outline"
    type="search"
    :placeholder="placeholder"
    :aria-label="placeholder"
    class="w-full"
  >
    <template v-if="model" #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        icon="i-lucide-x"
        :aria-label="translate('utils.common.clear_search')"
        @click="model = ''"
      />
    </template>
  </UInput>
</template>
