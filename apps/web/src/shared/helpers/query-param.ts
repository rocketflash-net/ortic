/**
 * Validated URL query parameter definitions for {@link useRouteQueryState}.
 *
 * @remarks
 * Every value read from the URL is untrusted input. A definition parses the
 * raw string and returns `undefined` when it is invalid, so the caller falls
 * back to the default instead of sending garbage to the API.
 *
 * @example
 * ```ts
 * const params = {
 *   page: integerParam({ default: 1, min: 1 }),
 *   limit: literalParam([10, 20, 50], 10),
 *   q: stringParam({ maxLength: 100 }),
 *   category: withAllowList(slugParam(), () => categories.value?.map((item) => item.slug)),
 * }
 * ```
 */

import * as valibot from "valibot"

export type QueryParam<T> = {
  /** Value used when the parameter is missing or invalid. Never written to the URL. */
  default: T
  /** Parses a raw query string, returning `undefined` when it is invalid. */
  parse: (raw: string) => T | undefined
  /** Converts a value back into its query string form. Defaults to `String(value)`. */
  serialize?: (value: T) => string
  /**
   * Extra check against data that may load later (e.g. category slugs).
   * Return `undefined` while that data is unknown to accept any well-formed value.
   */
  isAllowed?: (value: T) => boolean | undefined
}

/** Value type of a {@link QueryParam}. */
export type QueryParamValue<P> = P extends QueryParam<infer T> ? T : never

/** Serializes a value with the parameter's serializer. */
export const serializeParam = <T>(param: QueryParam<T>, value: T): string =>
  param.serialize ? param.serialize(value) : String(value)

/**
 * Resolves the effective value of a raw query entry.
 *
 * @returns The parsed value, or the default when missing, malformed, or not allowed.
 */
export const resolveParam = <T>(param: QueryParam<T>, raw: string | undefined): { value: T; valid: boolean } => {
  if (raw === undefined) return { value: param.default, valid: true }

  const parsed = param.parse(raw)
  if (parsed === undefined || param.isAllowed?.(parsed) === false) {
    return { value: param.default, valid: false }
  }

  return { value: parsed, valid: true }
}

/** Builds a parameter from any valibot schema that accepts a string. */
export const schemaParam = <T>(
  schema: valibot.GenericSchema<string, T>,
  defaultValue: T,
  serialize?: (value: T) => string,
): QueryParam<T> => ({
  default: defaultValue,
  parse: (raw) => {
    const result = valibot.safeParse(schema, raw)
    return result.success ? result.output : undefined
  },
  serialize,
})

/** Whole number within optional bounds, e.g. a page number. */
export const integerParam = ({
  default: defaultValue,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
}: {
  default: number
  min?: number
  max?: number
}): QueryParam<number> =>
  schemaParam(
    valibot.pipe(
      valibot.string(),
      valibot.regex(/^-?\d{1,15}$/),
      valibot.transform(Number),
      valibot.minValue(min),
      valibot.maxValue(max),
    ),
    defaultValue,
  )

/** One value from a fixed list, e.g. a page size or sort key. */
export const literalParam = <const T extends string | number>(
  values: readonly T[],
  defaultValue: NoInfer<T>,
): QueryParam<T> => ({
  default: defaultValue,
  parse: (raw) => values.find((value) => String(value) === raw),
})

/** Free text, trimmed and length-limited. An empty string means "not set". */
export const stringParam = ({
  default: defaultValue = "",
  maxLength = 100,
  pattern,
}: {
  default?: string
  maxLength?: number
  pattern?: RegExp
} = {}): QueryParam<string> =>
  schemaParam(
    valibot.pipe(
      valibot.string(),
      valibot.trim(),
      valibot.maxLength(maxLength),
      valibot.check((value) => !pattern || value === "" || pattern.test(value)),
    ),
    defaultValue,
  )

/** Lowercase URL slug such as `mens-shirts`. */
export const slugParam = (defaultValue = ""): QueryParam<string> =>
  stringParam({ default: defaultValue, maxLength: 60, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ })

/** Page sizes offered by list views unless they specify their own. */
export const DEFAULT_PAGE_SIZES = [10, 20, 50] as const

/**
 * `page` and `limit` definitions shared by paginated list views.
 *
 * @param pageSizes - Allowed page sizes; the first one is the default.
 */
export const paginationParams = <const Sizes extends readonly [number, ...number[]]>(
  pageSizes: Sizes = DEFAULT_PAGE_SIZES as unknown as Sizes,
) => ({
  page: integerParam({ default: 1, min: 1 }),
  limit: literalParam<Sizes[number]>(pageSizes, pageSizes[0]),
})

/**
 * Restricts a parameter to values known at runtime.
 *
 * @param getAllowed - Returns the allowed values, or `undefined` while they are still loading.
 *   Read reactive state inside it so the URL is re-validated when the list arrives.
 */
export const withAllowList = <T>(
  param: QueryParam<T>,
  getAllowed: () => readonly T[] | undefined,
): QueryParam<T> => ({
  ...param,
  isAllowed: (value) => {
    if (value === param.default) return true
    const allowed = getAllowed()
    return allowed === undefined ? undefined : allowed.includes(value)
  },
})
