import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

import { queryClient } from "@/plugins/tanstack/client";
import { clearTokens, hasTokens, saveTokens, type TokenPairResponse } from "@/shared/helpers/token-storage";
import { useAccessStore } from "@/shared/stores/useAccessStore";

import { AuthenticationPageName } from "../models";
import type { MeResponse, UserProfile } from "../models/user.model";
import { getMe, requestLogout } from "../services/api";

/**
 * Derives up to two uppercase initials from a display name.
 *
 * @param name - Full display name.
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function toUserProfile(me: MeResponse): UserProfile {
  return {
    id: me.id,
    name: me.name,
    email: me.email,
    avatar: me.avatar_url ?? undefined,
    role: me.role,
    phone: me.phone ?? null,
    profession: me.profession ?? null,
  };
}

/**
 * Pinia store for the signed-in user.
 *
 * @remarks
 * Tokens live in localStorage (see `token-storage`); this store holds who the user is, loaded from `GET /auth/me`
 * once per page load (route guard) and again right after login.
 */
export const useAuthStore = defineStore("auth", () => {
  const router = useRouter();

  /** Currently signed-in user, or `null` when signed out or not loaded yet. */
  const userData = ref<UserProfile | null>(null);

  /** Whether `GET /auth/me` has answered for the current tokens (successfully or not). */
  const isSessionLoaded = ref(false);

  /** Avatar initials derived from the user's display name. */
  const userInitials = computed(() => (userData.value ? getInitials(userData.value.name) : ""));

  const isAuthenticated = computed(() => userData.value !== null);

  /** Single `/auth/me` request shared by concurrent callers (e.g. several guards during one navigation). */
  let sessionRequest: Promise<boolean> | null = null;

  /**
   * Loads the user and their permissions when needed.
   *
   * @returns `true` when signed in. Without stored tokens no request is made.
   */
  function ensureSession(): Promise<boolean> {
    if (isSessionLoaded.value) return Promise.resolve(isAuthenticated.value);
    if (!hasTokens()) {
      clearSession();
      return Promise.resolve(false);
    }

    sessionRequest ??= getMe()
      .then(({ data }) => {
        if (!data) throw new Error("Empty /auth/me response");
        setUser(data);
        isSessionLoaded.value = true;
        return true;
      })
      .catch(() => {
        // The interceptor already tried to refresh; the session is gone (or the API is unreachable).
        clearSession();
        return false;
      })
      .finally(() => {
        sessionRequest = null;
      });
    return sessionRequest;
  }

  /**
   * Replaces the signed-in user and their permissions.
   *
   * @param me - Response of `GET /auth/me`, or of `PATCH /auth/me` after the user edits their profile.
   */
  function setUser(me: MeResponse) {
    userData.value = toUserProfile(me);
    useAccessStore().setAccess({ roles: me.roles, permissions: me.permissions });
  }

  /**
   * Stores the tokens from a successful login and loads the user.
   *
   * @param tokens - Token pair from `/auth/email/verify` or `/auth/google/exchange`.
   * @returns `true` when the user could be loaded.
   */
  async function startSession(tokens: TokenPairResponse): Promise<boolean> {
    saveTokens(tokens);
    isSessionLoaded.value = false;
    return ensureSession();
  }

  /** Forgets the session locally: tokens, user, permissions, and cached API data. */
  function clearSession() {
    clearTokens();
    userData.value = null;
    useAccessStore().clearAccess();
    queryClient.clear();
    isSessionLoaded.value = true;
  }

  /**
   * Ends the API session, clears local session state, and redirects to the login page.
   *
   * @remarks
   * Local state is cleared even when the API call fails (e.g. offline), so the screen never stays signed in.
   */
  async function handleLogout() {
    try {
      await requestLogout();
    } catch {
      // Tokens may already be invalid or the API unreachable; continue with the local sign-out.
    }
    clearSession();

    await router.push({ name: AuthenticationPageName.LOGIN });
  }

  return {
    userData,
    userInitials,
    isAuthenticated,
    isSessionLoaded,
    ensureSession,
    setUser,
    startSession,
    clearSession,
    handleLogout,
  };
});
