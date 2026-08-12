/**
 * Repository para appointment_status_history.
 * Tabela append-only (trigger trg_appt_history_no_delete).
 * Sem regras de negócio — apenas queries e inserções.
 */
import { eq } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { appointmentStatusHistory } from "@workspace/db";

export interface AppointmentStatusHistoryRow {
  id: string;
  appointmentId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string;
  reason: string | null;
  oldStartDatetime: Date | null;
  oldEndDatetime: Date | null;
  newStartDatetime: Date | null;
  newEndDatetime: Date | null;
  oldResourceId: string | null;
  newResourceId: string | null;
  oldAddressId: string | null;
  newAddressId: string | null;
  changedAt: Date;
}

export interface CreateStatusHistoryData {
  appointmentId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string;
  reason?: string | null;
  // Campos de remarcação (opcionais)
  oldStartDatetime?: Date | null;
  oldEndDatetime?: Date | null;
  newStartDatetime?: Date | null;
  newEndDatetime?: Date | null;
  oldResourceId?: string | null;
  newResourceId?: string | null;
  oldAddressId?: string | null;
  newAddressId?: string | null;
}

export const AppointmentStatusHistoryRepository = {
  /** Registra uma mudança de status. Tabela append-only — apenas INSERT. */
  async create(db: DB, data: CreateStatusHistoryData): Promise<AppointmentStatusHistoryRow> {
    const rows = await db
      .insert(appointmentStatusHistory)
      .values({
        appointmentId: data.appointmentId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        changedBy: data.changedBy,
        reason: data.reason ?? null,
        oldStartDatetime: data.oldStartDatetime ?? null,
        oldEndDatetime: data.oldEndDatetime ?? null,
        newStartDatetime: data.newStartDatetime ?? null,
        newEndDatetime: data.newEndDatetime ?? null,
        oldResourceId: data.oldResourceId ?? null,
        newResourceId: data.newResourceId ?? null,
        oldAddressId: data.oldAddressId ?? null,
        newAddressId: data.newAddressId ?? null,
      })
      .returning();
    return rows[0]!;
  },

  /** Retorna todo o histórico de um appointment, ordenado cronologicamente. */
  async findByAppointmentId(
    db: DB,
    appointmentId: string,
  ): Promise<AppointmentStatusHistoryRow[]> {
    return db
      .select()
      .from(appointmentStatusHistory)
      .where(eq(appointmentStatusHistory.appointmentId, appointmentId))
      .orderBy(appointmentStatusHistory.changedAt);
  },
};
