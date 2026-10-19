import { mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";

export const brands = mysqlTable("brands", {
  id: id(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  ...timestamps,
});
