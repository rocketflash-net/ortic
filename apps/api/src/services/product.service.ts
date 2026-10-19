import Service from "@base/service.base";
import { logger } from "@config/logger.config";
import BrandDto from "@dto/brand.dto";
import ProductDto from "@dto/product.dto";
import { AuditActionEnum } from "@enums/audit.enum";
import PermissionEnum from "@enums/permission.enum";
import ProductStatusEnum, { ProductStatusType } from "@enums/product-status.enum";
import ConflictException from "@exceptions/conflict.exception";
import NotFoundException from "@exceptions/not-found.exception";
import ValidationException from "@exceptions/validation.exception";
import StorageHelper from "@helpers/storage.helper";
import { hasPermission } from "@registries/role-permission.registry";
import BrandRepository from "@repositories/brand.repository";
import CategoryRepository from "@repositories/category.repository";
import ProductRepository from "@repositories/product.repository";
import SettingRepository from "@repositories/setting.repository";
import AuditLogService from "@services/audit-log.service";
import { AuditActorType } from "@@types/audit.type";
import { AuthUserType } from "@@types/auth.type";
import { NewProductVariantType, ProductVariantType } from "@@types/entity.type";
import { PaginationQueryType } from "@@types/pagination.type";
import ResponseType from "@@types/response.type";
import { randomCode, randomToken } from "@utils/crypto.util";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";
import { effectiveMarkup, sellingPrice } from "@utils/price.util";
import { slugify } from "@utils/slug.util";
import { PresignProductImageInputType, ProductFilterType, SaveProductInputType, SaveVariantInputType } from "@validators/product.validator";

const MB = 1024 * 1024;

// Foto produk: dikompres ke WebP di dashboard sebelum diunggah, JPG/PNG tetap diterima.
const IMAGE_RULES: Record<string, { extension: string; maxBytes: number }> = {
  "image/webp": { extension: "webp", maxBytes: 5 * MB },
  "image/jpeg": { extension: "jpg", maxBytes: 5 * MB },
  "image/png": { extension: "png", maxBytes: 5 * MB },
};

const DEFAULT_MARKUP_PERCENT = 5;
const DEFAULT_PRICE_ROUNDING = 500;

type PricingContextType = { canSeeCost: boolean; productMarkup: number | null; globalMarkup: number; rounding: number };

type VariantPricingType = Pick<NewProductVariantType, "basePrice" | "markupPercent" | "price" | "priceLocked" | "compareAtPrice">;

/**
 * Produk untuk dashboard admin: daftar, detail, simpan (info + foto + varian sekaligus), ubah status, upload foto, merek.
 *
 * Harga jual = harga dasar x (1 + markup varian/produk/global), dibulatkan ke atas ke kelipatan `price_rounding`,
 * kecuali varian yang harganya dikunci (`price_locked`). Harga dasar & markup hanya untuk Owner (prices:manage);
 * Staf tidak melihatnya dan tidak bisa mengubah harga varian yang sudah ada.
 */
export default class ProductService extends Service {
  constructor(
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly categoryRepository: CategoryRepository = new CategoryRepository(),
    private readonly brandRepository: BrandRepository = new BrandRepository(),
    private readonly settingRepository: SettingRepository = new SettingRepository(),
    private readonly auditLogService: AuditLogService = new AuditLogService(),
    private readonly storage: StorageHelper = new StorageHelper()
  ) {
    super();
  }

  async list(filter: ProductFilterType, pagination: PaginationQueryType): Promise<ResponseType> {
    const [rows, total] = await Promise.all([this.productRepository.findAll(filter, toPaginationOptions(pagination)), this.productRepository.count(filter)]);
    const ids = rows.map((row) => row.id);
    const [summaries, images] = await Promise.all([this.productRepository.variantSummaries(ids), this.productRepository.primaryImages(ids)]);
    const summaryOf = new Map(summaries.map((summary) => [summary.productId, summary]));
    const items = rows.map((row) => ProductDto.listItem(row, summaryOf.get(row.id), images.get(row.id)));
    return this.success(items, "Success", undefined, { pagination: buildPaginationMeta(pagination, total) });
  }

  async show(id: number, user: AuthUserType): Promise<ResponseType> {
    return this.success(await this.detail(id, user));
  }

  async store(input: SaveProductInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    const id = await this.save(null, input, user, actor);
    return this.created(await this.detail(id, user), "Product created");
  }

  async update(id: number, input: SaveProductInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    await this.save(id, input, user, actor);
    return this.success(await this.detail(id, user), "Product updated");
  }

  async updateStatus(id: number, status: ProductStatusType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    await this.productRepository.transaction(async (tx) => {
      const repository = this.productRepository.withTransaction(tx);
      const product = await repository.findById(id);
      if (!product) throw new NotFoundException("Product not found");
      if (status === ProductStatusEnum.active) {
        const [images, variants] = await Promise.all([repository.findImages(id), repository.findVariants(id)]);
        this.assertSellable(images.length, variants);
      }

      await repository.update(id, { status });
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.product_status_updated,
        targetType: "product",
        targetId: id,
        metadata: { before: { status: product.status }, after: { status } },
      });
    });
    return this.success(await this.detail(id, user), "Product status updated");
  }

  /**
   * Presigned URL foto produk. Alur di dashboard: POST /admin/products/images/presign -> PUT file ke `upload_url`
   * -> kirim `storage_key` di `images` saat menyimpan produk.
   */
  async presignImage(input: PresignProductImageInputType): Promise<ResponseType> {
    const rule = IMAGE_RULES[input.content_type];
    if (!rule) throw new ValidationException([{ field: "content_type", message: `Allowed types: ${Object.keys(IMAGE_RULES).join(", ")}` }]);
    if (input.size > rule.maxBytes) throw new ValidationException([{ field: "size", message: `Maximum size is ${rule.maxBytes / MB} MB` }]);

    const now = new Date();
    const key = `products/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomToken(12)}.${rule.extension}`;
    const upload = await this.storage.presignUpload(key, input.content_type, input.size);
    return this.created(
      {
        key,
        method: "PUT",
        upload_url: upload.uploadUrl,
        headers: { "Content-Type": input.content_type },
        public_url: upload.publicUrl,
        expires_in: upload.expiresIn,
      },
      "Upload URL created"
    );
  }

  // Markup global & pembulatan, untuk pratinjau harga jual di form produk (Owner).
  async pricingDefaults(): Promise<ResponseType> {
    const [markupPercent, priceRounding] = await Promise.all([
      this.settingRepository.getNumber("markup_percent", DEFAULT_MARKUP_PERCENT),
      this.settingRepository.getNumber("price_rounding", DEFAULT_PRICE_ROUNDING),
    ]);
    return this.success({ markup_percent: markupPercent, price_rounding: priceRounding });
  }

  async brands(): Promise<ResponseType> {
    return this.success(BrandDto.collection(await this.brandRepository.findAll()));
  }

  async storeBrand(name: string, actor: AuditActorType): Promise<ResponseType> {
    const slug = slugify(name);
    if (!slug) throw new ValidationException([{ field: "name", message: "Name must contain letters or numbers" }]);

    const id = await this.brandRepository.transaction(async (tx) => {
      const repository = this.brandRepository.withTransaction(tx);
      if (await repository.findBySlug(slug)) throw new ConflictException(`Brand ${name} already exists`);
      const id = await repository.store({ name, slug });
      await this.auditLogService.record(tx, actor, { action: AuditActionEnum.brand_created, targetType: "brand", targetId: id, metadata: { after: { name, slug } } });
      return id;
    });
    return this.created(BrandDto.fromEntity((await this.brandRepository.findById(id))!), "Brand created");
  }

  // Simpan produk baru (id = null) atau ganti seluruh isi produk: info, foto, varian. Mengembalikan id produk.
  private async save(id: number | null, input: SaveProductInputType, user: AuthUserType, actor: AuditActorType): Promise<number> {
    const canSeeCost = hasPermission(user, PermissionEnum.prices_manage);
    await this.assertReferences(input);
    const [globalMarkup, rounding] = await Promise.all([
      this.settingRepository.getNumber("markup_percent", DEFAULT_MARKUP_PERCENT),
      this.settingRepository.getNumber("price_rounding", DEFAULT_PRICE_ROUNDING),
    ]);

    let removedImageKeys: string[] = [];
    const productId = await this.productRepository.transaction(async (tx) => {
      const repository = this.productRepository.withTransaction(tx);
      const before = id === null ? null : await repository.findById(id);
      if (id !== null && !before) throw new NotFoundException("Product not found");

      const existingVariants = id === null ? [] : await repository.findVariants(id);
      const existingImages = id === null ? [] : await repository.findImages(id);
      const existingById = new Map(existingVariants.map((variant) => [variant.id, variant]));

      const unknown = input.variants.findIndex((variant) => variant.id !== undefined && !existingById.has(variant.id));
      if (unknown !== -1) throw new ValidationException([{ field: `variants.${unknown}.id`, message: "Variant does not belong to this product" }]);

      const skus = await this.resolveSkus(input.variants, existingVariants, repository);
      const slug = await this.resolveSlug(input.slug, input.name, id ?? undefined, repository);
      // Staf tidak bisa mengubah markup produk; undefined = tidak dikirim, pertahankan nilai lama.
      const productMarkup = canSeeCost && input.markup_percent !== undefined ? input.markup_percent : (before?.markupPercent ?? null);
      const context: PricingContextType = { canSeeCost, productMarkup, globalMarkup, rounding };

      const variants = input.variants.map((variant, index) => ({
        input: variant,
        existing: variant.id === undefined ? undefined : existingById.get(variant.id),
        columns: {
          sku: skus[index],
          name: variant.name,
          weightGram: variant.weight_gram,
          lengthCm: variant.length_cm,
          widthCm: variant.width_cm,
          heightCm: variant.height_cm,
          isActive: variant.is_active,
          ...this.resolvePricing(variant, variant.id === undefined ? undefined : existingById.get(variant.id), index, context),
        },
      }));

      if (input.status === ProductStatusEnum.active) {
        this.assertSellable(
          input.images.length,
          variants.map((variant) => ({ isActive: variant.columns.isActive, price: variant.columns.price }))
        );
      }

      const productColumns = {
        categoryId: input.category_id,
        brandId: input.brand_id,
        name: input.name,
        slug,
        description: input.description,
        specifications: input.specifications,
        permitNumber: input.permit_number,
        isHazardous: input.is_hazardous,
        markupPercent: productMarkup,
        status: input.status,
      };
      const productId = before ? before.id : await repository.store(productColumns);
      if (before) await repository.update(productId, productColumns);

      for (const variant of variants) {
        if (variant.existing) await repository.updateVariant(variant.existing.id, variant.columns);
        else await repository.storeVariant({ ...variant.columns, productId });
      }

      // Varian yang tidak dikirim lagi: hapus, kecuali sudah punya riwayat stok (dinonaktifkan saja).
      const keptIds = new Set(input.variants.flatMap((variant) => (variant.id === undefined ? [] : [variant.id])));
      const removedIds = existingVariants.filter((variant) => !keptIds.has(variant.id)).map((variant) => variant.id);
      const withHistory = new Set(await repository.variantIdsWithStockHistory(removedIds));
      await repository.deleteVariants(removedIds.filter((variantId) => !withHistory.has(variantId)));
      for (const variantId of withHistory) await repository.updateVariant(variantId, { isActive: false });

      const keys = input.images.map((image) => image.storage_key);
      await repository.replaceImages(
        productId,
        keys.map((storageKey, sortOrder) => ({ storageKey, url: this.storage.publicUrl(storageKey), sortOrder }))
      );
      removedImageKeys = existingImages.map((image) => image.storageKey).filter((key) => !keys.includes(key));

      await this.auditLogService.record(tx, actor, {
        action: before ? AuditActionEnum.product_updated : AuditActionEnum.product_created,
        targetType: "product",
        targetId: productId,
        metadata: before
          ? {
              ...AuditLogService.changes(this.auditSnapshot(before, existingVariants), this.auditSnapshot({ ...before, ...productColumns }, variants.map((variant) => variant.columns))),
              removed_variant_ids: removedIds,
            }
          : { after: this.auditSnapshot(productColumns, variants.map((variant) => variant.columns)) },
      });
      return productId;
    });

    // File yang tidak dipakai lagi dihapus setelah commit; gagal hapus tidak membatalkan simpan.
    if (removedImageKeys.length) {
      this.storage.deleteObjects(removedImageKeys).catch((error) => logger.error({ err: error, keys: removedImageKeys }, "[product] failed to delete old images"));
    }
    return productId;
  }

  // Harga satu varian sesuai hak akses. Lihat penjelasan di atas class.
  private resolvePricing(variant: SaveVariantInputType, existing: ProductVariantType | undefined, index: number, context: PricingContextType): VariantPricingType {
    if (!context.canSeeCost) {
      if (existing) {
        return {
          basePrice: existing.basePrice,
          markupPercent: existing.markupPercent,
          price: existing.price,
          priceLocked: existing.priceLocked,
          compareAtPrice: existing.compareAtPrice,
        };
      }
      // Varian baru dari Staf: harga jual diisi manual dan dikunci; Owner bisa melengkapi harga dasar nanti.
      if (variant.price === undefined) throw new ValidationException([{ field: `variants.${index}.price`, message: "Price is required" }]);
      return { basePrice: variant.price, markupPercent: null, price: variant.price, priceLocked: true, compareAtPrice: null };
    }

    const basePrice = variant.base_price ?? existing?.basePrice;
    if (basePrice === undefined) throw new ValidationException([{ field: `variants.${index}.base_price`, message: "Base price is required" }]);
    const markupPercent = variant.markup_percent !== undefined ? variant.markup_percent : (existing?.markupPercent ?? null);
    const compareAtPrice = variant.compare_at_price !== undefined ? variant.compare_at_price : (existing?.compareAtPrice ?? null);

    if (variant.price_locked) {
      const price = variant.price ?? existing?.price;
      if (price === undefined) throw new ValidationException([{ field: `variants.${index}.price`, message: "Price is required when it is locked" }]);
      return { basePrice, markupPercent, price, priceLocked: true, compareAtPrice };
    }

    const price = sellingPrice(basePrice, effectiveMarkup(markupPercent, context.productMarkup, context.globalMarkup), context.rounding);
    return { basePrice, markupPercent, price, priceLocked: false, compareAtPrice };
  }

  // SKU kosong dibuat otomatis; SKU harus unik di dalam payload dan di seluruh produk lain.
  private async resolveSkus(variants: SaveVariantInputType[], existing: ProductVariantType[], repository: ProductRepository): Promise<string[]> {
    const skus = variants.map((variant) => variant.sku || `ORT-${randomCode(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")}`);
    const duplicate = skus.findIndex((sku, index) => skus.indexOf(sku) !== index);
    if (duplicate !== -1) throw new ValidationException([{ field: `variants.${duplicate}.sku`, message: `SKU ${skus[duplicate]} is used twice` }]);

    const taken = await repository.takenSkus(
      skus,
      existing.map((variant) => variant.id)
    );
    if (taken.length) {
      const index = skus.indexOf(taken[0]);
      throw new ConflictException(`SKU ${taken[0]} is already used by another product`, [{ field: `variants.${index}.sku`, message: "SKU is already used" }]);
    }
    return skus;
  }

  // Slug dari input (harus unik) atau dari nama (diberi akhiran -2, -3, ... bila sudah dipakai).
  private async resolveSlug(requested: string, name: string, exceptId: number | undefined, repository: ProductRepository): Promise<string> {
    if (requested) {
      if (await repository.slugExists(requested, exceptId)) throw new ConflictException(`Slug ${requested} is already used`, [{ field: "slug", message: "Slug is already used" }]);
      return requested;
    }

    const base = slugify(name) || "produk";
    const taken = new Set(await repository.slugsStartingWith(base, exceptId));
    if (!taken.has(base)) return base;
    let suffix = 2;
    while (taken.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  private async assertReferences(input: SaveProductInputType): Promise<void> {
    const [category, brand] = await Promise.all([
      this.categoryRepository.findById(input.category_id),
      input.brand_id === null ? null : this.brandRepository.findById(input.brand_id),
    ]);
    const errors = [
      ...(category ? [] : [{ field: "category_id", message: "Category not found" }]),
      ...(input.brand_id !== null && !brand ? [{ field: "brand_id", message: "Brand not found" }] : []),
    ];
    if (errors.length) throw new ValidationException(errors);
  }

  // Produk aktif (tampil di toko) wajib punya foto dan minimal satu varian aktif berharga.
  private assertSellable(imageCount: number, variants: { isActive: boolean; price: number }[]): void {
    const errors = [
      ...(imageCount > 0 ? [] : [{ field: "images", message: "An active product needs at least one photo" }]),
      ...(variants.some((variant) => variant.isActive && variant.price > 0) ? [] : [{ field: "variants", message: "An active product needs an active variant with a price" }]),
    ];
    if (errors.length) throw new ValidationException(errors);
  }

  // Ringkasan untuk audit log; daftar varian menjadi riwayat harga (base_price, markup, price).
  private auditSnapshot(product: Record<string, unknown>, variants: Partial<NewProductVariantType>[]) {
    const { name, slug, categoryId, brandId, status, markupPercent, isHazardous, permitNumber } = product;
    return {
      name,
      slug,
      categoryId,
      brandId,
      status,
      markupPercent,
      isHazardous,
      permitNumber,
      variants: variants.map((variant) => ({
        sku: variant.sku,
        name: variant.name,
        basePrice: variant.basePrice,
        markupPercent: variant.markupPercent,
        price: variant.price,
        priceLocked: variant.priceLocked,
        weightGram: variant.weightGram,
        isActive: variant.isActive,
      })),
    };
  }

  private async detail(id: number, user: AuthUserType) {
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException("Product not found");
    const [variants, images] = await Promise.all([this.productRepository.findVariants(id), this.productRepository.findImages(id)]);
    return ProductDto.detail(product, variants, images, { canSeeCost: hasPermission(user, PermissionEnum.prices_manage) });
  }
}
