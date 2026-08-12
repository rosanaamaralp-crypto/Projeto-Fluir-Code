/**
 * NotificationsRepository — acesso ao banco para o módulo de notificações.
 *
 * F8 — Doc 16 §46-47 / Doc 17 §43 / RN-087
 */
import { and, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { notifications } from "@workspace/db";

export type NotificationRow = typeof notifications.$inferSelect;

export interface FindNotificationsFilters {
  /** true → somente não lidas (read_at IS NULL); undefined/false → todas */
  unread?: boolean;
  page: number;
  limit: number;
}

export const NotificationsRepository = {
  /**
   * Insere uma notificação na tabela notifications.
   * Não gera audit log — evento derivado de ações já auditadas.
   */
  async create(
    db: DB,
    entry: {
      userId: string;
      type: string;
      title: string;
      message: string;
      appointmentId?: string | null;
    },
  ): Promise<void> {
    await db.insert(notifications).values({
      userId: entry.userId,
      type: entry.type,
      title: entry.title,
      message: entry.message,
      appointmentId: entry.appointmentId ?? null,
    });
  },

  /**
   * Busca notificações de um usuário com paginação.
   * Ordenação: created_at DESC — cobre índice idx_notif_user_all.
   * Com unread=true usa índice idx_notif_user_unread.
   */
  async findManyByUserId(
    db: DB,
    userId: string,
    filters: FindNotificationsFilters,
  ): Promise<{ data: NotificationRow[]; total: number }> {
    const { page, limit, unread } = filters;
    const offset = (page - 1) * limit;

    const conds: SQL[] = [eq(notifications.userId, userId)];
    if (unread === true) conds.push(isNull(notifications.readAt));

    const where = and(...conds);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;
    return { data, total };
  },

  /**
   * Busca uma notificação por ID (para validação de ownership antes de marcar como lida).
   */
  async findById(db: DB, id: string): Promise<NotificationRow | undefined> {
    const [row] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return row;
  },

  /**
   * Atualiza read_at = NOW() onde read_at IS NULL.
   * Idempotente: se já lida, nenhuma linha é atualizada (retorna undefined).
   * O controller lida com o caso já-lida usando findById antes de chamar este método.
   */
  async markAsRead(db: DB, id: string): Promise<Date | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), isNull(notifications.readAt)))
      .returning({ readAt: notifications.readAt });
    return updated?.readAt ?? undefined;
  },
};
