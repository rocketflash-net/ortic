import Service from "@base/service.base";
import { isProduction } from "@config/app.config";
import { biteshipConfig, orderConfig } from "@config/order.config";
import { paymentConfig } from "@config/payment.config";
import { AuditActionEnum } from "@enums/audit.enum";
import { UpdateSettingsInputType } from "@registries/setting.registry";
import SettingRepository from "@repositories/setting.repository";
import AuditLogService from "@services/audit-log.service";
import PricingService, { RepriceChangeType } from "@services/pricing.service";
import { AuditActorType } from "@@types/audit.type";
import ResponseType from "@@types/response.type";

const PREVIEW_SAMPLE = 20;

/**
 * Pengaturan toko (Owner): markup global, pembulatan, biaya layanan, berat kemasan, asuransi, kontak toko, email
 * notifikasi. Mengubah markup/pembulatan menghitung ulang harga jual semua varian yang tidak dikunci.
 * Konfigurasi server (AUTO_ACCEPT_ORDERS, provider pembayaran, mode mock Biteship) hanya ditampilkan, diubah lewat .env.
 */
export default class SettingService extends Service {
  constructor(
    private readonly settingRepository: SettingRepository = new SettingRepository(),
    private readonly pricingService: PricingService = new PricingService(),
    private readonly auditLogService: AuditLogService = new AuditLogService()
  ) {
    super();
  }

  async show(): Promise<ResponseType> {
    return this.success({ values: await this.settingRepository.getAll(), server: this.serverInfo() });
  }

  // Pratinjau perubahan harga sebelum menyimpan markup/pembulatan baru.
  async previewPricing(input: { markup_percent?: number; price_rounding?: number }): Promise<ResponseType> {
    const current = await this.settingRepository.getAll();
    const changes = await this.pricingService.preview(current.markup_percent, current.price_rounding, {
      markupPercent: input.markup_percent,
      priceRounding: input.price_rounding,
    });
    return this.success(this.previewResponse(changes));
  }

  async update(input: UpdateSettingsInputType, actor: AuditActorType): Promise<ResponseType> {
    const before = await this.settingRepository.getAll();
    const pricingChanged =
      (input.markup_percent !== undefined && input.markup_percent !== before.markup_percent) ||
      (input.price_rounding !== undefined && input.price_rounding !== before.price_rounding);

    const repriced = await this.settingRepository.transaction(async (tx) => {
      await this.settingRepository.withTransaction(tx).upsertMany(input);
      const changes = pricingChanged
        ? await this.pricingService.preview(
            before.markup_percent,
            before.price_rounding,
            { markupPercent: input.markup_percent, priceRounding: input.price_rounding },
            tx
          )
        : [];
      await this.pricingService.apply(tx, changes);

      const changedKeys = Object.keys(input).filter(
        (key) => JSON.stringify(input[key as keyof UpdateSettingsInputType]) !== JSON.stringify(before[key as keyof typeof before])
      );
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.settings_updated,
        targetType: "settings",
        targetId: null,
        metadata: {
          before: Object.fromEntries(changedKeys.map((key) => [key, before[key as keyof typeof before]])),
          after: Object.fromEntries(changedKeys.map((key) => [key, input[key as keyof UpdateSettingsInputType]])),
          repriced_variants: changes.length,
        },
      });
      return changes.length;
    });

    return this.success({ values: await this.settingRepository.getAll(), server: this.serverInfo(), repriced_variants: repriced }, "Settings updated");
  }

  previewResponse(changes: RepriceChangeType[]) {
    return {
      affected_variants: changes.length,
      increased: changes.filter((change) => change.after > change.before).length,
      decreased: changes.filter((change) => change.after < change.before).length,
      samples: changes.slice(0, PREVIEW_SAMPLE).map((change) => ({
        variant_id: change.variantId,
        product_id: change.productId,
        product_name: change.productName,
        variant_name: change.variantName,
        sku: change.sku,
        before: change.before,
        after: change.after,
      })),
    };
  }

  private serverInfo() {
    return {
      auto_accept_orders: orderConfig.autoAccept,
      payment_provider: paymentConfig.provider,
      qris_mdr_rate: orderConfig.qrisMdr.rate,
      qris_mdr_free_max: orderConfig.qrisMdr.freeMax,
      biteship_mock_rates: biteshipConfig.mockRates,
      biteship_mock_orders: biteshipConfig.mockOrders,
      biteship_webhook_configured: Boolean(biteshipConfig.webhookSecret),
      is_production: isProduction(),
    };
  }
}
