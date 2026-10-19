import { asc, eq } from "drizzle-orm";
import Repository from "@base/repository.base";
import { couriers } from "@models/courier.model";
import { CourierType } from "@@types/entity.type";

export default class CourierRepository extends Repository {
  async findActive(): Promise<CourierType[]> {
    return await this.executor.select().from(couriers).where(eq(couriers.isActive, true)).orderBy(asc(couriers.sortOrder), asc(couriers.id));
  }
}
