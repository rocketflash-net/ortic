import { asc, eq } from "drizzle-orm";
import Repository from "@base/repository.base";
import { categories } from "@models/category.model";
import { CategoryType } from "@@types/entity.type";

export default class CategoryRepository extends Repository {
  async findById(id: number): Promise<CategoryType | null> {
    const [category] = await this.executor.select().from(categories).where(eq(categories.id, id)).limit(1);
    return category ?? null;
  }

  async findActive(): Promise<CategoryType[]> {
    return await this.executor.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder), asc(categories.id));
  }
}
