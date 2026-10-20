import { Request, Response } from "express";
import AuditLogService from "@services/audit-log.service";
import UserService from "@services/user.service";
import { getAuditActor } from "@utils/request.util";
import { idParamSchema } from "@validators/common.validator";
import { grantAdminSchema, listUserQuerySchema, updateUserRoleSchema, updateUserWarehouseSchema } from "@validators/admin.validator";
import { listAuditLogQuerySchema } from "@validators/audit-log.validator";

// Dashboard admin: kelola user & admin, dan lihat audit log.
const userService = new UserService();
const auditLogService = new AuditLogService();

const listUsers = async (req: Request, res: Response) => {
  const { page, limit, search } = listUserQuerySchema.parse(req.query);
  const result = await userService.list(search, { page, limit });
  res.status(result.status).json(result.data);
};

const updateUserRole = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const { role } = updateUserRoleSchema.parse(req.body);
  const result = await userService.updateRole(id, role, getAuditActor(req));
  res.status(result.status).json(result.data);
};

// PATCH /admin/users/:id/warehouse { warehouse_id | null }
const updateUserWarehouse = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const { warehouse_id } = updateUserWarehouseSchema.parse(req.body);
  const result = await userService.updateWarehouse(id, warehouse_id, getAuditActor(req));
  res.status(result.status).json(result.data);
};

const listAdmins = async (_req: Request, res: Response) => {
  const result = await userService.listAdminUsers();
  res.status(result.status).json(result.data);
};

const storeAdmin = async (req: Request, res: Response) => {
  const { email, role } = grantAdminSchema.parse(req.body);
  const result = await userService.grantAdmin(email, role, getAuditActor(req));
  res.status(result.status).json(result.data);
};

// GET /admin/audit-logs?action=&actor_user_id=&target_type=&target_id=
const listAuditLogs = async (req: Request, res: Response) => {
  const { page, limit, ...filter } = listAuditLogQuerySchema.parse(req.query);
  const result = await auditLogService.list(filter, { page, limit });
  res.status(result.status).json(result.data);
};

export { listUsers, updateUserRole, updateUserWarehouse, listAdmins, storeAdmin, listAuditLogs };
