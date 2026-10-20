import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"

import { getStoreInfo, storeInfoQueryKey, type StoreInfo } from "@/shared/services/store-info"

const FALLBACK: StoreInfo = {
  store_name: "Ortic Indonesia",
  store_whatsapp: "",
  store_email: "",
  store_instagram: "ortic_id",
  store_address: "",
  service_fee: 1000,
  insurance_required_above: 1000000,
}

/**
 * Store contact info for the footer, help, and policy pages. Cached for the session; falls back to defaults while
 * loading or when the API is unreachable.
 */
export const useStoreInfo = () => {
  const query = useQuery({
    queryKey: storeInfoQueryKey,
    queryFn: getStoreInfo,
    select: (response) => response.data ?? FALLBACK,
    staleTime: 30 * 60 * 1000,
  })
  const info = computed(() => query.data.value ?? FALLBACK)
  // wa.me needs the international number without "+" or leading 0.
  const whatsappUrl = computed(() => {
    const digits = info.value.store_whatsapp.replace(/\D/g, "")
    if (!digits) return null
    return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`
  })
  const instagramUrl = computed(() => (info.value.store_instagram ? `https://instagram.com/${info.value.store_instagram.replace(/^@/, "")}` : null))
  return { info, whatsappUrl, instagramUrl }
}
