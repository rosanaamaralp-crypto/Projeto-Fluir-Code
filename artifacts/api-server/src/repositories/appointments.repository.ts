/**
 * Repository exclusivo de queries/mutações de appointments.
 * Sem regras de negócio, sem RBAC, sem cálculo de slots.
 * Usa DrizzleDB (NodePgDatabase | PgTransaction) conforme lib/db-types.ts.
 */
import { and, eq, gte, lte, notInArray, type SQL } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import { appointments } from "@workspace/db";

// Status que NÃO bloqueiam disponibilidade (não geram conflito de horário)
const NON_BLOCKING_STATUSES = ["CANCELLED", "COMPLETED", "NO_SHOW"] as const;

export interface AppointmentRow {
  id: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  modality: string;
  resourceId: string | null;
  addressId: string | null;
  startDatetime: Date;
  endDatetime: Date;
  status: string;
  priceAtBooking: string;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentData {
  clientId: string;
  professionalId: string;
  serviceId: string;
  modality: string;
  resourceId: string | null;
  addressId: string | null;
  startDatetime: Date;
  endDatetime: Date;
  status?: string;
  priceAtBooking: string;
  notes?: string | null;
  createdBy: string;
}

export interface AppointmentFilter {
  clientId?: string;
  professionalId?: string;
  status?: string;
  date?: string; // YYYY-MM-DD em UTC
}

// Slot row (subconjunto usado pelo algoritmo de slots — mantido para compatibilidade)
export interface AppointmentSlotRow {
  id: string;
  professionalId: string;
  clientId: string;
  resourceId: string | null;
  startDatetime: Date;
  endDatetime: Date;
  status: string;
}

const slotColumns = {
  id: appointments.id,
  professionalId: appointments.professionalId,
  clientId: appointments.clientId,
  resourceId: appointments.resourceId,
  startDatetime: appointments.startDatetime,
  endDatetime: appointments.endDatetime,
  status: appointments.status,
};

export const AppointmentsRepository = {
  /** Busca um appointment pelo ID. */
  async findById(db: DB, id: string): Promise<AppointmentRow | null> {
    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  /**
   * Lista appointments com filtros dinâmicos.
   * Os filtros de ownership (clientId, professionalId) são aplicados pelo service
   * conforme o role do usuário autenticado.
   */
  async findByFilter(db: DB, filter: AppointmentFilter): Promise<AppointmentRow[]> {
    const conds: SQL[] = [];

    if (filter.clientId) {
      conds.push(eq(appointments.clientId, filter.clientId));
    }
    if (filter.professionalId) {
      conds.push(eq(appointments.professionalId, filter.professionalId));
    }
    if (filter.status) {
      conds.push(eq(appointments.status, filter.status));
    }
    if (filter.date) {
      const dayStart = new Date(`${filter.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${filter.date}T23:59:59.999Z`);
      conds.push(gte(appointments.startDatetime, dayStart));
      conds.push(lte(appointments.startDatetime, dayEnd));
    }

    return db
      .select()
      .from(appointments)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(appointments.startDatetime);
  },

  /**
   * Cria um novo appointment.
   * A integridade final é garantida pelas EXCLUDE constraints do banco.
   */
  async create(db: DB, data: CreateAppointmentData): Promise<AppointmentRow> {
    const rows = await db
      .insert(appointments)
      .values({
        clientId: data.clientId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        modality: data.modality,
        resourceId: data.resourceId,
        addressId: data.addressId,
        startDatetime: data.startDatetime,
        endDatetime: data.endDatetime,
        status: data.status ?? "CONFIRMED",
        priceAtBooking: data.priceAtBooking,
        notes: data.notes ?? null,
        createdBy: data.createdBy,
      })
      .returning();
    return rows[0]!;
  },

  /**
   * Atualiza o status de um appointment.
   * O trigger `set_updated_at` cuida de `updated_at` automaticamente.
   */
  async updateStatus(db: DB, id: string, status: string): Promise<AppointmentRow | null> {
    const rows = await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();
    return rows[0] ?? null;
  },

  // ─── Métodos de conflito usados pelo SlotsService e AppointmentsService ───

  /**
   * Busca appointments ATIVOS de um profissional que se sobrepõem ao intervalo.
   * Usado pelo algoritmo de slots e pela validação de criação de appointments.
   */
  async findActiveByProfessionalInRange(
    db: DB,
    professionalId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AppointmentSlotRow[]> {
    return db
      .select(slotColumns)
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
      .select(slotColumns)
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
      .select(slotColumns)
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
