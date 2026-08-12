import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { auditLogs } from "@workspace/db";

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

export type AuditLogRow = typeof auditLogs.$inferSelect;

export interface FindAuditLogsFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
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

  /**
   * Busca audit logs com filtros opcionais e paginação.
   *
   * F5.7 — GET /api/audit-logs (Doc 16 §53 / RN-063, RN-064)
   * Ordenação: createdAt DESC.
   * Retorna: { data, total } — total para paginação.
   */
  async findMany(
    db: DB,
    filters: FindAuditLogsFilters,
  ): Promise<{ data: AuditLogRow[]; total: number }> {
    const { page, limit, action, entityType, entityId, userId, startDate, endDate } = filters;
    const offset = (page - 1) * limit;

    const conds: SQL[] = [];
    if (action) conds.push(eq(auditLogs.action, action));
    if (entityType) conds.push(eq(auditLogs.entityType, entityType));
    if (entityId) conds.push(eq(auditLogs.entityId, entityId));
    if (userId) conds.push(eq(auditLogs.userId, userId));
    if (startDate) conds.push(gte(auditLogs.createdAt, new Date(startDate)));
    if (endDate) conds.push(lte(auditLogs.createdAt, new Date(endDate)));

    const where = conds.length > 0 ? and(...conds) : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return { data, total };
  },
};
