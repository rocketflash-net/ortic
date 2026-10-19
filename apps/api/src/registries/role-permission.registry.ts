import PermissionEnum, { PermissionType } from "@enums/permission.enum";
import UserRoleEnum, { UserRoleType } from "@enums/user-role.enum";
import { AuthUserType } from "@@types/auth.type";

/**
 * RBAC: role disimpan di `users.role`, daftar permission tiap role didefinisikan di sini.
 *
 * - `user`       : pembeli. Hanya bisa membaca & membuat pesanan miliknya sendiri (owner check di service).
 * - `admin`      : Staf — produk, stok, dan pesanan. Tanpa kelola admin, gudang, kurir, pengaturan toko, audit log, dan harga dasar/markup.
 * - `superadmin` : Owner — semua permission.
 *
 * Menambah role: tambahkan di enums/user-role.enum.ts (+ migration ENUM), lalu daftarkan permission-nya di sini.
 */
const CUSTOMER_PERMISSIONS: PermissionType[] = [PermissionEnum.orders_read, PermissionEnum.orders_create];

const OWNER_ONLY_PERMISSIONS: PermissionType[] = [
  PermissionEnum.admins_manage,
  PermissionEnum.warehouses_manage,
  PermissionEnum.couriers_manage,
  PermissionEnum.settings_manage,
  PermissionEnum.audit_logs_read,
  PermissionEnum.prices_manage,
];

const ROLE_PERMISSIONS: Record<UserRoleType, PermissionType[]> = {
  [UserRoleEnum.user]: CUSTOMER_PERMISSIONS,
  [UserRoleEnum.admin]: Object.values(PermissionEnum).filter((permission) => !OWNER_ONLY_PERMISSIONS.includes(permission)),
  [UserRoleEnum.superadmin]: Object.values(PermissionEnum),
};

const permissionsOf = (role: UserRoleType): PermissionType[] => ROLE_PERMISSIONS[role] ?? [];

const hasPermission = (user: Pick<AuthUserType, "role">, permission: PermissionType): boolean => permissionsOf(user.role).includes(permission);

export { ROLE_PERMISSIONS, permissionsOf, hasPermission };
