import { QueryClient, type VueQueryPluginOptions } from "@tanstack/vue-query"

import type { ApiError } from "@/shared/models/api"

/**
 * Retries a failed query once, and only when another try can help: no response (network) or a server error.
 * A 4xx (not signed in, no access, not found, invalid input) gives the same answer again, so it fails at once.
 */
const shouldRetry = (failureCount: number, error: unknown) => {
  if (failureCount >= 1) return false
  const status = (error as ApiError | undefined)?.status
  return status === undefined || status >= 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
  },
})

export const vueQueryOptions: VueQueryPluginOptions = {
  queryClient,
}
