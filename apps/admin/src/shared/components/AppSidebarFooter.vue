<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import { computed } from "vue";
import { useColorMode } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { useAuthStore } from "@/features/authentication/stores/authentication.store";
import { ProfilePageName } from "@/features/profile/models";
import { translate } from "@/plugins/language";

const props = defineProps<{
  collapsed?: boolean;
}>();

const authStore = useAuthStore();
const colorMode = useColorMode();

const { userData } = storeToRefs(authStore);
const { handleLogout } = authStore;

const userUi = {
  root: "w-full min-w-0",
  wrapper: "min-w-0 text-left",
  name: "truncate text-left",
  description: "truncate text-left",
} as const;

const items = computed<DropdownMenuItem[][]>(() => {
  if (!userData.value) {
    return [];
  }

  return [
    [
      {
        type: "label",
        slot: "user-profile",
      },
    ],
    [
      {
        label: translate("utils.navigation.profile"),
        icon: "i-lucide-user",
        to: { name: ProfilePageName.PROFILE },
      },
    ],
    [
      {
        label: translate("utils.navigation.appearance"),
        icon: "i-lucide-sun-moon",
        children: [
          {
            label: translate("utils.navigation.light"),
            icon: "i-lucide-sun",
            type: "checkbox",
            checked: colorMode.value === "light",
            onSelect(event: Event) {
              event.preventDefault();
              colorMode.value = "light";
            },
          },
          {
            label: translate("utils.navigation.dark"),
            icon: "i-lucide-moon",
            type: "checkbox",
            checked: colorMode.value === "dark",
            onSelect(event: Event) {
              event.preventDefault();
              colorMode.value = "dark";
            },
          },
          {
            label: translate("utils.navigation.system"),
            icon: "i-lucide-monitor",
            type: "checkbox",
            checked: colorMode.value === "auto",
            onSelect(event: Event) {
              event.preventDefault();
              colorMode.value = "auto";
            },
          },
        ],
      },
    ],
    [
      {
        label: translate("utils.navigation.log_out"),
        icon: "i-lucide-log-out",
        color: "error",
        onSelect: () => {
          handleLogout();
        },
      },
    ],
  ];
});
</script>

<template>
  <UDropdownMenu
    v-if="userData"
    :items="items"
    :content="{
      side: 'top',
      align: 'start',
      collisionPadding: 12,
    }"
    :ui="{
      content: props.collapsed
        ? 'w-56 text-left'
        : 'w-(--reka-dropdown-menu-trigger-width) text-left',
      label: 'w-full p-0',
      item: 'text-left',
    }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="props.collapsed"
      class="data-[state=open]:bg-elevated justify-start gap-2 rounded-lg! px-2!"
      :aria-label="props.collapsed ? userData.name : undefined"
    >
      <UUser
        :name="props.collapsed ? undefined : userData.name"
        size="sm"
        :ui="{
          ...userUi,
          root: props.collapsed ? 'justify-center' : `${userUi.root} flex-1`,
        }"
      >
        <template v-if="!props.collapsed" #description>
          <span class="block truncate text-left">{{ userData.email }}</span>
          <span class="block truncate text-left capitalize text-dimmed">{{ userData.role }}</span>
        </template>
      </UUser>

      <UIcon
        v-if="!props.collapsed"
        name="i-lucide-chevrons-up-down"
        class="size-4 shrink-0 text-dimmed"
      />
    </UButton>

    <template #user-profile>
      <UUser :name="userData.name" size="md" :ui="userUi">
        <template #description>
          <span class="block truncate text-left">{{ userData.email }}</span>
          <span class="block truncate text-left capitalize text-dimmed">{{ userData.role }}</span>
        </template>
      </UUser>
    </template>
  </UDropdownMenu>
</template>
