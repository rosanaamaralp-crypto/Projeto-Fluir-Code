/**
 * DashboardRepository — queries de agregação para os dashboards.
 *
 * FASE 6 (Doc 16 §48–50, RN-080):
 * - Todos os indicadores calculados a partir de dados reais do banco (nunca hardcoded).
 * - Sem escrita, sem audit log, sem transação.
 * - Promise.all para paralelizar queries independentes.
 *
 * Convenções de data:
 * - "hoje" = [todayStart, todayEnd] em UTC (00:00:00.000 … 23:59:59.999).
 * - "próximos" = startDatetime > now.
 */
import { and, asc, eq, gt, gte, lt, lte, or, sql } from "drizzle-orm";
import type { DrizzleDB as DB } from "../lib/db-types.js";
import {
  appointments,
  clients,
  professionals,
  resources,
  services,
  users,
} from "@workspace/db";

// ─── Admin dashboard ──────────────────────────────────────────────────────────

export interface ResourceOccupancyRow {
  resourceId: string;
  resourceName: string;
  appointmentsToday: number;
}

export interface AdminDashboardData {
  appointmentsToday: number;
  upcomingAppointments: number;
  completedToday: number;
  cancelledToday: number;
  homeCareToday: number;
  resourceOccupancy: ResourceOccupancyRow[];
}

// ─── Professional dashboard ───────────────────────────────────────────────────

export interface NextAppointmentForProfessional {
  id: string;
  startDatetime: Date;
  clientName: string | null;
  serviceName: string | null;
  modality: string;
  resourceName: string | null;
}

export interface UpcomingAppointmentForProfessional {
  id: string;
  startDatetime: Date;
  clientName: string | null;
  serviceName: string | null;
  modality: string;
}

export interface ProfessionalDashboardData {
  nextAppointment: NextAppointmentForProfessional | null;
  upcomingAppointments: UpcomingAppointmentForProfessional[];
  appointmentsToday: number;
  completedToday: number;
  cancelledToday: number;
}

// ─── Client dashboard ─────────────────────────────────────────────────────────

export interface NextAppointmentForClient {
  id: string;
  startDatetime: Date;
  professionalName: string | null;
  serviceName: string | null;
  modality: string;
}

export interface ClientDashboardData {
  nextAppointment: NextAppointmentForClient | null;
  upcomingAppointments: NextAppointmentForClient[];
  pastAppointmentsCount: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const DashboardRepository = {
  /**
   * Retorna indicadores administrativos calculados a partir do banco.
   * "hoje" = [todayStart, todayEnd] em UTC.
   * "upcoming" = CONFIRMED com startDatetime > now.
   * resourceOccupancy = apenas resources ACTIVE.
   */
  async getAdminDashboard(
    db: DB,
    { now, todayStart, todayEnd }: { now: Date; todayStart: Date; todayEnd: Date },
  ): Promise<AdminDashboardData> {
    const todayRange = and(
      gte(appointments.startDatetime, todayStart),
      lte(appointments.startDatetime, todayEnd),
    );

    const [
      todayResult,
      upcomingResult,
      completedResult,
      cancelledResult,
      homeCareResult,
      occupancy,
    ] = await Promise.all([
      // appointmentsToday — todos os agendamentos com startDatetime em hoje
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(todayRange),

      // upcomingAppointments — CONFIRMED com startDatetime no futuro
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(and(eq(appointments.status, "CONFIRMED"), gt(appointments.startDatetime, now))),

      // completedToday
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(and(eq(appointments.status, "COMPLETED"), todayRange)),

      // cancelledToday
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(and(eq(appointments.status, "CANCELLED"), todayRange)),

      // homeCareToday
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(and(eq(appointments.modality, "HOME_CARE"), todayRange)),

      // resourceOccupancy — apenas resources ACTIVE; LEFT JOIN para incluir macas sem atendimentos
      db
        .select({
          resourceId: resources.id,
          resourceName: resources.name,
          appointmentsToday: sql<number>`count(${appointments.id})::int`,
        })
        .from(resources)
        .leftJoin(
          appointments,
          and(
            eq(appointments.resourceId, resources.id),
            gte(appointments.startDatetime, todayStart),
            lte(appointments.startDatetime, todayEnd),
          ),
        )
        .where(eq(resources.status, "ACTIVE"))
        .groupBy(resources.id, resources.name)
        .orderBy(resources.name),
    ]);

    return {
      appointmentsToday: todayResult[0]?.count ?? 0,
      upcomingAppointments: upcomingResult[0]?.count ?? 0,
      completedToday: completedResult[0]?.count ?? 0,
      cancelledToday: cancelledResult[0]?.count ?? 0,
      homeCareToday: homeCareResult[0]?.count ?? 0,
      resourceOccupancy: occupancy,
    };
  },

  /**
   * Retorna indicadores do profissional.
   * nextAppointment = primeiro CONFIRMED/IN_PROGRESS após now.
   * upcomingAppointments = top 10 CONFIRMED/IN_PROGRESS após now (inclui nextAppointment).
   * appointmentsToday = todos (qualquer status) com startDatetime em hoje para este profissional.
   */
  async getProfessionalDashboard(
    db: DB,
    {
      professionalId,
      now,
      todayStart,
      todayEnd,
    }: { professionalId: string; now: Date; todayStart: Date; todayEnd: Date },
  ): Promise<ProfessionalDashboardData> {
    const activeStatuses = or(
      eq(appointments.status, "CONFIRMED"),
      eq(appointments.status, "IN_PROGRESS"),
    )!;

    const upcomingWhere = and(
      eq(appointments.professionalId, professionalId),
      activeStatuses,
      gt(appointments.startDatetime, now),
    );

    const [nextRows, upcomingRows, todayResult, completedResult, cancelledResult] =
      await Promise.all([
        // nextAppointment — primeiro agendamento ativo futuro com dados do cliente e serviço
        db
          .select({
            id: appointments.id,
            startDatetime: appointments.startDatetime,
            clientName: users.name,
            serviceName: services.name,
            modality: appointments.modality,
            resourceName: resources.name,
          })
          .from(appointments)
          .leftJoin(clients, eq(appointments.clientId, clients.id))
          .leftJoin(users, eq(clients.userId, users.id))
          .leftJoin(services, eq(appointments.serviceId, services.id))
          .leftJoin(resources, eq(appointments.resourceId, resources.id))
          .where(upcomingWhere)
          .orderBy(asc(appointments.startDatetime))
          .limit(1),

        // upcomingAppointments — top 10 futuros ativos
        db
          .select({
            id: appointments.id,
            startDatetime: appointments.startDatetime,
            clientName: users.name,
            serviceName: services.name,
            modality: appointments.modality,
          })
          .from(appointments)
          .leftJoin(clients, eq(appointments.clientId, clients.id))
          .leftJoin(users, eq(clients.userId, users.id))
          .leftJoin(services, eq(appointments.serviceId, services.id))
          .where(upcomingWhere)
          .orderBy(asc(appointments.startDatetime))
          .limit(10),

        // appointmentsToday — todos do profissional com startDatetime em hoje
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(appointments)
          .where(
            and(
              eq(appointments.professionalId, professionalId),
              gte(appointments.startDatetime, todayStart),
              lte(appointments.startDatetime, todayEnd),
            ),
          ),

        // completedToday
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(appointments)
          .where(
            and(
              eq(appointments.professionalId, professionalId),
              eq(appointments.status, "COMPLETED"),
              gte(appointments.startDatetime, todayStart),
              lte(appointments.startDatetime, todayEnd),
            ),
          ),

        // cancelledToday
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(appointments)
          .where(
            and(
              eq(appointments.professionalId, professionalId),
              eq(appointments.status, "CANCELLED"),
              gte(appointments.startDatetime, todayStart),
              lte(appointments.startDatetime, todayEnd),
            ),
          ),
      ]);

    return {
      nextAppointment: nextRows[0] ?? null,
      upcomingAppointments: upcomingRows,
      appointmentsToday: todayResult[0]?.count ?? 0,
      completedToday: completedResult[0]?.count ?? 0,
      cancelledToday: cancelledResult[0]?.count ?? 0,
    };
  },

  /**
   * Retorna indicadores do cliente.
   * nextAppointment = primeiro CONFIRMED após now.
   * upcomingAppointments = top 5 CONFIRMED após now (inclui nextAppointment).
   * pastAppointmentsCount = agendamentos com startDatetime < now.
   */
  async getClientDashboard(
    db: DB,
    { clientId, now }: { clientId: string; now: Date },
  ): Promise<ClientDashboardData> {
    const upcomingWhere = and(
      eq(appointments.clientId, clientId),
      eq(appointments.status, "CONFIRMED"),
      gt(appointments.startDatetime, now),
    );

    const [nextRows, upcomingRows, pastResult] = await Promise.all([
      // nextAppointment — primeiro CONFIRMED futuro com dados do profissional e serviço
      db
        .select({
          id: appointments.id,
          startDatetime: appointments.startDatetime,
          professionalName: users.name,
          serviceName: services.name,
          modality: appointments.modality,
        })
        .from(appointments)
        .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
        .leftJoin(users, eq(professionals.userId, users.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .where(upcomingWhere)
        .orderBy(asc(appointments.startDatetime))
        .limit(1),

      // upcomingAppointments — top 5 CONFIRMED futuros
      db
        .select({
          id: appointments.id,
          startDatetime: appointments.startDatetime,
          professionalName: users.name,
          serviceName: services.name,
          modality: appointments.modality,
        })
        .from(appointments)
        .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
        .leftJoin(users, eq(professionals.userId, users.id))
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .where(upcomingWhere)
        .orderBy(asc(appointments.startDatetime))
        .limit(5),

      // pastAppointmentsCount — todos com startDatetime < now
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(and(eq(appointments.clientId, clientId), lt(appointments.startDatetime, now))),
    ]);

    return {
      nextAppointment: nextRows[0] ?? null,
      upcomingAppointments: upcomingRows,
      pastAppointmentsCount: pastResult[0]?.count ?? 0,
    };
  },
};
