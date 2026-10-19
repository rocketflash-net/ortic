<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from "@nuxt/ui"
import { useOverlay } from "@nuxt/ui/composables"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed } from "vue"

import { useAuthStore } from "@/features/authentication/stores/authentication.store"
import type { CustomerRole } from "@/features/customers/models"
import { customerQueryKeys } from "@/features/customers/services/api"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import ConfirmModal from "@/shared/components/ConfirmModal.vue"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"
import { getApiErrorMessage } from "@/shared/helpers/error"

import AddAdminModal from "../components/AddAdminModal.vue"
import type { AdminUser } from "../models"
import { adminUserQueryKeys, getAdminUsers, updateUserRole } from "../services/api"

/**
 * Admin accounts, managed by superadmins only.
 *
 * @remarks
 * A superadmin has full access; a regular admin has the admin panel but cannot manage admins. Every role change
 * signs that user out so it applies immediately. You cannot change your own role, and the API never demotes the last
 * superadmin.
 */
const { formatDate } = useDateFormatter()
const authStore = useAuthStore()
const queryClient = useQueryClient()
const { showToast } = useAppToast()
const overlay = useOverlay()
const addModal = overlay.create(AddAdminModal)
const confirmModal = overlay.create(ConfirmModal)

const adminsQuery = useQuery({
  queryKey: adminUserQueryKeys.all,
  queryFn: getAdminUsers,
  select: (response) => response.data ?? [],
})

const superadminCount = computed(() => adminsQuery.data.value?.filter((admin) => admin.role === "superadmin").length ?? 0)

const roleMutation = useMutation({
  mutationFn: ({ admin, role }: { admin: AdminUser; role: CustomerRole }) => updateUserRole(admin.id, role),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all })
    // The customer list shows each user's role.
    queryClient.invalidateQueries({ queryKey: customerQueryKeys.all })
    showToast.success({ title: translate("features.adminUsers.change.done") })
  },
  onError: (error) => {
    showToast.error({
      title: translate("features.adminUsers.change.error_title"),
      description: getApiErrorMessage(error, translate("utils.common.load_error")),
    })
  },
})

const confirmRoleChange = async (admin: AdminUser, role: CustomerRole) => {
  const confirmed = await confirmModal.open({
    title: translate(`features.adminUsers.change.${role}_title`),
    description: translate(`features.adminUsers.change.${role}_description`, { name: admin.name, email: admin.email }),
    confirmLabel: translate(`features.adminUsers.change.${role}_confirm`),
  })
  if (confirmed) roleMutation.mutate({ admin, role })
}

const isSelf = (admin: AdminUser) => admin.id === authStore.userData?.id

// Mirrors the API rule so the button explains itself instead of failing.
const isLastSuperadmin = (admin: AdminUser) => admin.role === "superadmin" && superadminCount.value <= 1

const actionsFor = (admin: AdminUser): DropdownMenuItem[][] => {
  const locked = isLastSuperadmin(admin)
  const otherRole = admin.role === "superadmin" ? "admin" : "superadmin"
  return [
    [
      {
        label: translate(`features.adminUsers.change.${otherRole}_action`),
        icon: otherRole === "superadmin" ? "i-lucide-shield-plus" : "i-lucide-shield",
        disabled: locked,
        onSelect: () => confirmRoleChange(admin, otherRole),
      },
    ],
    [
      {
        label: translate("features.adminUsers.change.user_action"),
        icon: "i-lucide-user-minus",
        color: "error",
        disabled: locked,
        onSelect: () => confirmRoleChange(admin, "user"),
      },
    ],
  ]
}

const actionHint = (admin: AdminUser) => {
  if (isSelf(admin)) return translate("features.adminUsers.self_hint")
  if (isLastSuperadmin(admin)) return translate("features.adminUsers.last_superadmin_hint")
  return translate("features.adminUsers.actions")
}

const columns: TableColumn<AdminUser>[] = [
  // `max-w-0` + `w-full` lets long names and emails truncate instead of pushing the other columns off screen.
  { accessorKey: "name", header: translate("features.adminUsers.table.admin"), meta: { class: { td: "w-full max-w-0" } } },
  { accessorKey: "role", header: translate("features.adminUsers.table.role") },
  { accessorKey: "created_at", header: translate("features.adminUsers.table.joined"), meta: { class: { th: "hidden sm:table-cell", td: "hidden sm:table-cell" } } },
  { id: "actions", meta: { class: { td: "w-px whitespace-nowrap" } } },
]
</script>

<template>
  <UDashboardPanel id="admin-users">
    <template #header>
      <UDashboardNavbar :title="translate('features.adminUsers.page_title')">
        <template #right>
          <UButton :label="translate('features.adminUsers.add')" icon="i-lucide-user-plus" @click="addModal.open({})" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        :description="translate('features.adminUsers.description')"
      />

      <QueryErrorAlert
        v-if="adminsQuery.isError.value"
        :title="translate('features.adminUsers.load_error')"
        :error="adminsQuery.error.value"
        @retry="adminsQuery.refetch()"
      />

      <UTable
        v-else
        :data="adminsQuery.data.value ?? []"
        :columns="columns"
        :loading="adminsQuery.isFetching.value"
        :ui="{ td: 'py-3' }"
      >
        <template #name-cell="{ row }">
          <div class="flex min-w-0 items-center gap-2">
            <UUser
              :name="row.original.name"
              :description="row.original.email"
              :avatar="{ src: row.original.avatar_url ?? undefined, alt: row.original.name, class: 'bg-elevated' }"
              :ui="{ root: 'min-w-0', wrapper: 'min-w-0', name: 'truncate', description: 'truncate' }"
            />
            <UBadge
              v-if="isSelf(row.original)"
              :label="translate('features.adminUsers.you')"
              color="neutral"
              variant="subtle"
              class="shrink-0"
            />
          </div>
        </template>

        <template #role-cell="{ row }">
          <UBadge
            :label="translate(`features.adminUsers.roles.${row.original.role}`)"
            :color="row.original.role === 'superadmin' ? 'primary' : 'neutral'"
            variant="subtle"
          />
        </template>

        <template #created_at-cell="{ row }">
          <span class="text-toned">{{ formatDate(row.original.created_at) }}</span>
        </template>

        <template #actions-cell="{ row }">
          <UTooltip :text="actionHint(row.original)">
            <!-- Own role is never editable; the wrapper keeps the tooltip working on a disabled button. -->
            <span class="inline-flex">
              <UDropdownMenu :items="actionsFor(row.original)" :disabled="isSelf(row.original)" :content="{ align: 'end' }">
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :aria-label="translate('features.adminUsers.actions')"
                  :disabled="isSelf(row.original)"
                  :loading="roleMutation.isPending.value && roleMutation.variables.value?.admin.id === row.original.id"
                />
              </UDropdownMenu>
            </span>
          </UTooltip>
        </template>

        <template #empty>
          <UEmpty icon="i-lucide-shield" :title="translate('features.adminUsers.empty')" variant="naked" />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
