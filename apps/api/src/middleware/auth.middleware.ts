import { NextFunction, Request, Response } from "express";
import { PermissionType } from "@enums/permission.enum";
import ForbiddenException from "@exceptions/forbidden.exception";
import UnauthorizedException from "@exceptions/unauthorized.exception";
import { hasPermission } from "@registries/role-permission.registry";
import AuthService from "@services/auth.service";

const authService = new AuthService();

const BEARER_PREFIX = "Bearer ";

/**
 * Wajib login: baca access token dari header `Authorization: Bearer <JWT>`, verifikasi JWT + sesinya,
 * lalu tempel user ke `req.user`. Token kedaluwarsa/dicabut -> 401; client lalu memakai refresh token.
 */
const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header("authorization");
  const accessToken = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length).trim() : null;
  const authenticated = accessToken ? await authService.authenticateAccessToken(accessToken) : null;
  if (!authenticated) throw new UnauthorizedException();

  req.user = authenticated.user;
  req.sessionId = authenticated.sessionId;
  next();
};

/**
 * RBAC: user wajib memiliki SEMUA permission yang disebut. Pakai setelah `authenticate`.
 * Contoh: router.get("/", requirePermission(PermissionEnum.orders_read), index)
 */
const requirePermission =
  (...permissions: PermissionType[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new UnauthorizedException();

    const missing = permissions.filter((permission) => !hasPermission(user, permission));
    if (missing.length > 0) throw new ForbiddenException("You do not have permission to perform this action", { missing_permissions: missing });
    next();
  };

export { authenticate, requirePermission };
