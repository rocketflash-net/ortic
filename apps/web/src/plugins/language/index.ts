import { createI18n } from "vue-i18n"

import { languageMessages } from "./locales"

export type MessageLanguages = keyof typeof languageMessages

/** The dashboard UI is Indonesian by default, regardless of the browser language. */
const defaultLocale: MessageLanguages = "id"

export type MessageSchema = (typeof languageMessages)["id"]

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: "en",
  messages: languageMessages,
})

type DotNotationKeys<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends string
    ? `${Prefix}${Extract<K, string>}`
    : DotNotationKeys<T[K], `${Prefix}${Extract<K, string>}.`>
}[keyof T]

export type TranslationKey = DotNotationKeys<MessageSchema>

/** Translates a key; `params` fills named placeholders such as `{email}`. */
export const translate = (key: TranslationKey, params: Record<string, unknown> = {}) => i18n.global.t(key, params)

export const isTranslateExist = i18n.global.te
