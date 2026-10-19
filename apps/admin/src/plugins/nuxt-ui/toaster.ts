import type { ToastProps } from "@nuxt/ui"
import { useToast } from "@nuxt/ui/composables"

/**
 * Available preset variants for application toasts.
 */
type ToastVariant = "success" | "error" | "warning" | "info" | "primary" | "neutral"

/**
 * Toast options supported by the application.
 *
 * This type extends all Nuxt UI toast properties while introducing
 * the `variant` property for selecting a predefined preset.
 */
type ToastOptions = Omit<Partial<ToastProps>, "type"> & {
  variant?: ToastVariant
}

/**
 * Payload accepted by helper methods such as
 * `success()`, `error()`, `warning()`, `info()`, and `loading()`.
 */
type ToastPayload = Omit<ToastOptions, "variant">

/**
 * Default preset configuration for each toast variant.
 */
const PRESETS: Record<
  ToastVariant,
  {
    color: NonNullable<ToastProps["color"]>
    icon: string
    duration: number
  }
> = {
  success: {
    color: "success",
    icon: "i-lucide-circle-check",
    duration: 5000,
  },

  error: {
    color: "error",
    icon: "i-lucide-circle-x",
    duration: 7000,
  },

  warning: {
    color: "warning",
    icon: "i-lucide-triangle-alert",
    duration: 5000,
  },

  info: {
    color: "info",
    icon: "i-lucide-info",
    duration: 5000,
  },

  primary: {
    color: "primary",
    icon: "i-lucide-bell",
    duration: 5000,
  },

  neutral: {
    color: "neutral",
    icon: "i-lucide-bell",
    duration: 5000,
  },
}

/**
 * Provides a reusable wrapper around Nuxt UI's `useToast()`.
 *
 * The composable exposes helper methods for common toast variants
 * while still allowing full customization through `show()`.
 *
 * @example
 * ```ts
 * const toast = useAppToast()
 *
 * toast.success({
 *   title: "Success",
 *   description: "Data saved successfully."
 * })
 * ```
 */
export const useAppToast = () => {
  const toast = useToast()

  /**
   * Displays a fully customizable toast.
   *
   * If no color, icon, or duration is provided,
   * the values from the selected preset are used.
   *
   * @param options Toast configuration.
   *
   * @returns The created toast instance.
   */
  const show = ({
    variant = "primary",
    color,
    icon,
    duration,
    progress = true,
    close = true,
    ...options
  }: ToastOptions) => {
    const preset = PRESETS[variant]

    return toast.add({
      color: color ?? preset.color,
      icon: icon ?? preset.icon,
      duration: duration ?? preset.duration,
      progress,
      close,
      ...options,
    })
  }

  /**
   * Displays a success toast.
   *
   * @param payload Toast payload.
   */
  const success = (payload: ToastPayload) =>
    show({
      variant: "success",
      ...payload,
    })

  /**
   * Displays an error toast.
   *
   * @param payload Toast payload.
   */
  const error = (payload: ToastPayload) =>
    show({
      variant: "error",
      ...payload,
    })

  /**
   * Displays a warning toast.
   *
   * @param payload Toast payload.
   */
  const warning = (payload: ToastPayload) =>
    show({
      variant: "warning",
      ...payload,
    })

  /**
   * Displays an informational toast.
   *
   * @param payload Toast payload.
   */
  const info = (payload: ToastPayload) =>
    show({
      variant: "info",
      ...payload,
    })

  /**
   * Displays a persistent loading toast.
   *
   * Default behavior:
   * - duration: 0
   * - progress: false
   * - close: false
   *
   * @param payload Toast payload.
   *
   * @returns The created toast instance.
   */
  const loading = (payload: ToastPayload) =>
    show({
      variant: "primary",
      icon: "i-lucide-loader-circle animate-spin",
      duration: 0,
      progress: false,
      close: false,
      ...payload,
    })

  return {
    /**
     * Collection of helper methods for displaying application toast notifications.
     */
    showToast: {
      /**
       * Displays a fully customizable toast.
       */
      custom: show,

      /**
       * Displays a success toast.
       */
      success,

      /**
       * Displays an error toast.
       */
      error,

      /**
       * Displays a warning toast.
       */
      warning,

      /**
       * Displays an informational toast.
       */
      info,

      /**
       * Displays a persistent loading toast.
       */
      loading,
    },

    /**
     * Updates an existing toast.
     */
    updateToast: toast.update,

    /**
     * Removes a toast by its identifier.
     */
    removeToast: toast.remove,

    /**
     * Removes all currently displayed toasts.
     */
    clearToast: toast.clear,
  }
}
