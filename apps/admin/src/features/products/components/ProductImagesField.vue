<script setup lang="ts">
import { useDropZone } from "@vueuse/core"
import { computed, ref, useTemplateRef } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"

import { compressToWebp, MAX_PRODUCT_IMAGE_MB, MAX_PRODUCT_IMAGES, PRODUCT_IMAGE_TYPES } from "../helpers/image"
import type { ImageForm } from "../helpers/form"
import { uploadProductImage } from "../services/api"

/**
 * Product photos: upload (button or drag & drop), reorder, remove. The first photo is the main one.
 *
 * @remarks
 * Files are compressed to WebP in the browser, then uploaded through the presigned flow. Removing a photo only
 * changes the form; the API deletes the file once the product is saved.
 */
defineProps<{ error?: string }>()
const images = defineModel<ImageForm[]>({ required: true })
const emit = defineEmits<{ uploading: [busy: boolean] }>()

const { showToast } = useAppToast()
const fileInput = useTemplateRef<HTMLInputElement>("fileInput")
const dropZone = useTemplateRef<HTMLElement>("dropZone")
const uploadingCount = ref(0)

const remaining = computed(() => MAX_PRODUCT_IMAGES - images.value.length - uploadingCount.value)

const fail = (description: string) => showToast.error({ title: translate("features.products.form.images.error_title"), description })

const uploadFiles = async (files: File[]) => {
  if (files.length > remaining.value) fail(translate("features.products.form.images.limit", { max: MAX_PRODUCT_IMAGES }))
  const accepted = files.slice(0, Math.max(remaining.value, 0))

  await Promise.all(
    accepted.map(async (file) => {
      if (!PRODUCT_IMAGE_TYPES.includes(file.type)) return fail(translate("features.products.form.images.type_invalid"))

      uploadingCount.value += 1
      emit("uploading", true)
      try {
        const compressed = await compressToWebp(file)
        if (compressed.size > MAX_PRODUCT_IMAGE_MB * 1024 * 1024) return fail(translate("features.products.form.images.too_large", { max: MAX_PRODUCT_IMAGE_MB }))
        const uploaded = await uploadProductImage(compressed)
        images.value = [...images.value, uploaded]
      } catch (error) {
        fail(getApiErrorMessage(error, translate("utils.common.load_error")))
      } finally {
        uploadingCount.value -= 1
        emit("uploading", uploadingCount.value > 0)
      }
    }),
  )
}

const onPick = (event: Event) => {
  const input = event.target as HTMLInputElement
  void uploadFiles(Array.from(input.files ?? []))
  input.value = ""
}

const { isOverDropZone } = useDropZone(dropZone, { onDrop: (files) => files && uploadFiles(files), dataTypes: PRODUCT_IMAGE_TYPES, multiple: true })

const move = (index: number, offset: -1 | 1) => {
  const next = [...images.value]
  const [moved] = next.splice(index, 1)
  next.splice(index + offset, 0, moved!)
  images.value = next
}

const remove = (index: number) => {
  images.value = images.value.filter((_, position) => position !== index)
}
</script>

<template>
  <div ref="dropZone" class="space-y-2">
    <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <li
        v-for="(image, index) in images"
        :key="image.storage_key"
        class="group relative aspect-square overflow-hidden rounded-lg border border-default bg-elevated"
      >
        <img :src="image.url" :alt="translate('features.products.form.images.title')" class="size-full object-contain" loading="lazy" />
        <UBadge v-if="index === 0" :label="translate('features.products.form.images.primary')" class="absolute top-2 left-2" size="sm" />
        <div class="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-default/90 p-1.5">
          <div class="flex gap-1">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="index === 0"
              :aria-label="translate('features.products.form.images.move_left')"
              @click="move(index, -1)"
            />
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="index === images.length - 1"
              :aria-label="translate('features.products.form.images.move_right')"
              @click="move(index, 1)"
            />
          </div>
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" :aria-label="translate('features.products.form.images.remove')" @click="remove(index)" />
        </div>
      </li>

      <li v-for="n in uploadingCount" :key="`uploading-${n}`" class="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-default bg-elevated text-sm text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        {{ translate("features.products.form.images.uploading") }}
      </li>

      <li v-if="remaining > 0">
        <button
          type="button"
          class="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm transition-colors"
          :class="[isOverDropZone ? 'border-primary bg-primary/10 text-primary' : 'border-accented text-muted hover:border-primary hover:text-primary', error ? 'border-error' : '']"
          @click="fileInput?.click()"
        >
          <UIcon name="i-lucide-image-plus" class="size-7" />
          {{ isOverDropZone ? translate("features.products.form.images.drop") : translate("features.products.form.images.add") }}
        </button>
      </li>
    </ul>
    <input ref="fileInput" type="file" :accept="PRODUCT_IMAGE_TYPES.join(',')" multiple class="hidden" @change="onPick" />
    <p v-if="error" class="text-sm text-error">{{ error }}</p>
  </div>
</template>
