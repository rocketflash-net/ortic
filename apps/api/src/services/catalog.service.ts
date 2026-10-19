import Service from "@base/service.base";
import CatalogProductDto from "@dto/catalog-product.dto";
import CategoryDto from "@dto/category.dto";
import NotFoundException from "@exceptions/not-found.exception";
import CatalogRepository from "@repositories/catalog.repository";
import CategoryRepository from "@repositories/category.repository";
import ProductRepository from "@repositories/product.repository";
import ResponseType from "@@types/response.type";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";
import { CatalogProductQueryType } from "@validators/catalog.validator";

// Katalog publik untuk toko (apps/web), tanpa login. Hanya produk Aktif dengan varian aktif.
export default class CatalogService extends Service {
  constructor(
    private readonly categoryRepository: CategoryRepository = new CategoryRepository(),
    private readonly catalogRepository: CatalogRepository = new CatalogRepository(),
    private readonly productRepository: ProductRepository = new ProductRepository()
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
    return this.success(CatalogProductDto.detail(product, { name: category?.name ?? "", slug: category?.slug ?? "" }, brandName, images, variants));
  }
}
