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

export {
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
