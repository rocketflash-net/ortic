import { NotificationType } from "@@types/entity.type";

type NotificationResponseType = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  warehouse_id: number | null;
  is_read: boolean;
  created_at: Date;
};

export default class NotificationDto {
  // `readAt` = users.notifications_read_at milik admin yang membaca; NULL = belum pernah membuka notifikasi.
  static fromEntity(notification: NotificationType, readAt: Date | null = null): NotificationResponseType {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      warehouse_id: notification.warehouseId,
      is_read: readAt !== null && notification.createdAt <= readAt,
      created_at: notification.createdAt,
    };
  }
}
