import { asc, count, desc, eq, inArray, like, or, SQL } from "drizzle-orm";
import Repository from "@base/repository.base";
import UserRoleEnum, { ADMIN_ROLES } from "@enums/user-role.enum";
import { users } from "@models/user.model";
import { NewUserType, UserType } from "@@types/entity.type";
import { PaginationOptionsType } from "@@types/pagination.type";

export default class UserRepository extends Repository {
  async findById(id: number): Promise<UserType | null> {
    const [user] = await this.executor.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async findByGoogleSub(googleSub: string): Promise<UserType | null> {
    const [user] = await this.executor.select().from(users).where(eq(users.googleSub, googleSub)).limit(1);
    return user ?? null;
  }

  async findByEmail(email: string): Promise<UserType | null> {
    const [user] = await this.executor.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  // Kunci baris user selama transaction, supaya perubahan role tidak balapan.
  async findByIdForUpdate(id: number): Promise<UserType | null> {
    const [user] = await this.executor.select().from(users).where(eq(users.id, id)).limit(1).for("update");
    return user ?? null;
  }

  // Id semua superadmin, dikunci selama transaction. Dipakai untuk mencegah superadmin terakhir diturunkan oleh dua request bersamaan.
  async lockSuperadminIds(): Promise<number[]> {
    const rows = await this.executor.select({ id: users.id }).from(users).where(eq(users.role, UserRoleEnum.superadmin)).for("update");
    return rows.map((row) => row.id);
  }

  // Admin dan superadmin.
  async findAdmins(): Promise<UserType[]> {
    return await this.executor
      .select()
      .from(users)
      .where(inArray(users.role, [...ADMIN_ROLES]))
      .orderBy(asc(users.id));
  }

  async findAll(search: string | undefined, pagination: PaginationOptionsType): Promise<UserType[]> {
    return await this.executor
      .select()
      .from(users)
      .where(this.searchCondition(search))
      .orderBy(desc(users.id))
      .limit(pagination.limit)
      .offset(pagination.offset);
  }

  async count(search: string | undefined): Promise<number> {
    const [result] = await this.executor.select({ total: count() }).from(users).where(this.searchCondition(search));
    return result?.total ?? 0;
  }

  async store(payload: NewUserType): Promise<UserType> {
    const [{ id }] = await this.executor.insert(users).values(payload).$returningId();
    return (await this.findById(id)) as UserType;
  }

  async update(id: number, payload: Partial<NewUserType>): Promise<void> {
    await this.executor.update(users).set(payload).where(eq(users.id, id));
  }

  private searchCondition(search: string | undefined): SQL | undefined {
    if (!search) return undefined;
    const keyword = `%${search}%`;
    return or(like(users.name, keyword), like(users.email, keyword));
  }
}
