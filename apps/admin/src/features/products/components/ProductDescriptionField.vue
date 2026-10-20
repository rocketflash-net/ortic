<script setup lang="ts">
import type { EditorToolbarItem } from "@nuxt/ui"

import { translate } from "@/plugins/language"

/**
 * Rich-text product description (HTML). The API sanitizes it on save and the store renders the cleaned HTML, so only
 * simple formatting is offered: headings, bold/italic/underline, lists, quotes, and links.
 */
defineProps<{ placeholder?: string; invalid?: boolean }>()
const html = defineModel<string>({ required: true })

const items: EditorToolbarItem[][] = [
  [
    { kind: "heading", level: 2, icon: "i-lucide-heading-2", "aria-label": translate("features.products.form.editor.heading") },
    { kind: "heading", level: 3, icon: "i-lucide-heading-3", "aria-label": translate("features.products.form.editor.subheading") },
  ],
  [
    { kind: "mark", mark: "bold", icon: "i-lucide-bold", "aria-label": translate("features.products.form.editor.bold") },
    { kind: "mark", mark: "italic", icon: "i-lucide-italic", "aria-label": translate("features.products.form.editor.italic") },
    { kind: "mark", mark: "underline", icon: "i-lucide-underline", "aria-label": translate("features.products.form.editor.underline") },
  ],
  [
    { kind: "bulletList", icon: "i-lucide-list", "aria-label": translate("features.products.form.editor.bullet_list") },
    { kind: "orderedList", icon: "i-lucide-list-ordered", "aria-label": translate("features.products.form.editor.ordered_list") },
    { kind: "blockquote", icon: "i-lucide-text-quote", "aria-label": translate("features.products.form.editor.quote") },
    { kind: "link", icon: "i-lucide-link", "aria-label": translate("features.products.form.editor.link") },
  ],
  [
    { kind: "clearFormatting", icon: "i-lucide-remove-formatting", "aria-label": translate("features.products.form.editor.clear") },
    { kind: "undo", icon: "i-lucide-undo-2", "aria-label": translate("features.products.form.editor.undo") },
    { kind: "redo", icon: "i-lucide-redo-2", "aria-label": translate("features.products.form.editor.redo") },
  ],
]
</script>

<template>
  <div class="overflow-hidden rounded-md border bg-default" :class="invalid ? 'border-error' : 'border-accented'">
    <UEditor v-slot="{ editor }" v-model="html" content-type="html" :image="false" :mention="false" :placeholder="placeholder" class="min-h-40 w-full">
      <UEditorToolbar :editor="editor" :items="items" class="overflow-x-auto border-b border-default px-2 py-1" />
    </UEditor>
  </div>
</template>
