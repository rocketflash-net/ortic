import Service from "@base/service.base";
import UserDto from "@dto/user.dto";
import { AuditActionEnum } from "@enums/audit.enum";
import UserRoleEnum, { AdminRoleType, UserRoleType } from "@enums/user-role.enum";
import ForbiddenException from "@exceptions/forbidden.exception";
import LastAdminException from "@exceptions/last-admin.exception";
import NotFoundException from "@exceptions/not-found.exception";
import SessionRepository from "@repositories/session.repository";
import UserRepository from "@repositories/user.repository";
import AuditLogService from "@services/audit-log.service";
import { AuditActorType } from "@@types/audit.type";
import { UserType } from "@@types/entity.type";
import { PaginationQueryType } from "@@types/pagination.type";
import ResponseType from "@@types/response.type";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";

// Kelola user oleh admin (panel admin & CLI).
export default class UserService extends Service {
  constructor(
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly sessionRepository: SessionRepository = new SessionRepository(),
    private readonly auditLogService: AuditLogService = new AuditLogService()
  ) {
    super();
  }

  async list(search: string | undefined, pagination: PaginationQueryType): Promise<ResponseType> {
    const [users, total] = await Promise.all([this.userRepository.findAll(search, toPaginationOptions(pagination)), this.userRepository.count(search)]);
    return this.success(users.map(UserDto.forAdmin), "Success", undefined, { pagination: buildPaginationMeta(pagination, total) });
  }

  async updateRole(id: number, role: UserRoleType, actor: AuditActorType): Promise<ResponseType> {
    const user = await this.changeRole(id, role, actor);
    return this.success(UserDto.forAdmin(user), "User role updated");
  }

  async listAdmins(): Promise<UserType[]> {
    return await this.userRepository.findAdmins();
  }

  async listAdminUsers(): Promise<ResponseType> {
    return this.success((await this.listAdmins()).map(UserDto.forAdmin));
  }

  // Panel admin: sama dengan `grant` di CLI, jadi email yang belum terdaftar tetap bisa dijadikan admin.
  async grantAdmin(email: string, role: AdminRoleType, actor: AuditActorType): Promise<ResponseType> {
    return this.success(UserDto.forAdmin(await this.grantAdminByEmail(email, role, actor)), "Admin added");
  }

  // Jadikan email admin/superadmin. User dibuat jika belum ada; ia bisa login lewat OTP email atau Google dengan email itu.
  async grantAdminByEmail(rawEmail: string, role: AdminRoleType, actor: AuditActorType): Promise<UserType> {
    const email = rawEmail.trim().toLowerCase();
    const user = (await this.userRepository.findByEmail(email)) ?? (await this.userRepository.store({ email, name: email.split("@")[0].slice(0, 150) }));
    return await this.changeRole(user.id, role, actor);
  }

  async revokeAdminByEmail(rawEmail: string, actor: AuditActorType): Promise<UserType> {
    const user = await this.userRepository.findByEmail(rawEmail.trim().toLowerCase());
    if (!user) throw new NotFoundException(`User with email ${rawEmail} not found`);
    return await this.changeRole(user.id, UserRoleEnum.user, actor);
  }

  /**
   * Ubah role dengan pengaman:
   * - admin tidak bisa mengubah role dirinya sendiri (cegah salah klik mengunci diri sendiri);
   * - superadmin terakhir tidak bisa diturunkan (tanpa superadmin, tidak ada yang bisa mengelola admin);
   * - semua session user tersebut dicabut, supaya hak akses lama tidak tertinggal di perangkat lain;
   * - perubahan dicatat di audit log dalam transaction yang sama.
   */
  private async changeRole(id: number, role: UserRoleType, actor: AuditActorType): Promise<UserType> {
    if (actor.userId === id) throw new ForbiddenException("You cannot change your own role");

    return await this.userRepository.transaction(async (tx) => {
      const userRepository = this.userRepository.withTransaction(tx);
      const user = await userRepository.findByIdForUpdate(id);
      if (!user) throw new NotFoundException(`User with id ${id} not found`);
      if (user.role === role) return user;

      if (user.role === UserRoleEnum.superadmin) {
        const superadminIds = await userRepository.lockSuperadminIds();
        if (superadminIds.length <= 1) throw new LastAdminException();
      }

      await userRepository.update(id, { role });
      await this.sessionRepository.withTransaction(tx).destroyByUser(id);
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.user_role_updated,
        targetType: "user",
        targetId: id,
        metadata: { email: user.email, before: { role: user.role }, after: { role } },
      });
      return { ...user, role };
    });
  }
}
