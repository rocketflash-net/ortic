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
  roles: string[];
  permissions: PermissionType[];
};

type AdminUserResponseType = UserResponseType & { created_at: Date };

/**
 * Bentuk data user yang dikirim ke client.
 * Dipisah dari entity database supaya kolom internal (google_sub) tidak ikut bocor ke response.
 */
export default class UserDto {
  static fromEntity(user: AuthUserType): UserResponseType {
    return { id: user.id, email: user.email, name: user.name, avatar_url: user.avatarUrl, role: user.role };
  }

  static me(user: AuthUserType): MeResponseType {
    return { ...UserDto.fromEntity(user), roles: [user.role], permissions: permissionsOf(user.role) };
  }

  static forAdmin(user: UserType): AdminUserResponseType {
    return { ...UserDto.fromEntity(user), created_at: user.createdAt };
  }
}
