import OrderStatusEnum, { OrderStatusType } from "@enums/order-status.enum";

/**
 * Pemetaan status Biteship -> status pesanan Ortic (docs/PRD.md "Pemetaan status Biteship").
 * cancelled/disposed (pengiriman batal) dan rejected/courier_not_found butuh keputusan admin -> needs_action.
 */
const BITESHIP_STATUS_MAP: Record<string, OrderStatusType> = {
  confirmed: OrderStatusEnum.processing,
  scheduled: OrderStatusEnum.processing,
  allocated: OrderStatusEnum.awaiting_pickup,
  picking_up: OrderStatusEnum.awaiting_pickup,
  picked: OrderStatusEnum.shipped,
  in_transit: OrderStatusEnum.shipped,
  dropping_off: OrderStatusEnum.shipped,
  on_hold: OrderStatusEnum.shipped,
  delivered: OrderStatusEnum.completed,
  rejected: OrderStatusEnum.needs_action,
  courier_not_found: OrderStatusEnum.needs_action,
  return_in_transit: OrderStatusEnum.returned,
  returned: OrderStatusEnum.returned,
  cancelled: OrderStatusEnum.needs_action,
  disposed: OrderStatusEnum.needs_action,
};

// Label Indonesia untuk riwayat pengiriman.
const BITESHIP_STATUS_LABELS: Record<string, string> = {
  confirmed: "Kurir dibooking",
  scheduled: "Pickup dijadwalkan",
  allocated: "Kurir ditugaskan",
  picking_up: "Kurir menuju gudang",
  picked: "Paket dijemput kurir",
  in_transit: "Paket dalam perjalanan",
  dropping_off: "Paket diantar ke penerima",
  on_hold: "Pengiriman tertahan",
  delivered: "Paket diterima",
  rejected: "Paket ditolak",
  courier_not_found: "Kurir tidak ditemukan",
  return_in_transit: "Paket dikembalikan ke gudang",
  returned: "Paket kembali ke gudang",
  cancelled: "Pengiriman dibatalkan",
  disposed: "Paket dimusnahkan",
};

// Status Biteship setelah paket dijemput: booking tidak bisa dibatalkan lagi.
const PICKED_UP_STATUSES = ["picked", "in_transit", "dropping_off", "on_hold", "delivered", "return_in_transit", "returned", "disposed"];

const mapBiteshipStatus = (status: string): OrderStatusType | null => BITESHIP_STATUS_MAP[status] ?? null;

const biteshipStatusLabel = (status: string): string => BITESHIP_STATUS_LABELS[status] ?? status;

export { mapBiteshipStatus, biteshipStatusLabel, PICKED_UP_STATUSES };
