import type { PermissionKey, RoleKey } from "@/shared/models/access";

/** Signed-in user profile shown in the dashboard. */
export type UserProfile = {
  id: number;
  name: string;
  email: string;
  /** Optional avatar image URL. Falls back to initials when omitted. */
  avatar?: string;
  role: string;
  /** Staf tied to one warehouse (only sees its orders & stock); null = all warehouses. */
  warehouseId: number | null;
};

/** Response of `GET /auth/me`: the user plus their RBAC access profile. */
export type MeResponse = {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  role: RoleKey;
  warehouse_id: number | null;
  roles: RoleKey[];
  permissions: PermissionKey[];
};
