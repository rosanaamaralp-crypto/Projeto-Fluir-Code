import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  customType,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

// PostgreSQL inet type (not natively supported by Drizzle)
const inet = customType<{ data: string }>({
  dataType() {
    return "inet";
  },
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: inet("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
