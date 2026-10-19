import { watchDebounced } from "@vueuse/core"
import {
  computed,
  onScopeDispose,
  reactive,
  ref,
  watch,
  watchEffect,
  type Ref,
  type WritableComputedRef,
} from "vue"
import { type LocationQuery, type LocationQueryRaw, useRoute, useRouter } from "vue-router"

import {
  type QueryParam,
  type QueryParamValue,
  resolveParam,
  serializeParam,
} from "@/shared/helpers/query-param"

// `any` lets each key keep its own value type; `QueryParam<T>` is invariant in T, so `unknown` would reject every definition.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParamDefinitions = Record<string, QueryParam<any>>

export type RouteQueryState<Defs extends ParamDefinitions> = {
  [K in keyof Defs]: WritableComputedRef<QueryParamValue<Defs[K]>>
}

type Options<Defs extends ParamDefinitions> = {
  /**
   * Parameter reset to its default whenever any other parameter is written,
   * e.g. `"page"` so changing a filter returns to the first page.
   *
   * @remarks
   * Only writes made through this composable reset it; back/forward navigation
   * restores the URL exactly as it was.
   */
  resetKey?: keyof Defs & string
  /**
   * Milliseconds to wait before writing the URL. Values update immediately in
   * the UI either way; use a delay for inputs that change continuously (sliders),
   * because browsers throttle rapid history updates.
   */
  writeDelay?: number
}

/** First string value of a query entry; repeated keys (`?page=1&page=2`) use the first. */
const firstString = (value: LocationQuery[string] | undefined): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === "string" ? first : undefined
}

/**
 * Two-way binds validated state to the current route's query string.
 *
 * @remarks
 * - Reading: each value is parsed from the URL and validated; missing or invalid
 *   values fall back to the default, and invalid entries are removed from the URL.
 * - Writing: values equal to their default are omitted so URLs stay short. Writes in
 *   the same tick are merged into one `router.replace`, and the new value is visible
 *   immediately while the navigation completes.
 *
 * @example
 * ```ts
 * const { page, limit, q, sort } = useRouteQueryState(
 *   {
 *     page: integerParam({ default: 1, min: 1 }),
 *     limit: literalParam([10, 20, 50], 10),
 *     q: stringParam({ maxLength: 100 }),
 *     sort: literalParam(["name_asc", "name_desc"], "name_asc"),
 *   },
 *   { resetKey: "page" },
 * )
 * ```
 */
export function useRouteQueryState<Defs extends ParamDefinitions>(
  definitions: Defs,
  { resetKey, writeDelay = 0 }: Options<Defs> = {},
): RouteQueryState<Defs> {
  const route = useRoute()
  const router = useRouter()
  const keys = Object.keys(definitions) as (keyof Defs & string)[]
  const ownPath = route.path

  /** Values written but not yet reflected in the URL, so the UI updates instantly. */
  const pending = reactive(new Map<string, unknown>())
  let flushTimer: ReturnType<typeof setTimeout> | undefined
  let isDisposed = false

  const resolved = (key: keyof Defs & string) =>
    resolveParam(definitions[key]!, firstString(route.query[key]))

  const flush = () => {
    flushTimer = undefined
    // The user may have navigated away before a delayed write fired.
    if (isDisposed || route.path !== ownPath || pending.size === 0) return

    const snapshot = new Map(pending)
    const query: LocationQueryRaw = { ...route.query }

    for (const [key, value] of snapshot) {
      const definition = definitions[key]!
      const serialized = serializeParam(definition, value)
      query[key] = serialized === serializeParam(definition, definition.default) ? undefined : serialized
    }

    router.replace({ query }).finally(() => {
      // Keep values written again while this navigation was in flight.
      for (const [key, value] of snapshot) {
        if (pending.get(key) === value) pending.delete(key)
      }
    })
  }

  const scheduleFlush = () => {
    if (writeDelay > 0) {
      clearTimeout(flushTimer)
      flushTimer = setTimeout(flush, writeDelay)
    } else if (flushTimer === undefined) {
      flushTimer = setTimeout(flush, 0)
    }
  }

  const write = (key: keyof Defs & string, value: unknown) => {
    pending.set(key, value)
    if (resetKey && key !== resetKey) pending.set(resetKey, definitions[resetKey]!.default)
    scheduleFlush()
  }

  // Remove invalid entries (bad format, or no longer allowed once dynamic data loads).
  watchEffect(() => {
    if (route.path !== ownPath) return

    const invalid = keys.filter((key) => route.query[key] !== undefined && !pending.has(key) && !resolved(key).valid)
    if (invalid.length === 0) return

    const query: LocationQueryRaw = { ...route.query }
    for (const key of invalid) query[key] = undefined
    router.replace({ query })
  })

  onScopeDispose(() => {
    isDisposed = true
    clearTimeout(flushTimer)
  })

  return Object.fromEntries(
    keys.map((key) => [
      key,
      computed({
        get: () => (pending.has(key) ? pending.get(key) : resolved(key).value),
        set: (value) => write(key, value),
      }),
    ]),
  ) as RouteQueryState<Defs>
}

/**
 * Local text model that commits to a query-backed ref after the user pauses typing.
 *
 * @remarks
 * Keeps the input responsive without querying on every keystroke, and follows the
 * source when it changes elsewhere (back/forward navigation, "clear filters").
 *
 * @param source - Query-backed ref, typically from {@link useRouteQueryState}.
 * @param debounce - Milliseconds to wait after the last keystroke.
 */
export function useDebouncedQueryModel(source: Ref<string>, debounce = 300): Ref<string> {
  const draft = ref(source.value)

  watchDebounced(
    draft,
    (value) => {
      source.value = value.trim()
    },
    { debounce },
  )

  watch(source, (value) => {
    if (value !== draft.value.trim()) draft.value = value
  })

  return draft
}
