import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { auditLogs } from "@workspace/db";

type DB = NodePgDatabase<typeof schema>;

// Campos sensíveis que NUNCA devem aparecer em old_data / new_data
const SENSITIVE_FIELDS = new Set([
  "passwordHash",
  "password_hash",
  "password",
  "sessionSecret",
  "session_secret",
  "token",
  "cookie",
]);

function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) continue;
    result[key] = sanitize(value);
  }
  return result;
}

export const AuditLogsRepository = {
  async create(
    db: DB,
    entry: {
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      oldData?: unknown;
      newData?: unknown;
      ipAddress?: string | null;
    },
  ): Promise<void> {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldData: sanitize(entry.oldData) as Record<string, unknown> | null ?? null,
      newData: sanitize(entry.newData) as Record<string, unknown> | null ?? null,
      ipAddress: entry.ipAddress ?? null,
    });
  },
};
