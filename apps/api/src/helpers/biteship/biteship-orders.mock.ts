import { randomInt } from "crypto";
import { BiteshipCreateOrderRequestType, BiteshipOrderResponseType, BiteshipOrderStatusType } from "@@types/biteship.type";

/**
 * Booking Biteship palsu untuk development & demo (BITESHIP_MOCK_ORDERS=true, ditolak di production).
 * Bentuk respons sama dengan POST /v1/orders; resi diberi awalan kurir + "MOCK" supaya tidak tertukar dengan resi asli.
 * Status berikutnya disimulasikan dari dashboard (POST /admin/orders/:code/simulate-shipping) lewat jalur webhook yang sama.
 */
const WAYBILL_PREFIX: Record<string, string> = { jne: "JNEMOCK", jnt: "JTMOCK", sicepat: "SCMOCK" };

const randomDigits = (length: number): string => Array.from({ length }, () => randomInt(10)).join("");

const mockCreateOrder = (body: BiteshipCreateOrderRequestType): BiteshipOrderResponseType => {
  const id = `mock_${Date.now().toString(36)}${randomDigits(6)}`;
  const deliveryDate = body.delivery_date && body.delivery_time ? `${body.delivery_date}T${body.delivery_time}:00+07:00` : new Date().toISOString();
  return {
    success: true,
    message: "Order successfully created",
    object: "order",
    id,
    courier: {
      tracking_id: `trk_${randomDigits(10)}`,
      waybill_id: `${WAYBILL_PREFIX[body.courier_company] ?? "MOCK"}${randomDigits(10)}`,
      company: body.courier_company,
      name: null,
      phone: null,
      type: body.courier_type,
      link: null,
      insurance: { amount: body.courier_insurance ?? 0, fee: 0, note: "" },
      routing_code: null,
    },
    delivery: { datetime: deliveryDate, note: null, type: body.delivery_type },
    reference_id: body.reference_id ?? null,
    price: 0,
    status: "confirmed",
  };
};

// Urutan perjalanan paket yang disimulasikan, beserta catatan kurir.
const MOCK_PROGRESSION: { status: BiteshipOrderStatusType; note: string }[] = [
  { status: "allocated", note: "Kurir sudah ditugaskan untuk menjemput paket" },
  { status: "picking_up", note: "Kurir dalam perjalanan ke gudang" },
  { status: "picked", note: "Paket sudah dijemput kurir" },
  { status: "dropping_off", note: "Paket dalam perjalanan ke alamat penerima" },
  { status: "delivered", note: "Paket sudah diterima" },
];

// Status berikutnya setelah `current`; null bila sudah selesai.
const nextMockStatus = (current: string | null): { status: BiteshipOrderStatusType; note: string } | null => {
  if (!current || current === "confirmed" || current === "scheduled") return MOCK_PROGRESSION[0];
  const index = MOCK_PROGRESSION.findIndex((step) => step.status === current);
  if (index === -1 || index === MOCK_PROGRESSION.length - 1) return null;
  return MOCK_PROGRESSION[index + 1];
};

export { mockCreateOrder, nextMockStatus, MOCK_PROGRESSION };
