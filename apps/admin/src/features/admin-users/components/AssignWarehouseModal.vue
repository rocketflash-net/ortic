<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"

import { getWarehouses, warehouseQueryKeys } from "@/features/warehouses/services/api"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"

import type { AdminUser } from "../models"
import { adminUserQueryKeys, updateAdminWarehouse } from "../services/api"

/** Ties a Staf to one warehouse (they then only see its orders, stock, and notifications), or to all warehouses. */
const props = defineProps<{ admin: AdminUser }>()
const emit = defineEmits<{ close: [saved?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()

const ALL = 0
const selected = ref<number>(props.admin.warehouse_id ?? ALL)

const warehousesQuery = useQuery({ queryKey: warehouseQueryKeys.all, queryFn: getWarehouses, select: (response) => response.data ?? [] })
const items = computed(() => [
  { label: translate("features.adminUsers.warehouse.all"), value: ALL },
  ...(warehousesQuery.data.value ?? []).map((warehouse) => ({ label: warehouse.name, value: warehouse.id })),
])

const { mutate, isPending } = useMutation({
  mutationFn: () => updateAdminWarehouse(props.admin.id, selected.value === ALL ? null : selected.value),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all })
    showToast.success({ title: translate("features.adminUsers.warehouse.saved") })
    emit("close", true)
  },
  onError: (error) => showToast.error({ title: translate("features.adminUsers.warehouse.error"), description: getApiErrorMessage(error, translate("utils.common.load_error")) }),
})
</script>

<template>
  <UModal
    :title="translate('features.adminUsers.warehouse.title', { name: admin.name })"
    :description="translate('features.adminUsers.warehouse.description')"
    :close="{ onClick: () => emit('close') }"
  >
    <template #body>
      <UFormField :label="translate('features.adminUsers.warehouse.label')">
        <USelect v-model="selected" :items="items" :loading="warehousesQuery.isPending.value" class="w-full" />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton :label="translate('utils.common.save')" :loading="isPending" @click="mutate()" />
      </div>
    </template>
  </UModal>
</template>
