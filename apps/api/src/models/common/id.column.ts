import { bigint } from "drizzle-orm/mysql-core";

// Primary key standar: BIGINT UNSIGNED AUTO_INCREMENT.
export const id = () => bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey();

// Kolom foreign key yang tipenya sama dengan `id()`.
export const foreignId = (name: string) => bigint(name, { mode: "number", unsigned: true });
