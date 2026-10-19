/**
 * RBAC constants shared between frontend navigation, route guards, and backend ACL.
 *
 * @remarks
 * Keep every key in sync with backend permission definitions
 * (`apps/api/src/enums/permission.enum.ts` and `apps/api/src/registries/role-permission.registry.ts`).
 * Use the `resource:action` naming convention for predictable mapping.
 *
 * @example
 * ```ts
 * if (accessStore.hasPermission(Permission.ORDERS_MANAGE)) {
 *   // show accept/reject buttons
 * }
 * ```
 */
export const Permission = {
  /** Buyer: own orders. */
  ORDERS_READ: "orders:read",
  ORDERS_CREATE: "orders:create",

  DASHBOARD_VIEW: "dashboard:view",
  CUSTOMERS_READ: "customers:read",
  /** Add or revoke admins and change user roles (Owner only). */
  ADMINS_MANAGE: "admins:manage",
  PRODUCTS_MANAGE: "products:manage",
  STOCKS_MANAGE: "stocks:manage",
  /** Accept/reject orders, book couriers, refunds. */
  ORDERS_MANAGE: "orders:manage",
  TRANSACTIONS_READ: "transactions:read",
  /** Simulate QRIS payments of mock-provider orders (non-production API only). */
  PAYMENTS_SIMULATE: "payments:simulate",
  MEDIA_UPLOAD: "media:upload",
  /** Warehouses, couriers, and store settings (Owner only). */
  WAREHOUSES_MANAGE: "warehouses:manage",
  COURIERS_MANAGE: "couriers:manage",
  SETTINGS_MANAGE: "settings:manage",
  /** Read the admin audit log. */
  AUDIT_LOGS_READ: "audit_logs:read",
} as const

/**
 * Union of all supported permission keys.
 */
export type PermissionKey = (typeof Permission)[keyof typeof Permission]

/**
 * Coarse-grained role keys returned by the backend.
 *
 * @remarks
 * Prefer permission checks for feature-level access.
 */
export const Role = {
  /** Owner: full access, including admins, warehouses, couriers, and store settings. */
  SUPERADMIN: "superadmin",
  /** Staff: products, stock, and orders. */
  ADMIN: "admin",
  /** Buyer. */
  USER: "user",
} as const

/**
 * Union of all supported role keys.
 */
export type RoleKey = (typeof Role)[keyof typeof Role]

/**
 * Access profile hydrated from auth endpoints such as `/me` or `/auth/session`.
 */
export type AccessProfile = {
  /** Roles assigned to the signed-in user. */
  roles: RoleKey[]
  /** Fine-grained permissions assigned to the signed-in user. */
  permissions: PermissionKey[]
}
