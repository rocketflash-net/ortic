import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { asc, eq, inArray } from "drizzle-orm";
import Service from "@base/service.base";
import { db } from "@config/database.config";
import { AuditActionEnum } from "@enums/audit.enum";
import PermissionEnum from "@enums/permission.enum";
import ProductStatusEnum, { PRODUCT_STATUSES, ProductStatusType } from "@enums/product-status.enum";
import NotFoundException from "@exceptions/not-found.exception";
import ValidationException from "@exceptions/validation.exception";
import { brands } from "@models/brand.model";
import { categories } from "@models/category.model";
import { productImages } from "@models/product-image.model";
import { productVariants } from "@models/product-variant.model";
import { products } from "@models/product.model";
import { hasPermission } from "@registries/role-permission.registry";
import ProductRepository from "@repositories/product.repository";
import SettingRepository from "@repositories/setting.repository";
import AuditLogService from "@services/audit-log.service";
import { AuditActorType } from "@@types/audit.type";
import { AuthUserType } from "@@types/auth.type";
import ResponseType from "@@types/response.type";
import { randomCode } from "@utils/crypto.util";
import { effectiveMarkup, sellingPrice } from "@utils/price.util";
import { slugify } from "@utils/slug.util";
import { ImportProductsInputType } from "@validators/product.validator";

const SKU_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_IMPORT_ROWS = 2000;

// Kolom CSV (satu baris = satu varian). Kolom harga dasar & markup hanya diekspor/diimpor oleh Owner.
const COLUMNS = [
  "product_slug",
  "product_name",
  "category_slug",
  "brand",
  "status",
  "permit_number",
  "is_hazardous",
  "sku",
  "variant_name",
  "base_price",
  "markup_percent",
  "price",
  "price_locked",
  "sale_price",
  "weight_gram",
  "length_cm",
  "width_cm",
  "height_cm",
  "is_active",
] as const;
const COST_COLUMNS = ["base_price", "markup_percent"];

type CsvRowType = Partial<Record<(typeof COLUMNS)[number], string>>;

type ImportIssueType = { row: number; field: string; message: string };

type PlannedVariantType = {
  row: number;
  sku: string;
  existingId: number | null;
  name: string | null;
  basePrice: number | null;
  markupPercent: number | null | undefined;
  price: number | null;
  priceLocked: boolean;
  salePrice: number | null | undefined;
  weightGram: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  isActive: boolean;
};

type PlannedProductType = {
  slug: string;
  existingId: number | null;
  name: string;
  categoryId: number;
  brandName: string | null;
  status: ProductStatusType;
  permitNumber: string | null;
  isHazardous: boolean;
  variants: PlannedVariantType[];
};

const truthy = (value: string | undefined): boolean => ["1", "true", "ya", "yes", "y"].includes((value ?? "").trim().toLowerCase());
const blank = (value: string | undefined): boolean => value === undefined || value.trim() === "";

/**
 * Duplikasi produk, serta ekspor & impor produk lewat CSV (satu baris per varian, dicocokkan lewat SKU).
 *
 * Impor: SKU yang sudah ada diperbarui; SKU baru ditambahkan ke produk dengan product_slug yang sama (dibuat bila belum
 * ada). Produk baru selalu Draft (wajib foto sebelum Aktif). Selalu jalankan dry_run dulu untuk melihat pratinjau.
 */
export default class ProductIoService extends Service {
  constructor(
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly settingRepository: SettingRepository = new SettingRepository(),
    private readonly auditLogService: AuditLogService = new AuditLogService()
  ) {
    super();
  }

  // Salin produk (info, foto, varian) sebagai Draft dengan nama "(Salinan)", slug & SKU baru, tanpa stok.
  async duplicate(id: number, actor: AuditActorType): Promise<ResponseType> {
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException("Product not found");
    const [variants, images] = await Promise.all([this.productRepository.findVariants(id), this.productRepository.findImages(id)]);

    const newId = await db.transaction(async (tx) => {
      const repository = this.productRepository.withTransaction(tx);
      const base = slugify(`${product.name} salinan`) || "produk-salinan";
      const taken = new Set(await repository.slugsStartingWith(base));
      let slug = base;
      for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${base}-${suffix}`;

      const { id: _id, createdAt: _created, updatedAt: _updated, ...columns } = product;
      const productId = await repository.store({ ...columns, name: `${product.name} (Salinan)`.slice(0, 200), slug, status: ProductStatusEnum.draft });
      for (const variant of variants) {
        const { id: _vid, productId: _pid, createdAt: _vc, updatedAt: _vu, sku: _sku, ...variantColumns } = variant;
        await repository.storeVariant({ ...variantColumns, productId, sku: await this.uniqueSku(repository) });
      }
      await repository.replaceImages(
        productId,
        images.map((image) => ({ storageKey: image.storageKey, url: image.url, sortOrder: image.sortOrder }))
      );
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.product_duplicated,
        targetType: "product",
        targetId: productId,
        metadata: { source_product_id: id },
      });
      return productId;
    });
    return this.created({ id: newId }, "Product duplicated");
  }

  async exportCsv(user: AuthUserType): Promise<string> {
    const canSeeCost = hasPermission(user, PermissionEnum.prices_manage);
    const rows = await db
      .select({ product: products, variant: productVariants, categorySlug: categories.slug, brandName: brands.name })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(brands, eq(brands.id, products.brandId))
      .orderBy(asc(products.name), asc(productVariants.id));
    const columns = COLUMNS.filter((column) => canSeeCost || !COST_COLUMNS.includes(column));
    const records = rows.map(({ product, variant, categorySlug, brandName }) => {
      const values: Record<(typeof COLUMNS)[number], string | number | null> = {
        product_slug: product.slug,
        product_name: product.name,
        category_slug: categorySlug,
        brand: brandName,
        status: product.status,
        permit_number: product.permitNumber,
        is_hazardous: product.isHazardous ? 1 : 0,
        sku: variant.sku,
        variant_name: variant.name,
        base_price: variant.basePrice,
        markup_percent: variant.markupPercent,
        price: variant.price,
        price_locked: variant.priceLocked ? 1 : 0,
        sale_price: variant.salePrice,
        weight_gram: variant.weightGram,
        length_cm: variant.lengthCm,
        width_cm: variant.widthCm,
        height_cm: variant.heightCm,
        is_active: variant.isActive ? 1 : 0,
      };
      return columns.map((column) => values[column] ?? "");
    });
    return "﻿" + stringify([columns, ...records]);
  }

  async importCsv(input: ImportProductsInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    const canSeeCost = hasPermission(user, PermissionEnum.prices_manage);
    let rows: CsvRowType[];
    try {
      rows = parse(input.csv.replace(/^﻿/, ""), {
        columns: (header: string[]) => header.map((name) => name.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
        delimiter: [",", ";"],
      });
    } catch (error) {
      throw new ValidationException([{ field: "csv", message: `CSV cannot be read: ${(error as Error).message}` }]);
    }
    if (rows.length === 0) throw new ValidationException([{ field: "csv", message: "The file has no rows" }]);
    if (rows.length > MAX_IMPORT_ROWS) throw new ValidationException([{ field: "csv", message: `At most ${MAX_IMPORT_ROWS} rows per import` }]);

    const { plan, issues } = await this.plan(rows, canSeeCost);
    const summary = {
      rows: rows.length,
      products_created: plan.filter((product) => product.existingId === null).length,
      products_updated: plan.filter((product) => product.existingId !== null).length,
      variants_created: plan.reduce((sum, product) => sum + product.variants.filter((variant) => variant.existingId === null).length, 0),
      variants_updated: plan.reduce((sum, product) => sum + product.variants.filter((variant) => variant.existingId !== null).length, 0),
      issues,
      dry_run: input.dry_run,
    };
    if (input.dry_run || issues.length) return this.success(summary, issues.length ? "Fix the issues and try again" : "Preview");

    await this.applyPlan(plan, canSeeCost, actor);
    return this.success(summary, "Import finished");
  }

  private async plan(rows: CsvRowType[], canSeeCost: boolean): Promise<{ plan: PlannedProductType[]; issues: ImportIssueType[] }> {
    const issues: ImportIssueType[] = [];
    const [categoryRows, productRows, variantRows] = await Promise.all([
      db.select({ id: categories.id, slug: categories.slug }).from(categories),
      db.select({ id: products.id, slug: products.slug }).from(products),
      db
        .select({ id: productVariants.id, sku: productVariants.sku, productId: productVariants.productId })
        .from(productVariants)
        .where(
          inArray(
            productVariants.sku,
            rows
              .map((row) => (row.sku ?? "").toUpperCase())
              .filter(Boolean)
              .concat(["__none__"])
          )
        ),
    ]);
    const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));
    const productBySlug = new Map(productRows.map((row) => [row.slug, row.id]));
    const variantBySku = new Map(variantRows.map((row) => [row.sku, row]));
    const plan = new Map<string, PlannedProductType>();
    const seenSkus = new Set<string>();

    rows.forEach((row, index) => {
      const line = index + 2; // baris 1 = header
      const issue = (field: string, message: string): void => {
        issues.push({ row: line, field, message });
      };
      const number = (field: (typeof COLUMNS)[number], { required = false, decimal = false } = {}): number | null => {
        const raw = row[field];
        if (blank(raw)) {
          if (required) issue(field, "Required");
          return null;
        }
        const value = Number(
          String(raw)
            .replace(/\./g, decimal ? "." : "")
            .replace(",", ".")
        );
        if (!Number.isFinite(value) || value < 0 || (!decimal && !Number.isInteger(value))) {
          issue(field, "Must be a positive number");
          return null;
        }
        return value;
      };

      const name = (row.product_name ?? "").trim();
      const slug = (row.product_slug || slugify(name)).trim().toLowerCase();
      if (!slug) {
        issue("product_slug", "product_slug or product_name is required");
        return;
      }
      const sku = (row.sku ?? "").trim().toUpperCase();
      if (sku && !/^[A-Z0-9._-]{1,64}$/.test(sku)) issue("sku", "SKU may only contain letters, numbers, dot, dash and underscore");
      if (sku && seenSkus.has(sku)) issue("sku", `SKU ${sku} appears twice`);
      if (sku) seenSkus.add(sku);
      const existingVariant = sku ? variantBySku.get(sku) : undefined;
      const existingProductId = productBySlug.get(slug) ?? null;
      if (existingVariant && existingProductId !== null && existingVariant.productId !== existingProductId)
        issue("sku", `SKU ${sku} belongs to another product`);

      let product = plan.get(slug);
      if (!product) {
        const categoryId = categoryBySlug.get((row.category_slug ?? "").trim().toLowerCase());
        if (existingProductId === null && !name) issue("product_name", "Required for a new product");
        if (!categoryId) issue("category_slug", `Unknown category "${row.category_slug ?? ""}"`);
        const status = (row.status ?? "").trim().toLowerCase() || ProductStatusEnum.draft;
        if (!PRODUCT_STATUSES.includes(status as ProductStatusType)) issue("status", `Use one of: ${PRODUCT_STATUSES.join(", ")}`);
        product = {
          slug,
          existingId: existingProductId,
          name: name || slug,
          categoryId: categoryId ?? 0,
          brandName: (row.brand ?? "").trim() || null,
          // Produk baru dari CSV belum punya foto, jadi selalu Draft.
          status: existingProductId === null ? ProductStatusEnum.draft : (status as ProductStatusType),
          permitNumber: (row.permit_number ?? "").trim() || null,
          isHazardous: truthy(row.is_hazardous),
          variants: [],
        };
        plan.set(slug, product);
      }

      const basePrice = canSeeCost ? number("base_price", { required: !existingVariant }) : null;
      const price = number("price", { required: !canSeeCost && !existingVariant });
      const weightGram = number("weight_gram", { required: true });
      if (weightGram !== null && weightGram < 1) issue("weight_gram", "Must be at least 1 gram");
      product.variants.push({
        row: line,
        sku: sku || "",
        existingId: existingVariant?.id ?? null,
        name: (row.variant_name ?? "").trim() || null,
        basePrice,
        markupPercent: canSeeCost ? (blank(row.markup_percent) ? null : number("markup_percent", { decimal: true })) : undefined,
        price,
        priceLocked: truthy(row.price_locked) || !canSeeCost,
        salePrice: canSeeCost ? number("sale_price") : undefined,
        weightGram: weightGram ?? 1,
        lengthCm: number("length_cm", { decimal: true }),
        widthCm: number("width_cm", { decimal: true }),
        heightCm: number("height_cm", { decimal: true }),
        isActive: blank(row.is_active) ? true : truthy(row.is_active),
      });
    });
    return { plan: [...plan.values()], issues };
  }

  private async applyPlan(plan: PlannedProductType[], canSeeCost: boolean, actor: AuditActorType): Promise<void> {
    const settings = await this.settingRepository.getAll();
    const categoryMarkups = new Map(
      (await db.select({ id: categories.id, markup: categories.markupPercent }).from(categories)).map((row) => [row.id, row.markup])
    );

    await db.transaction(async (tx) => {
      const repository = this.productRepository.withTransaction(tx);
      const brandIds = new Map((await tx.select({ id: brands.id, name: brands.name }).from(brands)).map((row) => [row.name.toLowerCase(), row.id]));
      const brandId = async (name: string | null): Promise<number | null> => {
        if (!name) return null;
        const existing = brandIds.get(name.toLowerCase());
        if (existing) return existing;
        const [created] = await tx
          .insert(brands)
          .values({ name, slug: slugify(name) || `merek-${randomCode(4, SKU_ALPHABET).toLowerCase()}` })
          .$returningId();
        brandIds.set(name.toLowerCase(), created!.id);
        return created!.id;
      };

      for (const product of plan) {
        const columns = {
          name: product.name,
          categoryId: product.categoryId,
          brandId: await brandId(product.brandName),
          permitNumber: product.permitNumber,
          isHazardous: product.isHazardous,
        };
        let productId = product.existingId;
        let productMarkup: number | null = null;
        if (productId === null) {
          productId = await repository.store({ ...columns, slug: product.slug, status: ProductStatusEnum.draft });
        } else {
          const current = await repository.findById(productId);
          productMarkup = current?.markupPercent ?? null;
          // Produk Aktif tanpa foto tidak boleh: status dari CSV hanya dipakai bila produk sudah punya foto.
          const hasImages = (await tx.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId)).limit(1)).length > 0;
          await repository.update(productId, {
            ...columns,
            status: product.status === ProductStatusEnum.active && !hasImages ? ProductStatusEnum.draft : product.status,
          });
        }

        for (const variant of product.variants) {
          const existing = variant.existingId ? await repository.findVariantById(variant.existingId) : null;
          const basePrice = canSeeCost ? (variant.basePrice ?? existing?.basePrice ?? 0) : (existing?.basePrice ?? variant.price ?? 0);
          const markupPercent = variant.markupPercent === undefined ? (existing?.markupPercent ?? null) : variant.markupPercent;
          const computed = sellingPrice(
            basePrice,
            effectiveMarkup(markupPercent, productMarkup, settings.markup_percent, categoryMarkups.get(product.categoryId)),
            settings.price_rounding
          );
          const priceLocked = canSeeCost ? variant.priceLocked && variant.price !== null : true;
          const price = priceLocked ? (variant.price ?? existing?.price ?? computed) : computed;
          const salePrice =
            variant.salePrice === undefined
              ? (existing?.salePrice ?? null)
              : variant.salePrice !== null && variant.salePrice < price
                ? variant.salePrice
                : null;
          const variantColumns = {
            name: variant.name,
            basePrice,
            markupPercent,
            price,
            priceLocked,
            salePrice,
            weightGram: variant.weightGram,
            lengthCm: variant.lengthCm,
            widthCm: variant.widthCm,
            heightCm: variant.heightCm,
            isActive: variant.isActive,
          };
          if (existing) {
            // Staf tidak mengubah harga varian yang sudah ada.
            const { basePrice: _b, markupPercent: _m, price: _p, priceLocked: _l, salePrice: _s, ...rest } = variantColumns;
            await repository.updateVariant(existing.id, canSeeCost ? variantColumns : rest);
          } else {
            await repository.storeVariant({ ...variantColumns, productId, sku: variant.sku || (await this.uniqueSku(repository)) });
          }
        }
      }
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.product_imported,
        targetType: "product",
        targetId: null,
        metadata: { products: plan.length, variants: plan.reduce((sum, product) => sum + product.variants.length, 0) },
      });
    });
  }

  private async uniqueSku(repository: ProductRepository): Promise<string> {
    for (;;) {
      const sku = `ORT-${randomCode(6, SKU_ALPHABET)}`;
      if ((await repository.takenSkus([sku], [])).length === 0) return sku;
    }
  }
}
