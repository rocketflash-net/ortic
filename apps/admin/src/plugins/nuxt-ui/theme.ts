import type { NuxtUIOptions } from "@nuxt/ui/vite";

/**
 * Build-time theme generation config.
 * Controls which variants/colors exist and default component behavior at compile time.
 */
export type NuxtThemeConfig = NonNullable<NuxtUIOptions["theme"]>;

export const nuxtConfigTheme = {
  colors: ["primary", "secondary", "success", "info", "warning", "error"],
  transitions: true,
  defaultVariants: {
    color: "primary",
    size: "md",
  },
} satisfies NuxtThemeConfig;
