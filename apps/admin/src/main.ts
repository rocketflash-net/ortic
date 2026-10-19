import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import "./assets/fonts";
import "./assets/main.css";
import { AuthenticationPageName } from "./features/authentication/models";
import { useAuthStore } from "./features/authentication/stores/authentication.store";
import { setSessionExpiredHandler } from "./plugins/axios/interceptor";
import { i18n } from "./plugins/language/index";
import { useNuxtUi } from "./plugins/nuxt-ui/index.ts";
import { useTanstackQuery } from "./plugins/tanstack";
import router from "./router";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
useNuxtUi(app);
useTanstackQuery(app);

// Refresh token rejected mid-session (expired, revoked, signed out elsewhere): back to login, then return here.
setSessionExpiredHandler(() => {
  useAuthStore().clearSession();
  const current = router.currentRoute.value;
  if (current.matched.some((record) => record.meta.requiresAuth)) {
    router.push({ name: AuthenticationPageName.LOGIN, query: { redirect: current.fullPath } });
  }
});

app.mount("#app");
