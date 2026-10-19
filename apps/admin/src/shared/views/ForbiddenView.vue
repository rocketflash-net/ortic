<script setup lang="ts">
import { translate } from "@/plugins/language"

import { DashboardPageName } from "@/features/dashboard/models"
</script>

<template>
  <!-- In the Vue build UError's own "clear" is a no-op, so the button navigates with `to`. -->
  <UError
    icon="i-lucide-shield-x"
    :error="{
      statusCode: 403,
      statusMessage: translate('utils.errors.forbidden_title'),
      message: translate('utils.errors.forbidden_description'),
    }"
    :clear="{ label: translate('utils.errors.back_home'), to: { name: DashboardPageName.DASHBOARD }, size: 'lg' }"
    class="min-h-dvh"
  />
</template>
