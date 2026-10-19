import { eq } from "drizzle-orm";
import Repository from "@base/repository.base";
import { settings } from "@models/setting.model";

export default class SettingRepository extends Repository {
  // Nilai angka sebuah pengaturan; `fallback` bila belum ada atau bukan angka.
  async getNumber(key: string, fallback: number): Promise<number> {
    const [row] = await this.executor.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1);
    return typeof row?.value === "number" && Number.isFinite(row.value) ? row.value : fallback;
  }
}
