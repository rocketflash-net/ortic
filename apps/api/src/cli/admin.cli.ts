import "../paths";
import { closeDatabaseConnection } from "@config/database.config";
import { AuditSourceEnum } from "@enums/audit.enum";
import UserRoleEnum, { ADMIN_ROLES, AdminRoleType } from "@enums/user-role.enum";
import UserService from "@services/user.service";
import { AuditActorType } from "@@types/audit.type";

/**
 * Kelola admin dari server (bukan dari dashboard), mis. untuk superadmin pertama atau memulihkan akses.
 *
 *   npm run admin -- grant  <email> [superadmin|admin]   # default superadmin (user dibuat jika belum ada)
 *   npm run admin -- revoke <email>                      # turunkan ke user biasa (superadmin terakhir tidak bisa diturunkan)
 *   npm run admin -- list                                # daftar admin & superadmin
 *
 * Production (dari hasil build): npm run admin:prod -- grant <email>
 */
const USAGE = "Usage: npm run admin -- grant <email> [superadmin|admin] | revoke <email> | list";

const actor: AuditActorType = { userId: null, source: AuditSourceEnum.cli, ipAddress: null };

const isAdminRole = (value: string): value is AdminRoleType => (ADMIN_ROLES as readonly string[]).includes(value);

const run = async (): Promise<void> => {
  const [command, email, role = UserRoleEnum.superadmin] = process.argv.slice(2);
  const userService = new UserService();

  if (command === "list") {
    const admins = await userService.listAdmins();
    if (admins.length === 0) console.log("No admins yet.");
    for (const admin of admins) console.log(`${admin.id}\t${admin.role}\t${admin.email}\t${admin.name}`);
    return;
  }

  if ((command !== "grant" && command !== "revoke") || !email || !isAdminRole(role)) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const user = command === "grant" ? await userService.grantAdminByEmail(email, role, actor) : await userService.revokeAdminByEmail(email, actor);
  console.log(`${user.email}: role = ${user.role}`);
};

run()
  .catch((error: unknown) => {
    console.error(`[admin] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
