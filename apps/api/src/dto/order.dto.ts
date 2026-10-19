import { OrderItemType, OrderType } from "@@types/entity.type";

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
  cancelled_at: Date | null;
  cancel_reason: string | null;
};

type OrderSummaryResponseType = Pick<OrderResponseType, "code" | "status" | "created_at" | "total"> & {
  item_count: number;
  first_item: { product_name: string; image_url: string | null } | null;
  expires_at: Date;
};

// Pesanan untuk pembeli (pemiliknya). MDR & data internal provider tidak dikirim.
export default class OrderDto {
  static detail(order: OrderType, items: OrderItemType[]): OrderResponseType {
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
      items: items.map((item) => ({
        product_name: item.productName,
        product_slug: item.productSlug,
        variant_name: item.variantName,
        sku: item.sku,
        image_url: item.imageUrl,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      items_total: order.itemsTotal,
      shipping_fee: order.shippingFee,
      insurance_fee: order.insuranceFee,
      service_fee: order.serviceFee,
      total: order.total,
      payment: { provider: order.paymentProvider, qr_string: awaitingPayment ? order.qrString : null, expires_at: order.expiresAt, paid_at: order.paidAt },
      cancelled_at: order.cancelledAt,
      cancel_reason: order.cancelReason,
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
    };
  }
}
