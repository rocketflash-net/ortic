import { and, desc, eq, ne } from "drizzle-orm";
import Repository from "@base/repository.base";
import { userAddresses } from "@models/user-address.model";
import { NewUserAddressType, UserAddressType } from "@@types/entity.type";

export default class UserAddressRepository extends Repository {
  // Alamat utama dulu, lalu yang terbaru.
  async findByUser(userId: number): Promise<UserAddressType[]> {
    return await this.executor.select().from(userAddresses).where(eq(userAddresses.userId, userId)).orderBy(desc(userAddresses.isDefault), desc(userAddresses.id));
  }

  async findOwned(userId: number, id: number): Promise<UserAddressType | null> {
    const [address] = await this.executor
      .select()
      .from(userAddresses)
      .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)))
      .limit(1);
    return address ?? null;
  }

  async store(data: NewUserAddressType): Promise<number> {
    const [result] = await this.executor.insert(userAddresses).values(data).$returningId();
    return result!.id;
  }

  async update(id: number, data: Partial<NewUserAddressType>): Promise<void> {
    await this.executor.update(userAddresses).set(data).where(eq(userAddresses.id, id));
  }

  async destroy(id: number): Promise<void> {
    await this.executor.delete(userAddresses).where(eq(userAddresses.id, id));
  }

  // Hanya satu alamat utama per user.
  async clearDefault(userId: number, exceptId: number): Promise<void> {
    await this.executor
      .update(userAddresses)
      .set({ isDefault: false })
      .where(and(eq(userAddresses.userId, userId), ne(userAddresses.id, exceptId)));
  }
}
