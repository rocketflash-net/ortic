import type { NuxtUIOptions } from "@nuxt/ui/vite";

/** Runtime app config — color mapping, icons, and per-component overrides. */
export type AppConfigUi = NonNullable<NuxtUIOptions["ui"]>;

// Only text-like fields have a "soft" variant; choice inputs and file upload use other variant names.
const textFieldDefaults = { size: "xl", variant: "soft" } as const;
const choiceFieldDefaults = { size: "xl" } as const;

// Components with a wrapper `root` slot vs. components whose outermost element is `base`.
const fullWidthRoot = { root: "!w-full" };
const fullWidthBase = { base: "!w-full" };

export const nuxtConfigUi = {
  colors: {
    // Palet Ortic, didefinisikan di assets/main.css: biru utama, kuning aksen.
    primary: "ortic",
    secondary: "sunny",
    neutral: "zinc",
  },

  // Text input
  input: { slots: fullWidthRoot, defaultVariants: textFieldDefaults },
  textarea: { slots: fullWidthRoot, defaultVariants: textFieldDefaults },
  inputNumber: { slots: fullWidthRoot, defaultVariants: textFieldDefaults },

  // Selects
  select: { slots: fullWidthBase, defaultVariants: textFieldDefaults },
  selectMenu: { slots: fullWidthBase, defaultVariants: textFieldDefaults },
  inputMenu: { slots: fullWidthRoot, defaultVariants: textFieldDefaults },

  // Date & time
  inputDate: { slots: fullWidthBase, defaultVariants: textFieldDefaults },

  // Choice inputs
  checkbox: { slots: fullWidthRoot, defaultVariants: choiceFieldDefaults },
  radioGroup: { slots: fullWidthRoot, defaultVariants: choiceFieldDefaults },
  switch: { slots: fullWidthRoot, defaultVariants: choiceFieldDefaults },

  // File upload
  fileUpload: { slots: fullWidthRoot, defaultVariants: choiceFieldDefaults },

  button: {
    slots: {
      // Tombol aksi utama memakai class "btn-comic" (assets/main.css) untuk gaya komik.
      base: "rounded-[10px] cursor-pointer font-semibold",
    },
    defaultVariants: {
      color: "primary",
      variant: "solid",
      size: "xl",
    },
  },

  // Reserve one line below inputs for validation errors so fields don't shift. Nuxt UI only styles the container
  // of a labelled field, so a field without label or description (its wrapper is empty) reserves it on the root.
  formField: {
    slots: {
      root: "relative has-[>[data-slot=wrapper]:empty]:pb-5",
      container: "relative pb-5",
      error: "absolute inset-x-0 bottom-0 text-error animate-form-field-message-in",
      help: "absolute inset-x-0 bottom-0 text-muted animate-form-field-message-in",
    },
  },

  // Page header: a little more room around the title and actions, and a title that reads as the page heading.
  dashboardNavbar: {
    slots: {
      root: "gap-3 bg-default/80 px-4 backdrop-blur sm:px-6",
      left: "gap-2",
      title: "text-base sm:text-lg",
      right: "gap-2",
    },
  },

  link: {
    variants: {
      active: {
        true: "text-primary",
        false: "text-primary hover:text-primary/80",
      },
    },
  },
} satisfies AppConfigUi;
