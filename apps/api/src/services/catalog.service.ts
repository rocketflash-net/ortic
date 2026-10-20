import Service from "@base/service.base";
import CatalogProductDto from "@dto/catalog-product.dto";
import CategoryDto from "@dto/category.dto";
import NotFoundException from "@exceptions/not-found.exception";
import CatalogRepository from "@repositories/catalog.repository";
import CategoryRepository from "@repositories/category.repository";
import ProductRepository from "@repositories/product.repository";
import StockRepository from "@repositories/stock.repository";
import WarehouseRepository from "@repositories/warehouse.repository";
import SettingRepository from "@repositories/setting.repository";
import { PUBLIC_SETTING_KEYS } from "@registries/setting.registry";
import ResponseType from "@@types/response.type";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";
import { CatalogProductQueryType } from "@validators/catalog.validator";

// Katalog publik untuk toko (apps/web), tanpa login. Hanya produk Aktif dengan varian aktif.
export default class CatalogService extends Service {
  constructor(
    private readonly categoryRepository: CategoryRepository = new CategoryRepository(),
    private readonly catalogRepository: CatalogRepository = new CatalogRepository(),
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly stockRepository: StockRepository = new StockRepository(),
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository(),
    private readonly settingRepository: SettingRepository = new SettingRepository()
  ) {
    super();
  }

  async categories(): Promise<ResponseType> {
    return this.success(CategoryDto.collection(await this.categoryRepository.findActive()));
  }

  async products({ page, limit, search, category, sort }: CatalogProductQueryType): Promise<ResponseType> {
    const categoryRow = category ? await this.catalogRepository.findCategoryBySlug(category) : null;
    if (category && !categoryRow) throw new NotFoundException("Category not found");

    const filter = { search, categoryId: categoryRow?.id };
    const [rows, total] = await Promise.all([
      this.catalogRepository.findPublished(filter, sort, toPaginationOptions({ page, limit })),
      this.catalogRepository.countPublished(filter),
    ]);
    const images = await this.productRepository.primaryImages(rows.map((row) => row.product.id));
    const items = rows.map((row) => CatalogProductDto.card(row, images.get(row.product.id)));
    return this.success(items, "Success", undefined, {
      pagination: buildPaginationMeta({ page, limit }, total),
      category: categoryRow ? CategoryDto.fromEntity(categoryRow) : null,
    });
  }

  async product(slug: string): Promise<ResponseType> {
    const product = await this.catalogRepository.findPublishedBySlug(slug);
    if (!product) throw new NotFoundException("Product not found");

    const [category, brandName, images, variants] = await Promise.all([
      this.catalogRepository.findCategoryById(product.categoryId),
      this.catalogRepository.findBrandName(product.brandId),
      this.productRepository.findImages(product.id),
      this.catalogRepository.activeVariants(product.id),
    ]);
    const warehouseIds = (await this.warehouseRepository.findAll())
      .filter((warehouse) => warehouse.isActive && warehouse.biteshipAreaId)
      .map((warehouse) => warehouse.id);
    const availability = await this.stockRepository.availability(
      variants.map((variant) => variant.id),
      warehouseIds
    );
    const stock = new Map(variants.map((variant) => [variant.id, Math.max(0, ...(availability.get(variant.id)?.values() ?? []))]));
    return this.success(CatalogProductDto.detail(product, { name: category?.name ?? "", slug: category?.slug ?? "" }, brandName, images, variants, stock));
  }

  // Info toko untuk footer, bantuan, kebijakan, dan ringkasan checkout (tanpa login).
  async storeInfo(): Promise<ResponseType> {
    const settings = await this.settingRepository.getAll();
    return this.success(Object.fromEntries(PUBLIC_SETTING_KEYS.map((key) => [key, settings[key]])));
  }
}
