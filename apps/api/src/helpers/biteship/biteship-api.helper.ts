import Helper from "@base/helper.base";
import { isProduction } from "@config/app.config";
import { logger } from "@config/logger.config";
import { biteshipConfig } from "@config/order.config";
import HttpException from "@exceptions/http.exception";
import ShippingProviderException from "@exceptions/shipping-provider.exception";
import { mockRates } from "@helpers/biteship/biteship-rates.mock";
import {
  BiteshipAreaType,
  BiteshipAreasResponseType,
  BiteshipErrorResponseType,
  BiteshipRatesRequestType,
  BiteshipRatesResponseType,
} from "@@types/biteship.type";

/**
 * Klien API Biteship (https://biteship.com/id/docs). Satu-satunya integrasi pengiriman Ortic:
 * area/maps, ongkir, order terjadwal, tracking. Setiap panggilan Maps & Rates ditagih Biteship, jadi panggil seperlunya.
 */
export default class BiteshipHelper extends Helper {
  constructor() {
    super(biteshipConfig.baseUrl);
  }

  // Cari area (kecamatan + kode pos) berdasarkan teks bebas, mis. "Rumbai Pekanbaru".
  async searchAreas(input: string): Promise<BiteshipAreaType[]> {
    const query = new URLSearchParams({ countries: "ID", input, type: "single" });
    const data = await this.call<BiteshipAreasResponseType>(`/v1/maps/areas?${query.toString()}`);
    return data.areas ?? [];
  }

  // POST /v1/rates/couriers. BITESHIP_MOCK_RATES=true memakai respons palsu yang bentuknya sama (lihat biteship-rates.mock.ts).
  async getRates(body: BiteshipRatesRequestType): Promise<BiteshipRatesResponseType> {
    if (biteshipConfig.mockRates) {
      if (isProduction()) throw new Error("BITESHIP_MOCK_RATES is not allowed in production");
      const { status, data } = mockRates(body);
      if (status !== 200) throw this.providerError("/v1/rates/couriers", new HttpException(status, String(status), "Mock rates failed", data));
      return data as BiteshipRatesResponseType;
    }
    return await this.call<BiteshipRatesResponseType>("/v1/rates/couriers", { method: "POST", body });
  }

  private async call<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
    if (!biteshipConfig.apiKey) throw new ShippingProviderException("Biteship is not configured");
    try {
      const { data } = await this.request<T>(path, { ...options, headers: { authorization: biteshipConfig.apiKey }, timeoutMs: 15000 });
      return data;
    } catch (error) {
      throw this.providerError(path, error);
    }
  }

  // Error Biteship berbentuk { success: false, error, code }; kode-nya diteruskan agar service bisa membedakan
  // "tidak ada kurir untuk rute ini" (40001010) dari gangguan provider.
  private providerError(path: string, error: unknown): ShippingProviderException {
    const body = error instanceof HttpException ? (error.additionalInfo as BiteshipErrorResponseType | null) : null;
    logger.error({ path, detail: error instanceof HttpException ? { status: error.status, body } : String(error) }, "[biteship] request failed");
    return new ShippingProviderException(undefined, body?.code ?? null);
  }
}
