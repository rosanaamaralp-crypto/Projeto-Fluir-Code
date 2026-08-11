import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { professionals } from "./professionals.js";
import { users } from "./users.js";

export const blockedPeriods = pgTable("blocked_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  startDatetime: timestamp("start_datetime", { withTimezone: true }).notNull(),
  endDatetime: timestamp("end_datetime", { withTimezone: true }).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
