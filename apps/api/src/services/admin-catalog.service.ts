import { asc, count, eq } from "drizzle-orm";
import Service from "@base/service.base";
import { db } from "@config/database.config";
import { AuditActionEnum } from "@enums/audit.enum";
import PermissionEnum from "@enums/permission.enum";
import BadRequestException from "@exceptions/bad-request.exception";
import ForbiddenException from "@exceptions/forbidden.exception";
import NotFoundException from "@exceptions/not-found.exception";
import { knownCourierServices } from "@helpers/biteship/biteship-rates.mock";
import { categories } from "@models/category.model";
import { couriers } from "@models/courier.model";
import { products } from "@models/product.model";
import { hasPermission } from "@registries/role-permission.registry";
import SettingRepository from "@repositories/setting.repository";
import AuditLogService from "@services/audit-log.service";
import PricingService from "@services/pricing.service";
import SettingService from "@services/setting.service";
import { AuditActorType } from "@@types/audit.type";
import { AuthUserType } from "@@types/auth.type";
import { CategoryType, CourierType } from "@@types/entity.type";
import ResponseType from "@@types/response.type";
import { UpdateCategoryInputType } from "@validators/category.validator";
import { UpdateCourierInputType } from "@validators/courier.validator";

// Paket Biteship Starter: maksimal 3 kurir aktif.
const MAX_ACTIVE_COURIERS = 3;

/**
 * Data master toko di dashboard: kategori (termasuk markup per kategori) dan kurir yang ditawarkan ke pembeli.
 */
export default class AdminCatalogService extends Service {
  constructor(
    private readonly settingRepository: SettingRepository = new SettingRepository(),
    private readonly pricingService: PricingService = new PricingService(),
    private readonly settingService: SettingService = new SettingService(),
    private readonly auditLogService: AuditLogService = new AuditLogService()
  ) {
    super();
  }

  // ----- Kategori -----

  async categories(user: AuthUserType): Promise<ResponseType> {
    const [rows, counts] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
      db.select({ categoryId: products.categoryId, total: count() }).from(products).groupBy(products.categoryId),
    ]);
    const countOf = new Map(counts.map((row) => [row.categoryId, row.total]));
    const canSeeMarkup = hasPermission(user, PermissionEnum.prices_manage);
    return this.success(rows.map((row) => this.categoryResponse(row, countOf.get(row.id) ?? 0, canSeeMarkup)));
  }

  async previewCategoryMarkup(id: number, markupPercent: number | null): Promise<ResponseType> {
    await this.findCategory(id);
    const settings = await this.settingRepository.getAll();
    const changes = await this.pricingService.preview(settings.markup_percent, settings.price_rounding, { category: { id, markupPercent } });
    return this.success(this.settingService.previewResponse(changes));
  }

  async updateCategory(id: number, input: UpdateCategoryInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    if (input.markup_percent !== undefined && !hasPermission(user, PermissionEnum.prices_manage))
      throw new ForbiddenException("Only the Owner can change category markup");
    const before = await this.findCategory(id);
    const settings = await this.settingRepository.getAll();
    const markupChanged = input.markup_percent !== undefined && input.markup_percent !== before.markupPercent;

    const repriced = await db.transaction(async (tx) => {
      await tx
        .update(categories)
        .set({ name: input.name, color: input.color, sortOrder: input.sort_order, isActive: input.is_active, markupPercent: input.markup_percent })
        .where(eq(categories.id, id));
      const changes = markupChanged
        ? await this.pricingService.preview(
            settings.markup_percent,
            settings.price_rounding,
            { category: { id, markupPercent: input.markup_percent ?? null } },
            tx
          )
        : [];
      await this.pricingService.apply(tx, changes);
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.category_updated,
        targetType: "category",
        targetId: id,
        metadata: { changes: input, repriced_variants: changes.length },
      });
      return changes.length;
    });

    const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    const [total] = await db.select({ total: count() }).from(products).where(eq(products.categoryId, id));
    return this.success(
      { ...this.categoryResponse(row!, total?.total ?? 0, hasPermission(user, PermissionEnum.prices_manage)), repriced_variants: repriced },
      "Category updated"
    );
  }

  // ----- Kurir -----

  async couriers(): Promise<ResponseType> {
    const rows = await db.select().from(couriers).orderBy(asc(couriers.sortOrder), asc(couriers.id));
    const services = knownCourierServices();
    return this.success({ items: rows.map((row) => this.courierResponse(row, services[row.code] ?? [])), max_active: MAX_ACTIVE_COURIERS });
  }

  async updateCourier(id: number, input: UpdateCourierInputType, actor: AuditActorType): Promise<ResponseType> {
    const [before] = await db.select().from(couriers).where(eq(couriers.id, id)).limit(1);
    if (!before) throw new NotFoundException("Courier not found");

    await db.transaction(async (tx) => {
      if (input.is_active && !before.isActive) {
        const [active] = await tx.select({ total: count() }).from(couriers).where(eq(couriers.isActive, true));
        if ((active?.total ?? 0) >= MAX_ACTIVE_COURIERS)
          throw new BadRequestException(`At most ${MAX_ACTIVE_COURIERS} couriers can be active on the Biteship Starter plan`);
      }
      await tx.update(couriers).set({ isActive: input.is_active, services: input.services, sortOrder: input.sort_order }).where(eq(couriers.id, id));
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.courier_updated,
        targetType: "courier",
        targetId: id,
        metadata: { code: before.code, before: { is_active: before.isActive, services: before.services, sort_order: before.sortOrder }, after: input },
      });
    });

    const [row] = await db.select().from(couriers).where(eq(couriers.id, id)).limit(1);
    return this.success(this.courierResponse(row!, knownCourierServices()[row!.code] ?? []), "Courier updated");
  }

  private async findCategory(id: number): Promise<CategoryType> {
    const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!row) throw new NotFoundException("Category not found");
    return row;
  }

  private categoryResponse(row: CategoryType, productCount: number, canSeeMarkup: boolean) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      color: row.color,
      sort_order: row.sortOrder,
      is_active: row.isActive,
      markup_percent: canSeeMarkup ? row.markupPercent : undefined,
      product_count: productCount,
    };
  }

  private courierResponse(row: CourierType, available: { code: string; name: string; description: string }[]) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      services: row.services,
      is_active: row.isActive,
      sort_order: row.sortOrder,
      available_services: available,
    };
  }
}
