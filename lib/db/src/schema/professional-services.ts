import { pgTable, uuid, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { professionals } from "./professionals.js";
import { services } from "./services.js";

export const professionalServices = pgTable(
  "professional_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("uq_professional_services").on(table.professionalId, table.serviceId)],
);
