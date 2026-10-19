import type { RouteRecordRaw } from "vue-router";

import { ProfilePageName } from "./models";

const profileRoutes: RouteRecordRaw[] = [
  {
    path: "profile",
    name: ProfilePageName.PROFILE,
    component: () => import("./views/ProfileView.vue"),
    // Every signed-in user manages their own profile, so no permission is required.
  },
];

export default profileRoutes;
