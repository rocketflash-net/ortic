import { sql } from "drizzle-orm";
import CategoryColorEnum from "@enums/category-color.enum";
import { categories } from "@models/category.model";
import { DatabaseExecutorType } from "@@types/database.type";
import { NewCategoryType } from "@@types/entity.type";

// Kategori awal (PRD bagian 2). Warna bergiliran merah-kuning-biru seperti kolom feed Instagram.
const data: NewCategoryType[] = [
  { name: "Alat Praktikum FKG", slug: "alat-praktikum-fkg", color: CategoryColorEnum.red, sortOrder: 1 },
  { name: "Instrumen Dasar & Bedah", slug: "instrumen-dasar-bedah", color: CategoryColorEnum.yellow, sortOrder: 2 },
  { name: "Endodontik", slug: "endodontik", color: CategoryColorEnum.blue, sortOrder: 3 },
  { name: "Bur & Rotary", slug: "bur-rotary", color: CategoryColorEnum.red, sortOrder: 4 },
  { name: "Restorasi", slug: "restorasi", color: CategoryColorEnum.yellow, sortOrder: 5 },
  { name: "Ortodonti", slug: "ortodonti", color: CategoryColorEnum.blue, sortOrder: 6 },
  { name: "Cetak & Laboratorium", slug: "cetak-laboratorium", color: CategoryColorEnum.red, sortOrder: 7 },
  { name: "Habis Pakai & Antiseptik", slug: "habis-pakai-antiseptik", color: CategoryColorEnum.yellow, sortOrder: 8 },
];

export default {
  name: "category.seeder",
  run: async (executor: DatabaseExecutorType): Promise<void> => {
    await executor
      .insert(categories)
      .values(data)
      .onDuplicateKeyUpdate({ set: { slug: sql`${categories.slug}` } });
  },
};
