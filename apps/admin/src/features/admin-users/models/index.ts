import type { Customer, CustomerRole } from "@/features/customers/models"

export enum AdminUsersPageName {
  ADMIN_USERS = "AdminUsers",
}

/** Roles with admin panel access. Only a superadmin manages admins. */
export type AdminRole = Exclude<CustomerRole, "user">

/** Admin or superadmin from `GET /admin/admins`, oldest first. Same shape as a customer. */
export type AdminUser = Customer & { role: AdminRole }
