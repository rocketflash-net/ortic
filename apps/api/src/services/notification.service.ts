import Service from "@base/service.base";
import { logger } from "@config/logger.config";
import NotificationDto from "@dto/notification.dto";
import { NotificationTypeType } from "@enums/notification-type.enum";
import { eventBus } from "@helpers/event-bus.helper";
import NotificationRepository from "@repositories/notification.repository";
import { AuthUserType } from "@@types/auth.type";
import { PaginationQueryType } from "@@types/pagination.type";
import ResponseType from "@@types/response.type";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";

type NotifyInputType = {
  type: NotificationTypeType;
  title: string;
  body?: string | null;
  link?: string | null;
  orderId?: number | null;
  warehouseId?: number | null;
};

/**
 * Notifikasi dashboard admin: disimpan (lonceng, bisa dibaca belakangan) lalu disiarkan ke tab dashboard yang
 * terbuka lewat SSE (GET /admin/notifications/stream). Gagal menyimpan notifikasi tidak menggagalkan proses utama.
 */
export default class NotificationService extends Service {
  constructor(private readonly notificationRepository: NotificationRepository = new NotificationRepository()) {
    super();
  }

  async notify(input: NotifyInputType): Promise<void> {
    try {
      const notification = await this.notificationRepository.store({
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        orderId: input.orderId ?? null,
        warehouseId: input.warehouseId ?? null,
      });
      eventBus.emit("notification", notification);
    } catch (error) {
      logger.error({ err: error, type: input.type }, "[notification] failed to store notification");
    }
  }

  async list(user: AuthUserType, pagination: PaginationQueryType): Promise<ResponseType> {
    const [rows, total, readAt] = await Promise.all([
      this.notificationRepository.findVisible(user.warehouseId, toPaginationOptions(pagination)),
      this.notificationRepository.countVisible(user.warehouseId),
      this.notificationRepository.readAt(user.id),
    ]);
    const unread = await this.notificationRepository.countVisible(user.warehouseId, readAt ?? new Date(0));
    return this.success(
      rows.map((row) => NotificationDto.fromEntity(row, readAt)),
      "Success",
      undefined,
      { pagination: buildPaginationMeta(pagination, total), unread_count: unread }
    );
  }

  async markAllRead(user: AuthUserType): Promise<ResponseType> {
    await this.notificationRepository.markRead(user.id, new Date());
    return this.success({ unread_count: 0 }, "Notifications marked as read");
  }
}
