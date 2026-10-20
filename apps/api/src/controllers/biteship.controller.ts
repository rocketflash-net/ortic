import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { biteshipConfig } from "@config/order.config";
import { logger } from "@config/logger.config";
import ResponseDto from "@dto/response.dto";
import ResponseCodeEnum from "@enums/response-code.enum";
import ShipmentService from "@services/shipment.service";
import { BiteshipWebhookPayloadType } from "@@types/biteship.type";
import { safeEqual } from "@utils/crypto.util";
import { headerValue } from "@utils/request.util";

const shipmentService = new ShipmentService();

/**
 * POST /webhooks/biteship — dipanggil server Biteship (event order.status, order.waybill_id, order.price).
 * Daftarkan URL {API_URL}/api/v1/webhooks/biteship di dashboard Biteship > Integrations > Webhook, dengan
 * "Signature Key" = BITESHIP_WEBHOOK_HEADER dan "Signature Secret" = BITESHIP_WEBHOOK_SECRET.
 *
 * Saat mendaftarkan URL, Biteship mengirim request percobaan tanpa event: dibalas 200 supaya pendaftaran berhasil.
 * Pesanan yang tidak dikenal juga dibalas 200 (tidak perlu dikirim ulang).
 */
const webhook = async (req: Request, res: Response) => {
  const payload = (req.body ?? {}) as BiteshipWebhookPayloadType;
  const ok = (message: string) => res.status(StatusCodes.OK).json(new ResponseDto().setResponseMessage(message).toArray());

  if (!payload.event) return ok("Webhook installed");

  const provided = headerValue(req.headers, biteshipConfig.webhookHeader) ?? "";
  if (!biteshipConfig.webhookSecret || !safeEqual(provided, biteshipConfig.webhookSecret)) {
    logger.warn({ event: payload.event, orderId: payload.order_id }, "[biteship] webhook rejected: invalid signature");
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(new ResponseDto().setResponseCode(ResponseCodeEnum.unauthorized).setResponseMessage("Invalid webhook signature").toArray());
  }

  logger.info({ event: payload.event, orderId: payload.order_id, status: payload.status, waybill: payload.courier_waybill_id }, "[biteship] webhook received");
  const result = await shipmentService.handleWebhook(payload);
  return ok(result.handled ? "Processed" : "Ignored");
};

export { webhook };
