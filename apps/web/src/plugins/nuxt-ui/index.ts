import ui from "@nuxt/ui/vue-plugin"
import { type App } from "vue"

export function useNuxtUi(app: App) {
  app.use(ui)
}
