import { asc, eq } from "drizzle-orm";
import Repository from "@base/repository.base";
import { warehouses } from "@models/warehouse.model";
import { NewWarehouseType, WarehouseType } from "@@types/entity.type";

export default class WarehouseRepository extends Repository {
  async findAll(): Promise<WarehouseType[]> {
    return await this.executor.select().from(warehouses).orderBy(asc(warehouses.id));
  }

  async findById(id: number): Promise<WarehouseType | null> {
    const [warehouse] = await this.executor.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);
    return warehouse ?? null;
  }

  async findByCode(code: string): Promise<WarehouseType | null> {
    const [warehouse] = await this.executor.select().from(warehouses).where(eq(warehouses.code, code)).limit(1);
    return warehouse ?? null;
  }

  async store(data: NewWarehouseType): Promise<number> {
    const [result] = await this.executor.insert(warehouses).values(data).$returningId();
    return result!.id;
  }

  async update(id: number, data: Partial<NewWarehouseType>): Promise<void> {
    await this.executor.update(warehouses).set(data).where(eq(warehouses.id, id));
  }
}
