import {
  pgTable,
  uuid,
  smallint,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { roles } from "./roles.js";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: smallint("role_id")
    .notNull()
    .references(() => roles.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
