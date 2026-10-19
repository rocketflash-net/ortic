const UserRoleEnum = {
  user: "user",
  admin: "admin",
  // Admin dengan akses penuh, termasuk mengelola admin lain.
  superadmin: "superadmin",
} as const;

type UserRoleType = (typeof UserRoleEnum)[keyof typeof UserRoleEnum];

const USER_ROLES = Object.values(UserRoleEnum) as [UserRoleType, ...UserRoleType[]];

// Role yang bisa diberikan lewat "tambah admin" (panel & CLI).
const ADMIN_ROLES = [UserRoleEnum.admin, UserRoleEnum.superadmin] as const;
type AdminRoleType = (typeof ADMIN_ROLES)[number];

export default UserRoleEnum;
export { USER_ROLES, ADMIN_ROLES, type UserRoleType, type AdminRoleType };
