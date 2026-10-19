<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui"
import { useOverlay } from "@nuxt/ui/composables"
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"

import { translate } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { Permission } from "@/shared/models/access"
import { useAccessStore } from "@/shared/stores/useAccessStore"

import WarehouseFormModal from "../components/WarehouseFormModal.vue"
import type { Warehouse } from "../models"
import { getWarehouses, warehouseQueryKeys } from "../services/api"

/**
 * Warehouse settings. Staff can see where orders ship from; only the Owner adds or edits a warehouse.
 */
const accessStore = useAccessStore()
const overlay = useOverlay()
const formModal = overlay.create(WarehouseFormModal)

const canManage = computed(() => accessStore.hasPermission(Permission.WAREHOUSES_MANAGE))

const warehousesQuery = useQuery({
  queryKey: warehouseQueryKeys.all,
  queryFn: getWarehouses,
  select: (response) => response.data ?? [],
})

const statusOf = (warehouse: Warehouse) => {
  if (!warehouse.is_active) return { label: translate("features.warehouses.status.inactive"), color: "neutral" as const }
  if (!warehouse.is_shipping_ready) return { label: translate("features.warehouses.status.incomplete"), color: "warning" as const }
  return { label: translate("features.warehouses.status.ready"), color: "success" as const }
}

const columns = computed<TableColumn<Warehouse>[]>(() => [
  { accessorKey: "name", header: translate("features.warehouses.table.warehouse") },
  { accessorKey: "address", header: translate("features.warehouses.table.address"), meta: { class: { td: "w-full max-w-0" } } },
  { accessorKey: "pickup_time", header: translate("features.warehouses.table.pickup"), meta: { class: { th: "hidden sm:table-cell", td: "hidden sm:table-cell" } } },
  { accessorKey: "pic_name", header: translate("features.warehouses.table.pic"), meta: { class: { th: "hidden md:table-cell", td: "hidden md:table-cell" } } },
  ...(canManage.value ? [{ id: "actions", meta: { class: { td: "w-px whitespace-nowrap" } } }] : []),
])
</script>

<template>
  <UDashboardPanel id="warehouses">
    <template #header>
      <UDashboardNavbar :title="translate('features.warehouses.page_title')">
        <template #right>
          <UButton v-if="canManage" :label="translate('features.warehouses.add')" icon="i-lucide-plus" @click="formModal.open({})" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert color="neutral" variant="subtle" icon="i-lucide-info" :description="translate('features.warehouses.description')" class="shrink-0" />
      <UAlert v-if="!canManage" color="neutral" variant="outline" icon="i-lucide-lock" :description="translate('features.warehouses.owner_only')" class="shrink-0" />

      <QueryErrorAlert
        v-if="warehousesQuery.isError.value"
        :title="translate('features.warehouses.load_error')"
        :error="warehousesQuery.error.value"
        @retry="warehousesQuery.refetch()"
      />

      <UTable v-else :data="warehousesQuery.data.value ?? []" :columns="columns" :loading="warehousesQuery.isFetching.value" :ui="{ td: 'py-3' }">
        <template #name-cell="{ row }">
          <div class="flex flex-col gap-1">
            <span class="font-medium text-highlighted">{{ row.original.name }}</span>
            <div class="flex items-center gap-1.5">
              <UBadge :label="row.original.code" color="neutral" variant="outline" size="sm" />
              <UBadge :label="statusOf(row.original).label" :color="statusOf(row.original).color" variant="subtle" size="sm" />
            </div>
          </div>
        </template>

        <template #address-cell="{ row }">
          <p class="truncate text-toned">{{ row.original.address }}</p>
          <p class="truncate text-sm text-muted">
            {{ [row.original.district, row.original.city, row.original.province, row.original.postal_code].filter(Boolean).join(", ") }}
          </p>
        </template>

        <template #pickup_time-cell="{ row }">
          <span class="text-toned">{{ row.original.pickup_time }} WIB</span>
        </template>

        <template #pic_name-cell="{ row }">
          <span class="text-toned">{{ row.original.pic_name ?? "–" }}</span>
        </template>

        <template #actions-cell="{ row }">
          <UButton :label="translate('features.warehouses.edit')" icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" @click="formModal.open({ warehouse: row.original })" />
        </template>

        <template #empty>
          <UEmpty icon="i-lucide-warehouse" :title="translate('features.warehouses.empty')" variant="naked" />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
