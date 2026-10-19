import type { PermissionKey, RoleKey } from "@/shared/models/access";

/** Signed-in user profile shown in the dashboard. */
export type UserProfile = {
  id: number;
  name: string;
  email: string;
  /** Optional avatar image URL. Falls back to initials when omitted. */
  avatar?: string;
  role: string;
};

/** Response of `GET /auth/me`: the user plus their RBAC access profile. */
export type MeResponse = {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  role: RoleKey;
  roles: RoleKey[];
  permissions: PermissionKey[];
};
