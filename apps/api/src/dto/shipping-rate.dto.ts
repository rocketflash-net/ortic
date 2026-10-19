import { BiteshipPricingType } from "@@types/biteship.type";

type ShippingRateResponseType = {
  courier_code: string;
  courier_name: string;
  service_code: string;
  service_name: string;
  // Mis. "2 - 3 days" (apa adanya dari Biteship).
  duration: string;
  shipping_fee: number;
  insurance_fee: number;
  // Total yang dibayar pembeli untuk ongkir (sudah termasuk asuransi).
  price: number;
};

export default class ShippingRateDto {
  static fromBiteship(pricing: BiteshipPricingType): ShippingRateResponseType {
    return {
      courier_code: pricing.courier_code,
      courier_name: pricing.courier_name,
      service_code: pricing.courier_service_code,
      service_name: pricing.courier_service_name,
      duration: pricing.duration,
      shipping_fee: pricing.shipping_fee,
      insurance_fee: pricing.insurance_fee,
      price: pricing.price,
    };
  }
}
