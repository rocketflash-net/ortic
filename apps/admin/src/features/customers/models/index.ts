export enum CustomersPageName {
  CUSTOMERS_LIST = "CustomersList",
}

/** User roles, matching `apps/api/src/enums/user-role.enum.ts`. */
export type CustomerRole = "user" | "admin" | "superadmin"

/** User as returned by `GET /admin/users`. Dates are ISO strings. */
export type Customer = {
  id: number
  email: string
  name: string
  avatar_url: string | null
  role: CustomerRole
  created_at: string
}

export type CustomerListParams = {
  page: number
  limit: number
  /** Email or name. */
  search: string
}

/** `additionalInfo` of the customer list response. */
export type CustomerListInfo = {
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
