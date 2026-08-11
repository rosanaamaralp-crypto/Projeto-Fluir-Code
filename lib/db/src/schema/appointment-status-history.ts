import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { appointments } from "./appointments.js";
import { users } from "./users.js";

export const appointmentStatusHistory = pgTable(
  "appointment_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id),
    oldStatus: varchar("old_status", { length: 15 }),
    newStatus: varchar("new_status", { length: 15 }).notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    // Rescheduling tracking fields
    oldStartDatetime: timestamp("old_start_datetime", { withTimezone: true }),
    oldEndDatetime: timestamp("old_end_datetime", { withTimezone: true }),
    newStartDatetime: timestamp("new_start_datetime", { withTimezone: true }),
    newEndDatetime: timestamp("new_end_datetime", { withTimezone: true }),
    oldResourceId: uuid("old_resource_id"),
    newResourceId: uuid("new_resource_id"),
    oldAddressId: uuid("old_address_id"),
    newAddressId: uuid("new_address_id"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
