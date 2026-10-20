import { and, asc, eq } from "drizzle-orm";
import Repository from "@base/repository.base";
import { orderEvents } from "@models/order-event.model";
import { users } from "@models/user.model";
import { NewOrderEventType, OrderEventType } from "@@types/entity.type";

type OrderEventRowType = OrderEventType & { actorName: string | null };

export default class OrderEventRepository extends Repository {
  async store(data: NewOrderEventType): Promise<void> {
    await this.executor.insert(orderEvents).values(data);
  }

  // Riwayat satu pesanan, terlama dulu. `publicOnly` untuk pembeli.
  async findByOrder(orderId: number, publicOnly = false): Promise<OrderEventRowType[]> {
    const rows = await this.executor
      .select({ event: orderEvents, actorName: users.name })
      .from(orderEvents)
      .leftJoin(users, eq(users.id, orderEvents.actorUserId))
      .where(and(eq(orderEvents.orderId, orderId), publicOnly ? eq(orderEvents.isPublic, true) : undefined))
      .orderBy(asc(orderEvents.occurredAt), asc(orderEvents.id));
    return rows.map((row) => ({ ...row.event, actorName: row.actorName }));
  }

  // Update kurir yang sama (status + waktu) tidak dicatat dua kali (webhook & rekonsiliasi bisa mengirim ulang).
  async trackingExists(orderId: number, status: string, occurredAt: Date): Promise<boolean> {
    const [row] = await this.executor
      .select({ id: orderEvents.id })
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, orderId), eq(orderEvents.type, "tracking"), eq(orderEvents.status, status), eq(orderEvents.occurredAt, occurredAt)))
      .limit(1);
    return Boolean(row);
  }
}

export { type OrderEventRowType };
