import { Request } from "express";
import { IncomingHttpHeaders } from "http";
import UnauthorizedException from "@exceptions/unauthorized.exception";
import { AuditSourceEnum } from "@enums/audit.enum";
import { AuditActorType } from "@@types/audit.type";
import { AuthUserType } from "@@types/auth.type";

// Ambil user login dari request. Dipakai di controller pada route yang sudah melewati middleware authenticate.
const getAuthUser = (req: Request): AuthUserType => {
  if (!req.user) throw new UnauthorizedException();
  return req.user;
};

// Nilai header (case-insensitive); header ganda diambil yang pertama.
const headerValue = (headers: IncomingHttpHeaders, name: string): string | undefined => {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

// Path request tanpa query string, mis. /api/v1/webhooks/batpay/v1.0/qr/qr-mpm-notify
const requestPath = (req: Request): string => req.originalUrl.split("?")[0];

// Pelaku aksi admin dari dashboard, untuk audit log.
const getAuditActor = (req: Request): AuditActorType => ({ userId: getAuthUser(req).id, source: AuditSourceEnum.dashboard, ipAddress: req.ip ?? null });

export { getAuthUser, getAuditActor, headerValue, requestPath };
