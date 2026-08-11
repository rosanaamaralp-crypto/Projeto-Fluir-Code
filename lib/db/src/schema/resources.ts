import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull().default("MASSAGE_TABLE"),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
