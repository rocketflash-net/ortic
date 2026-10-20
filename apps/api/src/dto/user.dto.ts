import { PermissionType } from "@enums/permission.enum";
import { permissionsOf } from "@registries/role-permission.registry";
import { AuthUserType } from "@@types/auth.type";
import { UserType } from "@@types/entity.type";

type UserResponseType = {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
};

// Profil user login + profil akses RBAC (format AccessProfile di dashboard: roles & permissions).
type MeResponseType = UserResponseType & {
  phone: string | null;
  profession: string | null;
  // Staf yang dikaitkan ke satu gudang; null = semua gudang.
  warehouse_id: number | null;
  roles: string[];
  permissions: PermissionType[];
};

type AdminUserResponseType = UserResponseType & { phone: string | null; profession: string | null; warehouse_id: number | null; created_at: Date };

/**
 * Bentuk data user yang dikirim ke client.
 * Dipisah dari entity database supaya kolom internal (google_sub) tidak ikut bocor ke response.
 */
export default class UserDto {
  static fromEntity(user: AuthUserType): UserResponseType {
    return { id: user.id, email: user.email, name: user.name, avatar_url: user.avatarUrl, role: user.role };
  }

  static me(user: AuthUserType & Partial<Pick<UserType, "phone" | "profession">>): MeResponseType {
    return {
      ...UserDto.fromEntity(user),
      phone: user.phone ?? null,
      profession: user.profession ?? null,
      warehouse_id: user.warehouseId,
      roles: [user.role],
      permissions: permissionsOf(user.role),
    };
  }

  static forAdmin(user: UserType): AdminUserResponseType {
    return { ...UserDto.fromEntity(user), phone: user.phone, profession: user.profession, warehouse_id: user.warehouseId, created_at: user.createdAt };
  }
}
