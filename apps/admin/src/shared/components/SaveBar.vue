<script setup lang="ts">
import { ref } from "vue"

import { translate } from "@/plugins/language"

/**
 * Save buttons pinned to the bottom of a dashboard panel. Put it in `UDashboardPanel`'s `#footer` slot so it
 * stays visible while the body scrolls.
 */
defineProps<{
  /** True while there are changes that are not saved yet; the buttons are disabled otherwise. */
  dirty: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  /** `back` is true when the user wants to leave the page once the save succeeds. */
  save: [back: boolean]
}>()

/** Button that started the current save, so only that one shows the spinner. */
const pressed = ref<"save" | "back">()

const onClick = (back: boolean) => {
  pressed.value = back ? "back" : "save"
  emit("save", back)
}
</script>

<template>
  <div class="space-y-2 border-t border-default px-4 py-3 sm:px-6">
    <p v-if="dirty" class="text-center text-sm text-muted" role="status">
      {{ translate("utils.common.unsaved_hint") }}
    </p>
    <div class="flex gap-3">
      <UButton
        :label="translate('utils.common.save')"
        icon="i-lucide-save"
        size="lg"
        color="neutral"
        variant="outline"
        block
        class="flex-1"
        :loading="saving && pressed === 'save'"
        :disabled="!dirty || saving"
        @click="onClick(false)"
      />
      <UButton
        :label="translate('utils.common.save_and_back')"
        icon="i-lucide-check"
        size="lg"
        block
        class="flex-1"
        :loading="saving && pressed === 'back'"
        :disabled="!dirty || saving"
        @click="onClick(true)"
      />
    </div>
  </div>
</template>
