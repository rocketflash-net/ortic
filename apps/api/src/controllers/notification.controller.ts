import { Request, Response } from "express";
import NotificationDto from "@dto/notification.dto";
import { eventBus } from "@helpers/event-bus.helper";
import NotificationService from "@services/notification.service";
import { getAuthUser } from "@utils/request.util";
import { paginationQuerySchema } from "@validators/common.validator";

const service = new NotificationService();

// Komentar SSE berkala supaya proxy/load balancer tidak memutus koneksi yang diam.
const HEARTBEAT_MS = 25_000;

// GET /admin/notifications
const index = async (req: Request, res: Response) => {
  const result = await service.list(getAuthUser(req), paginationQuerySchema.parse(req.query));
  res.status(result.status).json(result.data);
};

// POST /admin/notifications/read -> tandai semua sudah dibaca.
const markRead = async (req: Request, res: Response) => {
  const result = await service.markAllRead(getAuthUser(req));
  res.status(result.status).json(result.data);
};

/**
 * GET /admin/notifications/stream (Server-Sent Events). Dashboard membuka koneksi ini dengan fetch + header
 * Authorization, lalu menerima `event: notification` setiap ada notifikasi baru (sesuai gudang Staf).
 */
const stream = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Nginx: jangan buffer respons streaming.
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(": connected\n\n");

  const unsubscribe = eventBus.on("notification", (notification) => {
    if (user.warehouseId && notification.warehouseId && notification.warehouseId !== user.warehouseId) return;
    res.write(`event: notification\ndata: ${JSON.stringify(NotificationDto.fromEntity(notification))}\n\n`);
  });
  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};

export { index, markRead, stream };
