<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { translate } from "@/plugins/language";
import { safeRedirectPath } from "@/shared/helpers/redirect";

import AuthenticationPageShell from "../components/AuthenticationPageShell.vue";
import { AuthenticationPageName } from "../models";
import { exchangeGoogleCode } from "../services/api";
import { useAuthStore } from "../stores/authentication.store";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

/**
 * The API redirects here after Google sign-in with a one-time `code` (valid ~1 minute).
 * Exchange it for tokens, then open the page the user originally wanted.
 */
onMounted(async () => {
  const code = typeof route.query.code === "string" ? route.query.code : "";
  const redirect = safeRedirectPath(route.query.redirect);

  try {
    const { data } = await exchangeGoogleCode({ code });
    if (data && (await authStore.startSession(data))) {
      await router.replace(redirect);
      return;
    }
  } catch {
    // Fall through to the login page with an error message.
  }
  await router.replace({ name: AuthenticationPageName.LOGIN, query: { error: "google_login_failed", redirect } });
});
</script>

<template>
  <AuthenticationPageShell
    :title="translate('features.authentication.callback.title')"
    :description="translate('features.authentication.callback.description')"
  >
    <div class="flex justify-center py-6">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
    </div>
  </AuthenticationPageShell>
</template>
