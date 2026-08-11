import { pgTable, smallint, varchar } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: smallint("id").primaryKey(),
  name: varchar("name", { length: 20 }).notNull(),
});
