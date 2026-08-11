import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { clients } from "./clients.js";
import { professionals } from "./professionals.js";
import { services } from "./services.js";
import { resources } from "./resources.js";
import { addresses } from "./addresses.js";
import { users } from "./users.js";

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  modality: varchar("modality", { length: 10 }).notNull(),
  resourceId: uuid("resource_id").references(() => resources.id),
  addressId: uuid("address_id").references(() => addresses.id),
  startDatetime: timestamp("start_datetime", { withTimezone: true }).notNull(),
  endDatetime: timestamp("end_datetime", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 15 }).notNull().default("CONFIRMED"),
  priceAtBooking: numeric("price_at_booking", {
    precision: 10,
    scale: 2,
  }).notNull(),
  notes: text("notes"),
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
