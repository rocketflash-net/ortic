<script setup lang="ts">
import type { OrderStatusType } from "@ortic/shared"

import { translate } from "@/plugins/language"

/** Order status pill in the store palette. */
defineProps<{ status: OrderStatusType }>()

const STATUS_CLASS: Record<OrderStatusType, string> = {
  awaiting_payment: "bg-ortic-yellow text-ortic-ink",
  paid: "bg-ortic-blue text-white",
  awaiting_confirmation: "bg-ortic-blue text-white",
  processing: "bg-ortic-blue text-white",
  awaiting_pickup: "bg-ortic-blue text-white",
  shipped: "bg-ortic-blue text-white",
  completed: "bg-emerald-600 text-white",
  cancelled: "bg-zinc-200 text-zinc-700",
  rejected: "bg-ortic-red text-white",
  returned: "bg-zinc-200 text-zinc-700",
  needs_action: "bg-ortic-red text-white",
}
</script>

<template>
  <span class="inline-flex shrink-0 items-center rounded-full border-2 border-ortic-ink px-3 py-0.5 text-xs font-semibold" :class="STATUS_CLASS[status]">
    {{ translate(`features.orders.status.${status}`) }}
  </span>
</template>
