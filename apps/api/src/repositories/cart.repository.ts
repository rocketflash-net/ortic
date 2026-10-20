import { and, asc, eq, inArray, sql } from "drizzle-orm";
import Repository from "@base/repository.base";
import { cartItems } from "@models/cart-item.model";
import { CartItemType } from "@@types/entity.type";

export default class CartRepository extends Repository {
  async findByUser(userId: number): Promise<CartItemType[]> {
    return await this.executor.select().from(cartItems).where(eq(cartItems.userId, userId)).orderBy(asc(cartItems.createdAt), asc(cartItems.id));
  }

  // Set jumlah satu varian (baris dibuat bila belum ada).
  async upsert(userId: number, variantId: number, quantity: number): Promise<void> {
    await this.executor
      .insert(cartItems)
      .values({ userId, variantId, quantity })
      .onDuplicateKeyUpdate({ set: { quantity: sql`values(${cartItems.quantity})` } });
  }

  async removeVariants(userId: number, variantIds: number[]): Promise<void> {
    if (variantIds.length === 0) return;
    await this.executor.delete(cartItems).where(and(eq(cartItems.userId, userId), inArray(cartItems.variantId, variantIds)));
  }

  async clear(userId: number): Promise<void> {
    await this.executor.delete(cartItems).where(eq(cartItems.userId, userId));
  }
}
