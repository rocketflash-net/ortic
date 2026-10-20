import { createHash } from "crypto";
import Helper from "@base/helper.base";
import { isProduction } from "@config/app.config";
import { logger } from "@config/logger.config";
import { biteshipConfig } from "@config/order.config";
import HttpException from "@exceptions/http.exception";
import ShippingProviderException from "@exceptions/shipping-provider.exception";
import { mockCreateOrder } from "@helpers/biteship/biteship-orders.mock";
import { mockRates } from "@helpers/biteship/biteship-rates.mock";
import {
  BiteshipAreaType,
  BiteshipAreasResponseType,
  BiteshipCreateOrderRequestType,
  BiteshipErrorResponseType,
  BiteshipOrderResponseType,
  BiteshipRatesRequestType,
  BiteshipRatesResponseType,
  BiteshipTrackingResponseType,
} from "@@types/biteship.type";

// Cache hasil cek ongkir per proses: rute, berat, nilai, dan kurir yang sama tidak ditanyakan (dan ditagih) ulang.
const ratesCache = new Map<string, { expiresAt: number; data: BiteshipRatesResponseType }>();
const MAX_CACHE_ENTRIES = 2000;

/**
 * Klien API Biteship (https://biteship.com/id/docs). Satu-satunya integrasi pengiriman Ortic:
 * area/maps, ongkir, order terjadwal, tracking. Setiap panggilan Maps & Rates ditagih Biteship, jadi panggil seperlunya.
 */
export default class BiteshipHelper extends Helper {
  constructor() {
    super(biteshipConfig.baseUrl);
  }

  static isMockOrders(): boolean {
    return biteshipConfig.mockOrders;
  }

  // Cari area (kecamatan + kode pos) berdasarkan teks bebas, mis. "Rumbai Pekanbaru".
  async searchAreas(input: string): Promise<BiteshipAreaType[]> {
    const query = new URLSearchParams({ countries: "ID", input, type: "single" });
    const data = await this.call<BiteshipAreasResponseType>(`/v1/maps/areas?${query.toString()}`);
    return data.areas ?? [];
  }

  // POST /v1/rates/couriers. BITESHIP_MOCK_RATES=true memakai respons palsu yang bentuknya sama (lihat biteship-rates.mock.ts).
  async getRates(body: BiteshipRatesRequestType, { cache = false }: { cache?: boolean } = {}): Promise<BiteshipRatesResponseType> {
    const key = cache ? createHash("sha1").update(JSON.stringify(body)).digest("hex") : null;
    const cached = key ? ratesCache.get(key) : undefined;
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    let data: BiteshipRatesResponseType;
    if (biteshipConfig.mockRates) {
      if (isProduction()) throw new Error("BITESHIP_MOCK_RATES is not allowed in production");
      const mock = mockRates(body);
      if (mock.status !== 200)
        throw this.providerError("/v1/rates/couriers", new HttpException(mock.status, String(mock.status), "Mock rates failed", mock.data));
      data = mock.data as BiteshipRatesResponseType;
    } else {
      data = await this.call<BiteshipRatesResponseType>("/v1/rates/couriers", { method: "POST", body });
    }

    if (key) {
      if (ratesCache.size >= MAX_CACHE_ENTRIES) ratesCache.delete(ratesCache.keys().next().value!);
      ratesCache.set(key, { expiresAt: Date.now() + biteshipConfig.ratesCacheTtlMs, data });
    }
    return data;
  }

  // POST /v1/orders: booking kurir (pickup terjadwal). BITESHIP_MOCK_ORDERS=true membuat resi palsu.
  async createOrder(body: BiteshipCreateOrderRequestType): Promise<BiteshipOrderResponseType> {
    if (biteshipConfig.mockOrders) {
      if (isProduction()) throw new Error("BITESHIP_MOCK_ORDERS is not allowed in production");
      return mockCreateOrder(body);
    }
    return await this.call<BiteshipOrderResponseType>("/v1/orders", { method: "POST", body });
  }

  // GET /v1/orders/:id (rekonsiliasi). Mock: null (status hanya berubah lewat simulasi di dashboard).
  async getOrder(id: string): Promise<BiteshipOrderResponseType | null> {
    if (biteshipConfig.mockOrders) return null;
    return await this.call<BiteshipOrderResponseType>(`/v1/orders/${encodeURIComponent(id)}`);
  }

  // GET /v1/trackings/:id: riwayat perjalanan paket. Mock: null.
  async getTracking(id: string): Promise<BiteshipTrackingResponseType | null> {
    if (biteshipConfig.mockOrders) return null;
    return await this.call<BiteshipTrackingResponseType>(`/v1/trackings/${encodeURIComponent(id)}`);
  }

  // POST /v1/orders/:id/cancel: batalkan booking sebelum kurir menjemput.
  async cancelOrder(id: string, reason: string): Promise<void> {
    if (biteshipConfig.mockOrders) return;
    await this.call(`/v1/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: { cancellation_reason_code: "others", cancellation_reason: reason },
    });
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
    return new ShippingProviderException(undefined, body?.code ?? null, body?.error ?? (error instanceof Error ? error.message : null));
  }
}
