<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import { translate } from "@/plugins/language"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"

import { notificationStyle, type AdminNotification } from "../models"
import { getNotifications, markNotificationsRead, notificationQueryKeys } from "../services/api"

/**
 * Bell with the unread count; the popover lists the latest notifications. Opening a notification follows its link.
 * New notifications arrive through the SSE stream started by the layout (`useNotificationStream`).
 */
withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false })

const queryClient = useQueryClient()
const router = useRouter()
const { formatRelativeTime } = useDateFormatter()
const open = ref(false)

const listQuery = useQuery({ queryKey: notificationQueryKeys.all, queryFn: () => getNotifications(15), refetchInterval: 5 * 60 * 1000 })
const items = computed(() => listQuery.data.value?.data ?? [])
const unread = computed(() => listQuery.data.value?.additionalInfo.unread_count ?? 0)

const { mutate: markRead } = useMutation({
  mutationFn: markNotificationsRead,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
})

const select = (notification: AdminNotification) => {
  open.value = false
  if (notification.link) void router.push(notification.link)
}

// Opening the popover counts as reading the list.
const onOpenChange = (value: boolean) => {
  open.value = value
  if (!value && unread.value > 0) markRead()
}
</script>

<template>
  <UPopover :open="open" :content="{ side: collapsed ? 'right' : 'bottom', align: 'start' }" @update:open="onOpenChange">
    <UButton color="neutral" variant="ghost" square :aria-label="translate('features.notifications.open')" class="relative">
      <UIcon name="i-lucide-bell" class="size-5" />
      <span
        v-if="unread > 0"
        class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] leading-none font-semibold text-white tabular-nums"
      >
        {{ unread > 99 ? "99+" : unread }}
      </span>
    </UButton>

    <template #content>
      <div class="w-80 max-w-[calc(100vw-2rem)]">
        <div class="flex items-center justify-between border-b border-default px-3 py-2">
          <p class="font-semibold text-highlighted">{{ translate("features.notifications.title") }}</p>
          <UButton v-if="unread > 0" :label="translate('features.notifications.mark_read')" size="xs" variant="link" class="px-0" @click="markRead()" />
        </div>

        <p v-if="listQuery.isError.value" class="p-4 text-sm text-error">{{ translate("features.notifications.load_error") }}</p>
        <p v-else-if="items.length === 0" class="p-4 text-sm text-muted">{{ translate("features.notifications.empty") }}</p>

        <ul v-else class="max-h-96 divide-y divide-default overflow-y-auto">
          <li v-for="notification in items" :key="notification.id">
            <button
              type="button"
              class="flex w-full gap-3 px-3 py-2.5 text-left transition hover:bg-elevated"
              :class="notification.is_read ? '' : 'bg-primary/5'"
              @click="select(notification)"
            >
              <UIcon :name="notificationStyle(notification.type).icon" class="mt-0.5 size-5 shrink-0" :class="notificationStyle(notification.type).textClass" />
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium text-highlighted">{{ notification.title }}</span>
                <span v-if="notification.body" class="block truncate text-xs text-muted">{{ notification.body }}</span>
                <span class="block text-xs text-dimmed">{{ formatRelativeTime(notification.created_at) }}</span>
              </span>
              <span v-if="!notification.is_read" class="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </div>
    </template>
  </UPopover>
</template>
