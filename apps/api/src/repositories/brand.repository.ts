import { asc, eq } from "drizzle-orm";
import Repository from "@base/repository.base";
import { brands } from "@models/brand.model";
import { BrandType, NewBrandType } from "@@types/entity.type";

export default class BrandRepository extends Repository {
  async findAll(): Promise<BrandType[]> {
    return await this.executor.select().from(brands).orderBy(asc(brands.name));
  }

  async findById(id: number): Promise<BrandType | null> {
    const [brand] = await this.executor.select().from(brands).where(eq(brands.id, id)).limit(1);
    return brand ?? null;
  }

  async findBySlug(slug: string): Promise<BrandType | null> {
    const [brand] = await this.executor.select().from(brands).where(eq(brands.slug, slug)).limit(1);
    return brand ?? null;
  }

  async store(data: NewBrandType): Promise<number> {
    const [result] = await this.executor.insert(brands).values(data).$returningId();
    return result!.id;
  }
}
