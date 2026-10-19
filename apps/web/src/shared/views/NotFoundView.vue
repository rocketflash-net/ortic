<script setup lang="ts">
import { translate } from "@/plugins/language"

import { HomePageName } from "@/features/home/models"
</script>

<template>
  <!-- In the Vue build UError's own "clear" is a no-op, so the button navigates with `to`. -->
  <UError
    icon="i-lucide-map-pin-off"
    :error="{
      statusCode: 404,
      statusMessage: translate('utils.errors.not_found_title'),
      message: translate('utils.errors.not_found_description'),
    }"
    :clear="{ label: translate('utils.errors.back_home'), to: { name: HomePageName.HOME }, size: 'lg' }"
    class="min-h-dvh"
  />
</template>
