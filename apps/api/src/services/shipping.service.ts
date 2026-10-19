import { StatusCodes } from "http-status-codes";
import Service from "@base/service.base";
import { biteshipConfig } from "@config/order.config";
import AreaDto from "@dto/area.dto";
import ShippingRateDto from "@dto/shipping-rate.dto";
import BadRequestException from "@exceptions/bad-request.exception";
import NotFoundException from "@exceptions/not-found.exception";
import ShippingProviderException from "@exceptions/shipping-provider.exception";
import BiteshipHelper from "@helpers/biteship/biteship-api.helper";
import CourierRepository from "@repositories/courier.repository";
import WarehouseRepository from "@repositories/warehouse.repository";
import ResponseType from "@@types/response.type";
import { RateQuoteInputType } from "@validators/shipping.validator";

// Kode error Biteship Rates yang berarti "rute/kode pos tidak dilayani", bukan gangguan provider.
const NO_RATE_CODES = [40001001, 40001010];

// Pengiriman lewat Biteship: pencarian area & estimasi ongkir (Fase 1), checkout & booking (Fase 2–3).
export default class ShippingService extends Service {
  constructor(
    private readonly biteship: BiteshipHelper = new BiteshipHelper(),
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository(),
    private readonly courierRepository: CourierRepository = new CourierRepository()
  ) {
    super();
  }

  async searchAreas(query: string): Promise<ResponseType> {
    return this.success(AreaDto.collection(await this.biteship.searchAreas(query)));
  }

  // Ongkir dari gudang ke area tujuan, hanya kurir & layanan yang aktif di Pengaturan Kurir, urut termurah.
  // additionalInfo.is_mock = true bila tarif berasal dari mock (BITESHIP_MOCK_RATES), supaya admin tidak mengutip angka palsu.
  async quote(input: RateQuoteInputType): Promise<ResponseType> {
    const warehouse = await this.warehouseRepository.findById(input.warehouse_id);
    if (!warehouse) throw new NotFoundException("Warehouse not found");
    if (!warehouse.biteshipAreaId) throw new BadRequestException("Warehouse has no Biteship area yet");

    const couriers = await this.courierRepository.findActive();
    if (couriers.length === 0) return this.rates([]);

    try {
      const rates = await this.biteship.getRates({
        origin_area_id: warehouse.biteshipAreaId,
        destination_area_id: input.destination_area_id,
        couriers: couriers.map((courier) => courier.code).join(","),
        items: [{ name: "Paket Ortic", category: "healthcare", value: input.insured_value, quantity: 1, weight: input.weight_gram }],
        ...(input.insured_value > 0 ? { courier_insurance: input.insured_value } : {}),
      });
      const allowed = new Map(couriers.map((courier) => [courier.code, courier.services]));
      const options = rates.pricing
        .filter((pricing) => {
          const services = allowed.get(pricing.courier_code);
          return services !== undefined && (!services || services.includes(pricing.courier_service_code));
        })
        .map(ShippingRateDto.fromBiteship)
        .sort((a, b) => a.price - b.price);
      return this.rates(options);
    } catch (error) {
      if (error instanceof ShippingProviderException && error.providerCode !== null && NO_RATE_CODES.includes(error.providerCode)) return this.rates([]);
      throw error;
    }
  }

  private rates(options: ReturnType<typeof ShippingRateDto.fromBiteship>[]): ResponseType {
    return this.success(options, "Success", StatusCodes.OK, { is_mock: biteshipConfig.mockRates });
  }
}
