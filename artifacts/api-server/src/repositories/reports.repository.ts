/**
 * ReportsRepository — queries de relatório para ADMIN.
 *
 * FASE 7 (Doc 16 §51–52, RN-079):
 * - Dados reais do banco, nunca hardcoded.
 * - Sem escrita, sem audit log, sem transação.
 * - Promise.all para paralelizar queries independentes.
 *
 * Datas filtradas por startDatetime:
 *   startDate (YYYY-MM-DD) → startDatetime >= YYYY-MM-DDT00:00:00.000Z
 *   endDate   (YYYY-MM-DD) → startDatetime <= YYYY-MM-DDT23:59:59.999Z
 *
 * Relatório de recursos: filtro de datas aplicado na condição do LEFT JOIN
 * (não no WHERE) para preservar todos os resources mesmo sem appointments no período.
 */
import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import {
  appointments,
  clients,
  professionals,
  resources,
  services,
  users,
} from "@workspace/db";

// ─── Aliases para join duplo de users ─────────────────────────────────────────
// Necessário para obter clientName e professionalName na mesma query.

const clientUsers = alias(users, "client_users");
const professionalUsers = alias(users, "professional_users");

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AppointmentReportRow {
  id: string;
  startDatetime: Date;
  endDatetime: Date;
  status: string;
  modality: string;
  priceAtBooking: string;
  clientName: string | null;
  professionalName: string | null;
  serviceName: string | null;
  resourceName: string | null;
}

export interface AppointmentReportSummary {
  total: number;
  byStatus: {
    CONFIRMED: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    CANCELLED: number;
    NO_SHOW: number;
  };
  byModality: {
    IN_PERSON: number;
    HOME_CARE: number;
  };
}

export interface AppointmentReportFilters {
  startDate?: string;
  endDate?: string;
  professionalId?: string;
  serviceId?: string;
  modality?: string;
  status?: string;
  page: number;
  limit: number;
}

export interface ResourceReportRow {
  resourceId: string;
  resourceName: string;
  resourceStatus: string;
  totalAppointments: number;
  byStatus: {
    CONFIRMED: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    CANCELLED: number;
    NO_SHOW: number;
  };
}

export interface ResourceReportFilters {
  startDate?: string;
  endDate?: string;
}

// ─── Helpers de data ──────────────────────────────────────────────────────────

/** Converte YYYY-MM-DD para início do dia UTC (T00:00:00.000Z). */
function toStartOfDay(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

/** Converte YYYY-MM-DD para final do dia UTC (T23:59:59.999Z). */
function toEndOfDay(dateStr: string): Date {
  return new Date(dateStr + "T23:59:59.999Z");
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const ReportsRepository = {
  /**
   * Relatório de agendamentos com filtros opcionais e paginação.
   *
   * Executa duas queries em paralelo:
   *   1. Data paginada (com joins para clientName, professionalName, serviceName, resourceName).
   *   2. Summary agregado — total + byStatus + byModality — sem joins (filtros apenas na tabela appointments).
   *
   * Retorna: { data, summary, total }
   */
  async getAppointmentsReport(
    db: DB,
    filters: AppointmentReportFilters,
  ): Promise<{ data: AppointmentReportRow[]; summary: AppointmentReportSummary; total: number }> {
    const { page, limit, startDate, endDate, professionalId, serviceId, modality, status } = filters;
    const offset = (page - 1) * limit;

    // Condições WHERE — aplicadas em ambas as queries
    const conds: SQL[] = [];
    if (startDate) conds.push(gte(appointments.startDatetime, toStartOfDay(startDate)));
    if (endDate) conds.push(lte(appointments.startDatetime, toEndOfDay(endDate)));
    if (professionalId) conds.push(eq(appointments.professionalId, professionalId));
    if (serviceId) conds.push(eq(appointments.serviceId, serviceId));
    if (modality) conds.push(eq(appointments.modality, modality));
    if (status) conds.push(eq(appointments.status, status));

    const where = conds.length > 0 ? and(...conds) : undefined;

    const [dataRows, summaryRow] = await Promise.all([
      // ── Query de dados (paginada, joins para nomes) ──────────────────────────
      db
        .select({
          id: appointments.id,
          startDatetime: appointments.startDatetime,
          endDatetime: appointments.endDatetime,
          status: appointments.status,
          modality: appointments.modality,
          priceAtBooking: appointments.priceAtBooking,
          clientName: clientUsers.name,
          professionalName: professionalUsers.name,
          serviceName: services.name,
          resourceName: resources.name,
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(clientUsers, eq(clients.userId, clientUsers.id))
        .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
        .leftJoin(professionalUsers, eq(professionals.userId, professionalUsers.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(resources, eq(appointments.resourceId, resources.id))
        .where(where)
        .orderBy(desc(appointments.startDatetime))
        .limit(limit)
        .offset(offset),

      // ── Query de summary (sem joins — todos os filtros são colunas de appointments) ──
      db
        .select({
          total: sql<number>`count(*)::int`,
          confirmed: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'CONFIRMED')::int`,
          inProgress: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'IN_PROGRESS')::int`,
          completed: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'COMPLETED')::int`,
          cancelled: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'CANCELLED')::int`,
          noShow: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'NO_SHOW')::int`,
          inPerson: sql<number>`count(*) FILTER (WHERE ${appointments.modality} = 'IN_PERSON')::int`,
          homeCare: sql<number>`count(*) FILTER (WHERE ${appointments.modality} = 'HOME_CARE')::int`,
        })
        .from(appointments)
        .where(where),
    ]);

    const s = summaryRow[0] ?? {
      total: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      inPerson: 0,
      homeCare: 0,
    };

    return {
      data: dataRows,
      total: s.total,
      summary: {
        total: s.total,
        byStatus: {
          CONFIRMED: s.confirmed,
          IN_PROGRESS: s.inProgress,
          COMPLETED: s.completed,
          CANCELLED: s.cancelled,
          NO_SHOW: s.noShow,
        },
        byModality: {
          IN_PERSON: s.inPerson,
          HOME_CARE: s.homeCare,
        },
      },
    };
  },

  /**
   * Relatório de utilização de recursos (macas).
   *
   * Retorna TODOS os resources (ACTIVE e INACTIVE) — D4.
   * Resources sem appointments no período aparecem com totalAppointments = 0.
   *
   * Filtro de datas aplicado na condição do LEFT JOIN (não no WHERE),
   * garantindo que resources sem agendamentos no período ainda apareçam.
   *
   * Ordenação: nome ASC.
   */
  async getResourcesReport(db: DB, filters: ResourceReportFilters): Promise<ResourceReportRow[]> {
    const { startDate, endDate } = filters;

    // Condições do JOIN — filtro de datas no join, não no WHERE
    const joinConds: SQL[] = [eq(appointments.resourceId, resources.id)];
    if (startDate) joinConds.push(gte(appointments.startDatetime, toStartOfDay(startDate)));
    if (endDate) joinConds.push(lte(appointments.startDatetime, toEndOfDay(endDate)));

    const joinCondition = and(...joinConds)!;

    const rows = await db
      .select({
        resourceId: resources.id,
        resourceName: resources.name,
        resourceStatus: resources.status,
        totalAppointments: sql<number>`count(${appointments.id})::int`,
        confirmed: sql<number>`count(${appointments.id}) FILTER (WHERE ${appointments.status} = 'CONFIRMED')::int`,
        inProgress: sql<number>`count(${appointments.id}) FILTER (WHERE ${appointments.status} = 'IN_PROGRESS')::int`,
        completed: sql<number>`count(${appointments.id}) FILTER (WHERE ${appointments.status} = 'COMPLETED')::int`,
        cancelled: sql<number>`count(${appointments.id}) FILTER (WHERE ${appointments.status} = 'CANCELLED')::int`,
        noShow: sql<number>`count(${appointments.id}) FILTER (WHERE ${appointments.status} = 'NO_SHOW')::int`,
      })
      .from(resources)
      .leftJoin(appointments, joinCondition)
      .groupBy(resources.id, resources.name, resources.status)
      .orderBy(asc(resources.name));

    return rows.map((r) => ({
      resourceId: r.resourceId,
      resourceName: r.resourceName,
      resourceStatus: r.resourceStatus,
      totalAppointments: r.totalAppointments,
      byStatus: {
        CONFIRMED: r.confirmed,
        IN_PROGRESS: r.inProgress,
        COMPLETED: r.completed,
        CANCELLED: r.cancelled,
        NO_SHOW: r.noShow,
      },
    }));
  },
};
