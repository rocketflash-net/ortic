<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import SaveBar from "@/shared/components/SaveBar.vue"
import { useUnsavedChangesGuard } from "@/shared/composables/useUnsavedChangesGuard"
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/helpers/error"
import { formatNumber } from "@/shared/helpers/number"
import { Permission } from "@/shared/models/access"
import { useAccessStore } from "@/shared/stores/useAccessStore"

import ProductImagesField from "../components/ProductImagesField.vue"
import ProductVariantsField from "../components/ProductVariantsField.vue"
import { emptyProductForm, formSnapshot, rowKey, toProductForm, toProductPayload, type ProductForm } from "../helpers/form"
import { MAX_PRODUCT_IMAGES } from "../helpers/image"
import { PRODUCT_STATUSES, ProductsPageName, type ProductDetail } from "../models"
import {
  createBrand,
  createProduct,
  getBrands,
  getCategories,
  getPricingDefaults,
  getProduct,
  productQueryKeys,
  updateProduct,
} from "../services/api"

/**
 * Add or edit a product: info, photos, variants & prices, status. One save sends everything.
 *
 * @remarks
 * Base prices and markups are only shown to the Owner (`prices:manage`). API field errors (422/409) are shown
 * next to their fields.
 */
const props = defineProps<{ id?: string }>()

const router = useRouter()
const queryClient = useQueryClient()
const accessStore = useAccessStore()
const { showToast } = useAppToast()

const productId = computed(() => (props.id ? Number(props.id) : undefined))
const isEdit = computed(() => productId.value !== undefined)
const canManagePrices = computed(() => accessStore.hasPermission(Permission.PRICES_MANAGE))

const productQuery = useQuery({
  queryKey: computed(() => productQueryKeys.detail(productId.value ?? 0)),
  queryFn: () => getProduct(productId.value!),
  enabled: isEdit,
  select: (response) => response.data!,
})
const categoriesQuery = useQuery({ queryKey: productQueryKeys.categories, queryFn: getCategories, select: (response) => response.data ?? [] })
const brandsQuery = useQuery({ queryKey: productQueryKeys.brands, queryFn: getBrands, select: (response) => response.data ?? [] })
const pricingQuery = useQuery({
  queryKey: productQueryKeys.pricingDefaults,
  queryFn: getPricingDefaults,
  enabled: canManagePrices,
  select: (response) => response.data!,
})

const form = ref<ProductForm>(emptyProductForm())
const savedSnapshot = ref(formSnapshot(form.value))
const fieldErrors = ref<Record<string, string>>({})
const isUploading = ref(false)

const load = (product: ProductDetail) => {
  form.value = toProductForm(product)
  savedSnapshot.value = formSnapshot(form.value)
  fieldErrors.value = {}
}
watch(() => productQuery.data.value, (product) => product && load(product), { immediate: true })

const isDirty = computed(() => formSnapshot(form.value) !== savedSnapshot.value)
useUnsavedChangesGuard(isDirty)

const title = computed(() => (isEdit.value ? form.value.name || translate("features.products.form.edit_title") : translate("features.products.form.create_title")))

const categoryItems = computed(() => (categoriesQuery.data.value ?? []).map((category) => ({ label: category.name, value: category.id })))
const brandItems = computed(() => (brandsQuery.data.value ?? []).map((brand) => ({ label: brand.name, value: brand.id })))
const statusItems = computed(() => PRODUCT_STATUSES.map((status) => ({ label: translate(`features.products.status.${status}`), value: status })))
const globalMarkupLabel = computed(() => formatNumber(pricingQuery.data.value?.markup_percent ?? 0, "id-ID", 2))

const { mutate: addBrand, isPending: isAddingBrand } = useMutation({
  mutationFn: (name: string) => createBrand(name),
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.brands })
    form.value.brand_id = response.data!.id
    showToast.success({ title: translate("features.products.form.info.brand_created", { name: response.data!.name }) })
  },
  onError: (error) => showToast.error({ title: translate("features.products.form.info.brand_error"), description: getApiErrorMessage(error) }),
})

const addSpec = () => form.value.specs.push({ key: rowKey(), name: "", value: "" })
const removeSpec = (key: string) => {
  form.value.specs = form.value.specs.filter((spec) => spec.key !== key)
}

const { mutate: save, isPending: isSaving } = useMutation({
  mutationFn: ({ back: _back }: { back: boolean }) => {
    const payload = toProductPayload(form.value, canManagePrices.value)
    return productId.value ? updateProduct(productId.value, payload) : createProduct(payload)
  },
  onSuccess: (response, { back }) => {
    const product = response.data!
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    queryClient.setQueryData(productQueryKeys.detail(product.id), response)
    load(product)
    showToast.success({ title: translate("features.products.form.saved") })
    if (back) router.push({ name: ProductsPageName.PRODUCTS })
    else if (!isEdit.value) router.replace({ name: ProductsPageName.PRODUCT_EDIT, params: { id: product.id } })
  },
  onError: (error) => {
    const errors = getApiFieldErrors(error)
    fieldErrors.value = Object.fromEntries(errors.map((item) => [item.field, item.message]))
    showToast.error({
      title: translate("features.products.form.save_error"),
      description: errors.length ? translate("features.products.form.fix_fields") : getApiErrorMessage(error, translate("utils.common.load_error")),
    })
  },
})

const canSave = computed(() => isDirty.value && !isUploading.value && form.value.name.trim().length >= 2 && form.value.category_id !== undefined)
</script>

<template>
  <UDashboardPanel id="product-form">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" :to="{ name: ProductsPageName.PRODUCTS }" :aria-label="translate('features.products.form.back')" />
        </template>
        <template #right>
          <UBadge v-if="isEdit" :label="translate(`features.products.status.${form.status}`)" :color="form.status === 'active' ? 'success' : 'neutral'" variant="subtle" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <QueryErrorAlert v-if="productQuery.isError.value" :title="translate('features.products.form.load_error')" :error="productQuery.error.value" @retry="productQuery.refetch()" />

      <div v-else-if="isEdit && productQuery.isPending.value" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>

      <div v-else class="grid shrink-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0 space-y-6">
          <!-- Info -->
          <UCard :ui="{ body: 'grid gap-x-4 gap-y-3 sm:grid-cols-2' }">
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.products.form.info.title") }}</h2>
            </template>

            <UFormField :label="translate('features.products.form.info.name')" :error="fieldErrors.name" required class="sm:col-span-2">
              <UInput v-model="form.name" maxlength="200" :placeholder="translate('features.products.form.info.name_placeholder')" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.products.form.info.category')" :error="fieldErrors.category_id" required>
              <USelect
                v-model="form.category_id"
                :items="categoryItems"
                :loading="categoriesQuery.isPending.value"
                :placeholder="translate('features.products.form.info.category_placeholder')"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="translate('features.products.form.info.brand')" :error="fieldErrors.brand_id">
              <USelectMenu
                v-model="form.brand_id"
                :items="brandItems"
                value-key="value"
                :loading="brandsQuery.isPending.value || isAddingBrand"
                :placeholder="translate('features.products.form.info.brand_placeholder')"
                create-item
                clear
                class="w-full"
                @create="addBrand"
              />
            </UFormField>
            <UFormField :label="translate('features.products.form.info.description')" :error="fieldErrors.description" class="sm:col-span-2">
              <UTextarea v-model="form.description" :rows="5" autoresize maxlength="20000" :placeholder="translate('features.products.form.info.description_placeholder')" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.products.form.info.permit_number')" :error="fieldErrors.permit_number">
              <UInput v-model="form.permit_number" maxlength="64" :placeholder="translate('features.products.form.info.permit_placeholder')" class="w-full" />
            </UFormField>
            <div class="flex items-end pb-1">
              <USwitch v-model="form.is_hazardous" :label="translate('features.products.form.info.hazardous')" :description="translate('features.products.form.info.hazardous_help')" />
            </div>
          </UCard>

          <!-- Photos -->
          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.products.form.images.title") }}</h2>
              <p class="text-sm text-muted">{{ translate("features.products.form.images.description", { max: MAX_PRODUCT_IMAGES }) }}</p>
            </template>
            <ProductImagesField v-model="form.images" :error="fieldErrors.images" @uploading="isUploading = $event" />
          </UCard>

          <!-- Variants -->
          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.products.form.variants.title") }}</h2>
              <p class="text-sm text-muted">{{ translate("features.products.form.variants.description") }}</p>
            </template>
            <ProductVariantsField
              v-model="form.variants"
              :can-manage-prices="canManagePrices"
              :product-markup="form.markup_percent"
              :pricing="pricingQuery.data.value"
              :errors="fieldErrors"
            />
          </UCard>

          <!-- Specifications -->
          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.products.form.specs.title") }}</h2>
              <p class="text-sm text-muted">{{ translate("features.products.form.specs.description") }}</p>
            </template>
            <div class="space-y-2">
              <div v-for="spec in form.specs" :key="spec.key" class="flex items-start gap-2">
                <div class="w-2/5 shrink-0">
                  <UInput v-model="spec.name" maxlength="100" :placeholder="translate('features.products.form.specs.key_placeholder')" :aria-label="translate('features.products.form.specs.key')" class="w-full" />
                </div>
                <div class="min-w-0 flex-1">
                  <UInput v-model="spec.value" maxlength="500" :placeholder="translate('features.products.form.specs.value_placeholder')" :aria-label="translate('features.products.form.specs.value')" class="w-full" />
                </div>
                <UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="translate('features.products.form.specs.remove')" @click="removeSpec(spec.key)" />
              </div>
              <p v-if="fieldErrors.specifications" class="text-sm text-error">{{ fieldErrors.specifications }}</p>
              <UButton :label="translate('features.products.form.specs.add')" icon="i-lucide-plus" color="neutral" variant="outline" size="sm" @click="addSpec" />
            </div>
          </UCard>
        </div>

        <!-- Side column -->
        <div class="space-y-6 xl:sticky xl:top-0">
          <UCard :ui="{ body: 'space-y-2' }">
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.products.form.status.title") }}</h2>
            </template>
            <USelect v-model="form.status" :items="statusItems" class="w-full" />
            <p class="text-sm text-muted">{{ translate(`features.products.status_help.${form.status}`) }}</p>
          </UCard>

          <UCard :ui="{ body: 'space-y-3' }">
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.products.form.pricing.title") }}</h2>
            </template>
            <template v-if="canManagePrices">
              <UFormField :label="translate('features.products.form.pricing.markup')" :description="translate('features.products.form.pricing.markup_help')" :error="fieldErrors.markup_percent">
                <UInputNumber
                  v-model="form.markup_percent"
                  :min="0"
                  :max="1000"
                  :step="0.5"
                  :format-options="{ maximumFractionDigits: 2 }"
                  :placeholder="translate('features.products.form.pricing.markup_placeholder', { value: globalMarkupLabel })"
                  class="w-full"
                />
              </UFormField>
              <p v-if="pricingQuery.data.value" class="text-sm text-muted">
                {{ translate("features.products.form.pricing.rounding", { value: formatNumber(pricingQuery.data.value.price_rounding) }) }}
              </p>
            </template>
            <p v-else class="text-sm text-muted">{{ translate("features.products.form.pricing.staff_note") }}</p>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.products.form.url.title") }}</h2>
            </template>
            <UFormField
              :label="translate('features.products.form.url.slug')"
              :description="form.slug ? translate('features.products.form.url.slug_help', { slug: form.slug }) : undefined"
              :error="fieldErrors.slug"
            >
              <UInput v-model="form.slug" maxlength="220" :placeholder="translate('features.products.form.url.slug_placeholder')" class="w-full lowercase" />
            </UFormField>
          </UCard>
        </div>
      </div>
    </template>

    <template #footer>
      <SaveBar :dirty="canSave" :saving="isSaving" @save="(back) => save({ back })" />
    </template>
  </UDashboardPanel>
</template>
