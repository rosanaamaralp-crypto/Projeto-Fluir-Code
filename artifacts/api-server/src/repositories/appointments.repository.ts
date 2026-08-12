import { and, eq, gte, lte, notInArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { appointments } from "@workspace/db";

type DB = NodePgDatabase<typeof schema>;

// Status que NÃO bloqueiam disponibilidade
const NON_BLOCKING_STATUSES = ["CANCELLED", "COMPLETED", "NO_SHOW"] as const;

export interface AppointmentSlotRow {
  id: string;
  professionalId: string;
  clientId: string;
  resourceId: string | null;
  startDatetime: Date;
  endDatetime: Date;
  status: string;
}

export const AppointmentsRepository = {
  /**
   * Busca appointments ATIVOS de um profissional que se sobrepõem ao intervalo.
   * Usado pelo algoritmo de slots para checar conflitos.
   */
  async findActiveByProfessionalInRange(
    db: DB,
    professionalId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AppointmentSlotRow[]> {
    return db
      .select({
        id: appointments.id,
        professionalId: appointments.professionalId,
        clientId: appointments.clientId,
        resourceId: appointments.resourceId,
        startDatetime: appointments.startDatetime,
        endDatetime: appointments.endDatetime,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.professionalId, professionalId),
          notInArray(appointments.status, [...NON_BLOCKING_STATUSES]),
          lte(appointments.startDatetime, rangeEnd),
          gte(appointments.endDatetime, rangeStart),
        ),
      );
  },

  /**
   * Busca appointments ATIVOS de um cliente que se sobrepõem ao intervalo.
   */
  async findActiveByClientInRange(
    db: DB,
    clientId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AppointmentSlotRow[]> {
    return db
      .select({
        id: appointments.id,
        professionalId: appointments.professionalId,
        clientId: appointments.clientId,
        resourceId: appointments.resourceId,
        startDatetime: appointments.startDatetime,
        endDatetime: appointments.endDatetime,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          notInArray(appointments.status, [...NON_BLOCKING_STATUSES]),
          lte(appointments.startDatetime, rangeEnd),
          gte(appointments.endDatetime, rangeStart),
        ),
      );
  },

  /**
   * Busca appointments ATIVOS em um resource que se sobrepõem ao intervalo.
   */
  async findActiveByResourceInRange(
    db: DB,
    resourceId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AppointmentSlotRow[]> {
    return db
      .select({
        id: appointments.id,
        professionalId: appointments.professionalId,
        clientId: appointments.clientId,
        resourceId: appointments.resourceId,
        startDatetime: appointments.startDatetime,
        endDatetime: appointments.endDatetime,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.resourceId, resourceId),
          notInArray(appointments.status, [...NON_BLOCKING_STATUSES]),
          lte(appointments.startDatetime, rangeEnd),
          gte(appointments.endDatetime, rangeStart),
        ),
      );
  },
};
