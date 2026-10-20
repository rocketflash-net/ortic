// Bentuk request/response Biteship, disalin dari dokumentasi resmi (https://biteship.com/id/docs/api).
// Nama field sengaja snake_case persis seperti API supaya bisa dikirim/diterima apa adanya.

type BiteshipAreaType = {
  id: string;
  name: string;
  country_name: string;
  country_code: string;
  administrative_division_level_1_name: string;
  administrative_division_level_1_type: string;
  administrative_division_level_2_name: string;
  administrative_division_level_2_type: string;
  administrative_division_level_3_name: string;
  administrative_division_level_3_type: string;
  postal_code: number;
};

type BiteshipAreasResponseType = {
  success: boolean;
  areas: BiteshipAreaType[];
};

type BiteshipItemCategoryType =
  | "fashion"
  | "healthcare"
  | "food_and_drink"
  | "electronic"
  | "beauty"
  | "outdoor_gear"
  | "home_accessories"
  | "hobby"
  | "collection"
  | "sparepart"
  | "groceries"
  | "frozen_food"
  | "others";

type BiteshipRateItemType = {
  name: string;
  description?: string;
  category?: BiteshipItemCategoryType;
  sku?: string;
  // Nilai barang (Rp).
  value: number;
  quantity: number;
  // Gram.
  weight: number;
  // Sentimeter.
  height?: number;
  length?: number;
  width?: number;
};

// POST /v1/rates/couriers. Asal & tujuan masing-masing memakai salah satu: area_id, koordinat, atau kode pos (boleh dicampur).
type BiteshipRatesRequestType = {
  origin_area_id?: string;
  destination_area_id?: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
  origin_postal_code?: number;
  destination_postal_code?: number;
  type?: "origin_suggestion_to_closest_destination";
  // Kode kurir dipisah koma, mis. "jne,jnt,sicepat".
  couriers: string;
  items: BiteshipRateItemType[];
  courier_insurance?: number;
  destination_cash_on_delivery?: number;
  destination_cash_on_delivery_type?: "7_days" | "5_days" | "3_days";
};

type BiteshipRateLocationType = {
  location_id: string;
  latitude: number;
  longitude: number;
  postal_code: number;
  country_name: string;
  country_code: string;
  administrative_division_level_1_name: string;
  administrative_division_level_1_type: string;
  administrative_division_level_2_name: string;
  administrative_division_level_2_type: string;
  administrative_division_level_3_name: string;
  administrative_division_level_3_type: string;
  administrative_division_level_4_name: string;
  administrative_division_level_4_type: string;
  address: string;
};

type BiteshipPricingType = {
  available_collection_method: string[];
  available_for_cash_on_delivery: boolean;
  available_for_proof_of_delivery: boolean;
  available_for_instant_waybill_id: boolean;
  available_for_insurance: boolean;
  company: string;
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  currency: string;
  description: string;
  // Mis. "2 - 3 days".
  duration: string;
  shipment_duration_range: string;
  shipment_duration_unit: string;
  service_type: string;
  shipping_type: string;
  shipping_fee: number;
  shipping_fee_discount: number;
  shipping_fee_surcharge: number;
  insurance_fee: number;
  cash_on_delivery_fee: number;
  // Harga akhir = shipping_fee - discount + surcharge + insurance_fee + cash_on_delivery_fee.
  price: number;
  tax_lines: unknown[];
  type: string;
};

type BiteshipRatesResponseType = {
  success: true;
  object: "courier_pricing";
  message: string;
  code: number;
  origin: BiteshipRateLocationType;
  destination: BiteshipRateLocationType;
  pricing: BiteshipPricingType[];
};

// Bentuk error Biteship: { success: false, error: "...", code: 40001010 }.
type BiteshipErrorResponseType = {
  success: false;
  error: string;
  code?: number;
};

// POST /v1/orders (https://biteship.com/id/docs/api/orders/create). delivery_type "scheduled" = pickup terjadwal.
type BiteshipOrderItemType = BiteshipRateItemType;

type BiteshipCreateOrderRequestType = {
  shipper_contact_name?: string;
  shipper_contact_phone?: string;
  shipper_contact_email?: string;
  shipper_organization?: string;
  origin_contact_name: string;
  origin_contact_phone: string;
  origin_address: string;
  origin_note?: string;
  origin_postal_code?: number;
  origin_area_id?: string;
  origin_coordinate?: { latitude: number; longitude: number };
  destination_contact_name: string;
  destination_contact_phone: string;
  destination_contact_email?: string;
  destination_address: string;
  destination_postal_code?: number;
  destination_area_id?: string;
  destination_note?: string;
  courier_company: string;
  courier_type: string;
  courier_insurance?: number;
  delivery_type: "now" | "scheduled";
  // YYYY-MM-DD dan HH:mm (WIB) untuk delivery_type "scheduled".
  delivery_date?: string;
  delivery_time?: string;
  order_note?: string;
  reference_id?: string;
  metadata?: Record<string, unknown>;
  items: BiteshipOrderItemType[];
};

// Status order Biteship (https://biteship.com/id/docs/api/orders/status).
type BiteshipOrderStatusType =
  | "confirmed"
  | "scheduled"
  | "allocated"
  | "picking_up"
  | "picked"
  | "cancelled"
  | "on_hold"
  | "dropping_off"
  | "return_in_transit"
  | "returned"
  | "rejected"
  | "disposed"
  | "courier_not_found"
  | "delivered"
  | "in_transit";

type BiteshipOrderCourierType = {
  tracking_id: string | null;
  waybill_id: string | null;
  company: string;
  name?: string | null;
  phone?: string | null;
  type: string;
  link?: string | null;
  insurance?: { amount: number; fee: number; note: string };
  routing_code?: string | null;
};

type BiteshipOrderResponseType = {
  success: true;
  message: string;
  object: "order";
  id: string;
  courier: BiteshipOrderCourierType;
  delivery?: { datetime: string; note: string | null; type: string };
  reference_id: string | null;
  price: number;
  status: BiteshipOrderStatusType;
};

type BiteshipTrackingHistoryType = { note: string; service_type?: string; updated_at: string; status: BiteshipOrderStatusType };

// GET /v1/trackings/:id
type BiteshipTrackingResponseType = {
  success: true;
  message: string;
  object: "tracking";
  id: string;
  waybill_id: string | null;
  courier: { company: string; name?: string | null; phone?: string | null; driver_name?: string | null; driver_phone?: string | null; link?: string | null };
  history: BiteshipTrackingHistoryType[];
  link: string | null;
  order_id: string;
  status: BiteshipOrderStatusType;
};

// Webhook "order.status" / "order.waybill_id" / "order.price" (https://biteship.com/id/docs/api/webhooks).
type BiteshipWebhookPayloadType = {
  event: "order.status" | "order.waybill_id" | "order.price" | string;
  order_id?: string;
  courier_tracking_id?: string | null;
  courier_waybill_id?: string | null;
  courier_company?: string;
  courier_type?: string;
  courier_driver_name?: string | null;
  courier_driver_phone?: string | null;
  courier_link?: string | null;
  order_price?: number;
  status?: BiteshipOrderStatusType;
  updated_at?: string;
};

export {
  type BiteshipOrderItemType,
  type BiteshipCreateOrderRequestType,
  type BiteshipOrderStatusType,
  type BiteshipOrderCourierType,
  type BiteshipOrderResponseType,
  type BiteshipTrackingHistoryType,
  type BiteshipTrackingResponseType,
  type BiteshipWebhookPayloadType,
  type BiteshipAreaType,
  type BiteshipAreasResponseType,
  type BiteshipItemCategoryType,
  type BiteshipRateItemType,
  type BiteshipRatesRequestType,
  type BiteshipRateLocationType,
  type BiteshipPricingType,
  type BiteshipRatesResponseType,
  type BiteshipErrorResponseType,
};
