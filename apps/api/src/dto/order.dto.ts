import { OrderEventRowType } from "@repositories/order-event.repository";
import { AdminOrderRowType } from "@repositories/order.repository";
import { OrderItemType, OrderType, UserType, WarehouseType } from "@@types/entity.type";

type OrderItemResponseType = {
  product_name: string;
  product_slug: string;
  variant_name: string | null;
  sku: string;
  image_url: string | null;
  price: number;
  quantity: number;
  subtotal: number;
};

type OrderEventResponseType = {
  type: string;
  status: string | null;
  title: string;
  description: string | null;
  occurred_at: Date;
};

type ShipmentResponseType = {
  waybill_id: string | null;
  // Status mentah Biteship (confirmed, allocated, picked, ..., delivered).
  status: string | null;
  courier_link: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  pickup_scheduled_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
};

type OrderResponseType = {
  code: string;
  status: string;
  created_at: Date;
  recipient: { name: string; phone: string; address: string; district: string; city: string; province: string; postal_code: string; notes: string | null };
  courier: { code: string; name: string; service_code: string; service_name: string; duration: string | null };
  weight_gram: number;
  items: OrderItemResponseType[];
  items_total: number;
  shipping_fee: number;
  insurance_fee: number;
  service_fee: number;
  total: number;
  // QR hanya dikirim selama order masih menunggu pembayaran.
  payment: { provider: string; qr_string: string | null; expires_at: Date; paid_at: Date | null };
  shipment: ShipmentResponseType;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  rejected_at: Date | null;
  reject_reason: string | null;
  refund: { status: string; amount: number | null; refunded_at: Date | null; note: string | null };
  completed_at: Date | null;
  events: OrderEventResponseType[];
};

type OrderSummaryResponseType = Pick<OrderResponseType, "code" | "status" | "created_at" | "total"> & {
  item_count: number;
  first_item: { product_name: string; image_url: string | null } | null;
  expires_at: Date;
  waybill_id: string | null;
  shipping_status: string | null;
  refund_status: string;
};

type AdminOrderListItemType = {
  code: string;
  status: string;
  created_at: Date;
  paid_at: Date | null;
  buyer: { name: string; email: string };
  recipient_name: string;
  city: string;
  warehouse_id: number;
  courier: string;
  waybill_id: string | null;
  shipping_status: string | null;
  shipment_error: string | null;
  item_count: number;
  total: number;
  refund_status: string;
};

type AdminOrderDetailType = OrderResponseType & {
  id: number;
  buyer: { id: number; name: string; email: string; phone: string | null; profession: string | null };
  warehouse: { id: number; code: string; name: string; city: string } | null;
  payment: OrderResponseType["payment"] & { provider_ref: string | null; provider_transaction_id: string | null; mdr_amount: number };
  shipment: ShipmentResponseType & {
    biteship_order_id: string | null;
    tracking_id: string | null;
    booked_at: Date | null;
    attempts: number;
    error: string | null;
    tracked_at: Date | null;
  };
  insured_value: number;
  accepted_at: Date | null;
  // Laba kotor hanya untuk yang boleh melihat harga dasar.
  cost_total: number | null;
  events: (OrderEventResponseType & { is_public: boolean; actor_name: string | null })[];
  can: { accept: boolean; reject: boolean; book_shipment: boolean; mark_refunded: boolean; simulate_shipping: boolean };
};

const itemResponse = (item: OrderItemType): OrderItemResponseType => ({
  product_name: item.productName,
  product_slug: item.productSlug,
  variant_name: item.variantName,
  sku: item.sku,
  image_url: item.imageUrl,
  price: item.price,
  quantity: item.quantity,
  subtotal: item.subtotal,
});

const eventResponse = (event: OrderEventRowType): OrderEventResponseType => ({
  type: event.type,
  status: event.status,
  title: event.title,
  description: event.description,
  occurred_at: event.occurredAt,
});

const shipmentResponse = (order: OrderType): ShipmentResponseType => ({
  waybill_id: order.waybillId,
  status: order.shippingStatus,
  courier_link: order.courierLink,
  driver_name: order.courierDriverName,
  driver_phone: order.courierDriverPhone,
  pickup_scheduled_at: order.pickupScheduledAt,
  shipped_at: order.shippedAt,
  delivered_at: order.deliveredAt,
});

// Pesanan untuk pembeli (pemiliknya) dan dashboard admin. Pembeli tidak menerima MDR, harga dasar, dan data internal provider.
export default class OrderDto {
  static detail(order: OrderType, items: OrderItemType[], events: OrderEventRowType[] = []): OrderResponseType {
    const awaitingPayment = order.status === "awaiting_payment";
    return {
      code: order.code,
      status: order.status,
      created_at: order.createdAt,
      recipient: {
        name: order.recipientName,
        phone: order.recipientPhone,
        address: order.address,
        district: order.district,
        city: order.city,
        province: order.province,
        postal_code: order.postalCode,
        notes: order.addressNotes,
      },
      courier: {
        code: order.courierCode,
        name: order.courierName,
        service_code: order.courierServiceCode,
        service_name: order.courierServiceName,
        duration: order.courierDuration,
      },
      weight_gram: order.weightGram,
      items: items.map(itemResponse),
      items_total: order.itemsTotal,
      shipping_fee: order.shippingFee,
      insurance_fee: order.insuranceFee,
      service_fee: order.serviceFee,
      total: order.total,
      payment: { provider: order.paymentProvider, qr_string: awaitingPayment ? order.qrString : null, expires_at: order.expiresAt, paid_at: order.paidAt },
      shipment: shipmentResponse(order),
      cancelled_at: order.cancelledAt,
      cancel_reason: order.cancelReason,
      rejected_at: order.rejectedAt,
      reject_reason: order.rejectReason,
      refund: { status: order.refundStatus, amount: order.refundAmount, refunded_at: order.refundedAt, note: order.refundNote },
      completed_at: order.completedAt,
      events: events.map(eventResponse),
    };
  }

  static summary(order: OrderType, items: OrderItemType[]): OrderSummaryResponseType {
    const first = items[0];
    return {
      code: order.code,
      status: order.status,
      created_at: order.createdAt,
      total: order.total,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      first_item: first ? { product_name: first.productName, image_url: first.imageUrl } : null,
      expires_at: order.expiresAt,
      waybill_id: order.waybillId,
      shipping_status: order.shippingStatus,
      refund_status: order.refundStatus,
    };
  }

  static adminListItem(order: AdminOrderRowType, items: OrderItemType[]): AdminOrderListItemType {
    return {
      code: order.code,
      status: order.status,
      created_at: order.createdAt,
      paid_at: order.paidAt,
      buyer: { name: order.buyerName, email: order.buyerEmail },
      recipient_name: order.recipientName,
      city: order.city,
      warehouse_id: order.warehouseId,
      courier: `${order.courierName} ${order.courierServiceName}`,
      waybill_id: order.waybillId,
      shipping_status: order.shippingStatus,
      shipment_error: order.biteshipOrderId ? null : order.shipmentError,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: order.total,
      refund_status: order.refundStatus,
    };
  }

  static adminDetail(
    order: OrderType,
    items: OrderItemType[],
    events: OrderEventRowType[],
    context: {
      buyer: UserType | null;
      warehouse: WarehouseType | null;
      canSeeCost: boolean;
      can: AdminOrderDetailType["can"];
    }
  ): AdminOrderDetailType {
    const base = OrderDto.detail(order, items, events);
    const costKnown = items.every((item) => item.basePrice !== null);
    return {
      ...base,
      id: order.id,
      buyer: {
        id: order.userId,
        name: context.buyer?.name ?? "-",
        email: context.buyer?.email ?? "-",
        phone: context.buyer?.phone ?? null,
        profession: context.buyer?.profession ?? null,
      },
      warehouse: context.warehouse
        ? { id: context.warehouse.id, code: context.warehouse.code, name: context.warehouse.name, city: context.warehouse.city }
        : null,
      payment: {
        ...base.payment,
        provider_ref: order.providerRef,
        provider_transaction_id: order.providerTransactionId,
        mdr_amount: order.mdrAmount,
      },
      shipment: {
        ...base.shipment,
        biteship_order_id: order.biteshipOrderId,
        tracking_id: order.courierTrackingId,
        booked_at: order.shipmentBookedAt,
        attempts: order.shipmentAttempts,
        error: order.shipmentError,
        tracked_at: order.trackedAt,
      },
      insured_value: order.insuredValue,
      accepted_at: order.acceptedAt,
      cost_total: context.canSeeCost && costKnown ? items.reduce((sum, item) => sum + (item.basePrice ?? 0) * item.quantity, 0) : null,
      events: events.map((event) => ({ ...eventResponse(event), is_public: event.isPublic, actor_name: event.actorName })),
      can: context.can,
    };
  }
}
