import { z } from "zod";
import UserRoleEnum, { ADMIN_ROLES, USER_ROLES } from "@enums/user-role.enum";
import { searchQuerySchema } from "@validators/common.validator";

const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

const grantAdminSchema = z.object({
  email: z.email().max(191),
  role: z.enum(ADMIN_ROLES).default(UserRoleEnum.admin),
});

const listUserQuerySchema = searchQuerySchema;

const updateUserWarehouseSchema = z.object({
  warehouse_id: z.number().int().positive().nullable(),
});

export { updateUserRoleSchema, grantAdminSchema, listUserQuerySchema, updateUserWarehouseSchema };
