import { Request, Response } from "express";
import MockPaymentGateway from "@helpers/payment/mock-payment.gateway";
import PaymentWebhookService from "@services/payment-webhook.service";
import { requestPath } from "@utils/request.util";

const mockWebhookService = new PaymentWebhookService(new MockPaymentGateway());

// POST /webhooks/mock/payments — simulasi pembayaran saat development (tidak terdaftar di production).
const mockPayment = async (req: Request, res: Response) => {
  const result = await mockWebhookService.handle({ headers: req.headers, body: req.body, rawBody: req.rawBody, path: requestPath(req) });
  res.status(result.status).json(result.data);
};

export { mockPayment };
