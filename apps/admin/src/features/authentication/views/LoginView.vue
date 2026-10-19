<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";
import { useMutation } from "@tanstack/vue-query";
import { useClipboard, useIntervalFn } from "@vueuse/core";

import { translate, type TranslationKey } from "@/plugins/language";
import { useAppToast } from "@/plugins/nuxt-ui/toaster";
import { safeRedirectPath } from "@/shared/helpers/redirect";
import type { ApiError } from "@/shared/models/api";

import GoogleLogo from "../components/GoogleLogo.vue";
import { useInAppBrowser } from "../composables/useInAppBrowser";
import { emailLoginSchema, type EmailLoginForm } from "../schemas/email-login.schema";
import { googleLoginUrl, requestEmailCode, verifyEmailCode } from "../services/api";
import { useAuthStore } from "../stores/authentication.store";

const CODE_LENGTH = 6;

const route = useRoute();
const router = useRouter();
const { showToast } = useAppToast();

/** Dashboard path to return to after login (US-04); the API filters it again. */
const redirect = typeof route.query.redirect === "string" ? route.query.redirect : undefined;

const authStore = useAuthStore();

const inAppBrowser = useInAppBrowser();
const { copy } = useClipboard({ legacy: true });

const step = ref<"email" | "code">("email");
const emailForm = reactive<EmailLoginForm>({ email: "" });
/** Digits typed into the PIN input (`type="number"` yields numbers); joined into the 6-digit code on submit. */
const code = ref<number[]>([]);

/** Error shown above the form; starts with the one the API put in `?error=` after Google login. */
const errorMessage = ref<string | null>(
  typeof route.query.error === "string" ? loginErrorMessage(route.query.error) : null,
);

const resendSeconds = ref(0);
const resendTimer = useIntervalFn(
  () => {
    resendSeconds.value = Math.max(0, resendSeconds.value - 1);
    if (resendSeconds.value === 0) resendTimer.pause();
  },
  1000,
  { immediate: false },
);

function startResendCooldown(seconds: number) {
  resendSeconds.value = seconds;
  resendTimer.resume();
}

function loginErrorMessage(errorCode: string): string {
  const known: Record<string, TranslationKey> = {
    access_denied: "features.authentication.login.errors.access_denied",
    account_conflict: "features.authentication.login.errors.account_conflict",
    google_login_failed: "features.authentication.login.errors.google_login_failed",
    invalid_login_code: "features.authentication.login.errors.invalid_login_code",
    "29": "features.authentication.login.errors.too_many_requests",
  };
  return translate(known[errorCode] ?? "features.authentication.login.errors.generic");
}

/** Maps an API rejection to a message, and honours the server's resend cooldown when given. */
function handleApiError(error: ApiError) {
  const retryAfter = (error.data?.additionalInfo as { retry_after_seconds?: number } | null)?.retry_after_seconds;
  if (retryAfter) startResendCooldown(retryAfter);
  errorMessage.value = loginErrorMessage(error.data?.responseCode ?? "");
}

const requestCodeMutation = useMutation({
  mutationFn: requestEmailCode,
  onMutate: () => {
    errorMessage.value = null;
  },
  onSuccess: (response) => {
    step.value = "code";
    code.value = [];
    startResendCooldown(response.data?.resend_after_seconds ?? 180);
  },
  onError: (error) => handleApiError(error as unknown as ApiError),
});

const verifyCodeMutation = useMutation({
  mutationFn: verifyEmailCode,
  onMutate: () => {
    errorMessage.value = null;
  },
  onSuccess: async (response) => {
    if (!response.data || !(await authStore.startSession(response.data))) {
      errorMessage.value = translate("features.authentication.login.errors.generic");
      return;
    }
    await router.replace(safeRedirectPath(response.data.redirect));
  },
  onError: (error) => {
    code.value = [];
    handleApiError(error as unknown as ApiError);
  },
});

const isCodeComplete = computed(() => code.value.join("").length === CODE_LENGTH);

function onSubmitEmail({ data }: FormSubmitEvent<EmailLoginForm>) {
  emailForm.email = data.email;
  requestCodeMutation.mutate({ email: data.email });
}

function submitCode() {
  if (!isCodeComplete.value || verifyCodeMutation.isPending.value) return;
  verifyCodeMutation.mutate({ email: emailForm.email, code: code.value.join(""), redirect });
}

function resendCode() {
  requestCodeMutation.mutate({ email: emailForm.email });
}

function changeEmail() {
  step.value = "email";
  code.value = [];
  errorMessage.value = null;
}

/** Google sign-in URL for the email step; the button is disabled in in-app browsers, where Google blocks the login page. */
const googleUrl = googleLoginUrl(redirect);

const emailFields = computed<AuthFormField[]>(() => [
  {
    name: "email",
    type: "email",
    label: translate("features.authentication.login.email.label"),
    placeholder: translate("features.authentication.login.email.placeholder"),
    autocomplete: "email",
    required: true,
    // Restores the address when coming back from the code step ("Change email").
    defaultValue: emailForm.email,
  },
]);

const codeFields = computed<AuthFormField[]>(() => [
  { name: "code", type: "otp", label: translate("features.authentication.login.code.label"), length: CODE_LENGTH },
]);

async function copyCurrentLink() {
  await copy(inAppBrowser.currentUrl);
  showToast.success({ title: translate("features.authentication.login.in_app.copied") });
}
</script>

<template>
  <div class="space-y-6">
    <UAlert
      v-if="inAppBrowser.isInApp && step === 'email'"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="translate('features.authentication.login.in_app.title')"
      :description="translate('features.authentication.login.in_app.description')"
      :actions="[
        ...(inAppBrowser.openInChromeUrl
          ? [
              {
                label: translate('features.authentication.login.in_app.open_chrome'),
                to: inAppBrowser.openInChromeUrl,
                external: true,
                color: 'warning' as const,
              },
            ]
          : []),
        {
          label: translate('features.authentication.login.in_app.copy_link'),
          icon: 'i-lucide-copy',
          color: 'warning' as const,
          variant: 'outline' as const,
          onClick: copyCurrentLink,
        },
      ]"
    />

    <UAuthForm
      v-if="step === 'email'"
      key="email"
      :title="translate('features.authentication.login.page_title')"
      :description="translate('features.authentication.login.page_description')"
      :fields="emailFields"
      :schema="emailLoginSchema"
      :submit="{
        label: translate('features.authentication.login.email.send_code'),
        size: 'xl',
        class: 'h-12 justify-center',
      }"
      :loading="requestCodeMutation.isPending.value"
      :disabled="requestCodeMutation.isPending.value"
      :ui="{ header: 'text-left', title: 'text-2xl sm:text-3xl', description: 'leading-relaxed' }"
      @submit="onSubmitEmail"
    >
      <!-- A white, full-width button with Google's full-color mark, the way Google asks sign-in buttons to look. -->
      <template #providers>
        <UButton
          :to="googleUrl"
          external
          block
          size="xl"
          color="neutral"
          variant="outline"
          :disabled="inAppBrowser.isInApp"
          class="h-12 justify-center gap-3 bg-default font-medium text-highlighted shadow-xs hover:bg-elevated/60"
        >
          <template #leading>
            <GoogleLogo class="size-5 shrink-0" />
          </template>
          {{ translate("features.authentication.login.google_button") }}
        </UButton>
      </template>

      <template #separator>
        <USeparator
          :label="translate('features.authentication.login.divider')"
          :ui="{ label: 'text-xs uppercase tracking-wide text-dimmed' }"
        />
      </template>

      <template v-if="errorMessage" #validation>
        <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="errorMessage" />
      </template>
    </UAuthForm>

    <UAuthForm
      v-else
      key="code"
      icon="i-lucide-mail-check"
      :title="translate('features.authentication.login.code.label')"
      :description="translate('features.authentication.login.code.sent_to', { email: emailForm.email })"
      :fields="codeFields"
      :submit="{
        label: translate('features.authentication.login.code.verify'),
        size: 'xl',
        class: 'h-12 justify-center',
        disabled: !isCodeComplete,
      }"
      :loading="verifyCodeMutation.isPending.value"
      :ui="{ header: 'text-left', leading: 'mb-2', title: 'text-2xl sm:text-3xl', description: 'leading-relaxed' }"
      @submit="submitCode"
    >
      <!-- Own PIN input so a complete code submits right away and a failed attempt clears it. -->
      <template #code-field>
        <UPinInput
          v-model="code"
          :length="CODE_LENGTH"
          type="number"
          otp
          mask
          autofocus
          size="xl"
          variant="outline"
          :ui="{
            root: 'gap-2 sm:gap-3',
            // `!` beats the size variant's `size-10`. Masked digits show as dots, so they get a larger font.
            base: '!size-12 rounded-lg text-2xl font-semibold sm:!size-14',
          }"
          :disabled="verifyCodeMutation.isPending.value"
          @complete="submitCode"
        />
      </template>

      <template v-if="errorMessage" #validation>
        <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="errorMessage" />
      </template>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <UButton
            variant="link"
            color="neutral"
            size="md"
            :label="translate('features.authentication.login.code.change_email')"
            @click="changeEmail"
          />
          <UButton
            variant="link"
            size="md"
            :disabled="resendSeconds > 0 || requestCodeMutation.isPending.value"
            :label="
              resendSeconds > 0
                ? translate('features.authentication.login.code.resend_in', { seconds: resendSeconds })
                : translate('features.authentication.login.code.resend')
            "
            @click="resendCode"
          />
        </div>
      </template>
    </UAuthForm>
  </div>
</template>
