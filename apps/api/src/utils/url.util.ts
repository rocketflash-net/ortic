import { appConfig } from "@config/app.config";
import FrontendAppEnum, { FrontendAppType } from "@enums/frontend-app.enum";

const DEFAULT_REDIRECT_PATH = "/";

/**
 * Hanya izinkan path relatif di frontend (cegah open redirect), contoh valid: `/orders/ORT-12`.
 * Ditolak: URL absolut, protocol-relative (`//evil.com`), dan backslash (`/\evil.com`).
 */
const safeRedirectPath = (value: unknown): string => {
  if (typeof value !== "string") return DEFAULT_REDIRECT_PATH;
  const isRelativePath = value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
  return isRelativePath ? value : DEFAULT_REDIRECT_PATH;
};

const webUrl = (path: string): string => `${appConfig.webUrl}${path}`;

const adminUrl = (path: string): string => `${appConfig.adminUrl}${path}`;

const frontendUrl = (app: FrontendAppType, path: string): string => (app === FrontendAppEnum.admin ? adminUrl(path) : webUrl(path));

export { safeRedirectPath, webUrl, adminUrl, frontendUrl };
