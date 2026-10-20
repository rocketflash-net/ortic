import { eq, sql } from "drizzle-orm";
import Repository from "@base/repository.base";
import { settings } from "@models/setting.model";
import { SETTING_DEFINITIONS, SETTING_KEYS, SettingKeyType, settingDefaults, SettingValuesType } from "@registries/setting.registry";

export default class SettingRepository extends Repository {
  // Nilai angka sebuah pengaturan; `fallback` bila belum ada atau bukan angka.
  async getNumber(key: string, fallback: number): Promise<number> {
    const [row] = await this.executor.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1);
    return typeof row?.value === "number" && Number.isFinite(row.value) ? row.value : fallback;
  }

  // Semua pengaturan terdaftar; nilai yang belum ada atau tidak valid diganti default-nya.
  async getAll(): Promise<SettingValuesType> {
    const rows = await this.executor.select().from(settings);
    const values = settingDefaults();
    for (const row of rows) {
      if (!SETTING_KEYS.includes(row.key as SettingKeyType)) continue;
      const key = row.key as SettingKeyType;
      const parsed = SETTING_DEFINITIONS[key].schema.safeParse(row.value);
      if (parsed.success) (values as Record<string, unknown>)[key] = parsed.data;
    }
    return values;
  }

  async upsertMany(values: Partial<SettingValuesType>): Promise<void> {
    const rows = Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({ key, value }));
    if (rows.length === 0) return;
    await this.executor
      .insert(settings)
      .values(rows)
      .onDuplicateKeyUpdate({ set: { value: sql`values(${settings.value})` } });
  }
}
