import { VueQueryPlugin } from "@tanstack/vue-query"
import { type App } from "vue"

import { vueQueryOptions } from "./client"

export function useTanstackQuery(app: App) {
  app.use(VueQueryPlugin, vueQueryOptions)
}
