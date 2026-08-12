/**
 * Testes de integração — FASE 7 — Relatórios
 *
 * Cobre: RBAC, dados corretos, filtros, paginação, validações.
 *
 * Endpoints:
 *   GET /api/reports/appointments — ADMIN apenas
 *   GET /api/reports/resources   — ADMIN apenas
 *
 * Fonte documental: Doc 16 §51–52, RN-079, D1–D7.
 *
 * ─── Estratégia de fixtures ──────────────────────────────────────────────────
 * Appointments inseridos diretamente via DB (bypass do service layer) para
 * controle preciso de datas, status e modalidade.
 *
 *   completed_1  — d-15, 08:00–09:00, IN_PERSON,  COMPLETED  (resourceId)
 *   completed_2  — d-15, 09:00–10:00, IN_PERSON,  COMPLETED  (resourceId)
 *   cancelled_1  — d-15, 08:00–09:00, IN_PERSON,  CANCELLED  (resourceId; sobreposição OK)
 *   no_show_1    — d-10, 08:00–09:00, IN_PERSON,  NO_SHOW    (resourceId; sobreposição OK)
 *   confirmed_1  — d+30, 08:00–09:00, IN_PERSON,  CONFIRMED  (resourceId)
 *   in_progress_1 — hoje, 10:00–11:00, HOME_CARE, IN_PROGRESS (addressId, serviceHomeCareId)
 *
 * Summary esperado (sem filtros):
 *   total: 6 | CONFIRMED=1 IN_PROGRESS=1 COMPLETED=2 CANCELLED=1 NO_SHOW=1
 *   IN_PERSON=5 HOME_CARE=1
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, loginAs } from "../helpers/app.js";
import {
  seedTestData,
  seedAppointmentExtras,
  cleanTestData,
  TEST_EMAILS,
  TEST_PASSWORDS,
  type TestUsers,
  type AppointmentTestExtras,
} from "../helpers/seed.js";
import { getDatabaseClient } from "@workspace/db";
import { appointments, addresses } from "@workspace/db";
import { eq } from "drizzle-orm";

const { db } = getDatabaseClient();

let ids: TestUsers;
let extras: AppointmentTestExtras;
let adminCookie: string;
let profCookie: string;
let clientCookie: string;
let addressId: string | null = null;

// ─── Helpers de data ──────────────────────────────────────────────────────────

/** Retorna hoje + dayOffset às HH:00:00 UTC. */
function dayAt(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

/** Retorna hoje às HH:00:00 UTC. */
function todayAt(hour: number): Date {
  return dayAt(0, hour);
}

/** Formata Date como YYYY-MM-DD em UTC. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Setup global ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  ids = await seedTestData();
  extras = await seedAppointmentExtras(ids);
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);

  // Recuperar endereço do cliente (criado pelo seedAppointmentExtras)
  const addrRows = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.clientId, ids.clientId))
    .limit(1);
  addressId = addrRows[0]?.id ?? null;

  const base = {
    clientId: ids.clientId,
    professionalId: ids.professionalId,
    createdBy: ids.adminId,
    priceAtBooking: "100.00",
    notes: null,
  };

  // completed_1 — d-15, 08:00–09:00, IN_PERSON, COMPLETED
  await db.insert(appointments).values({
    ...base,
    serviceId: ids.serviceId,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: dayAt(-15, 8),
    endDatetime: dayAt(-15, 9),
    status: "COMPLETED",
  });

  // completed_2 — d-15, 09:00–10:00, IN_PERSON, COMPLETED
  await db.insert(appointments).values({
    ...base,
    serviceId: ids.serviceId,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: dayAt(-15, 9),
    endDatetime: dayAt(-15, 10),
    status: "COMPLETED",
  });

  // cancelled_1 — d-15, 08:00–09:00, IN_PERSON, CANCELLED (sobreposição OK pelo EXCLUDE)
  await db.insert(appointments).values({
    ...base,
    serviceId: ids.serviceId,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: dayAt(-15, 8),
    endDatetime: dayAt(-15, 9),
    status: "CANCELLED",
  });

  // no_show_1 — d-10, 08:00–09:00, IN_PERSON, NO_SHOW (sobreposição OK pelo EXCLUDE)
  await db.insert(appointments).values({
    ...base,
    serviceId: ids.serviceId,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: dayAt(-10, 8),
    endDatetime: dayAt(-10, 9),
    status: "NO_SHOW",
  });

  // confirmed_1 — d+30, 08:00–09:00, IN_PERSON, CONFIRMED
  await db.insert(appointments).values({
    ...base,
    serviceId: ids.serviceId,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: dayAt(30, 8),
    endDatetime: dayAt(30, 9),
    status: "CONFIRMED",
  });

  // in_progress_1 — hoje, 10:00–11:00, HOME_CARE, IN_PROGRESS
  if (addressId) {
    await db.insert(appointments).values({
      ...base,
      serviceId: extras.serviceHomeCareId,
      resourceId: null,
      addressId,
      modality: "HOME_CARE",
      startDatetime: todayAt(10),
      endDatetime: todayAt(11),
      status: "IN_PROGRESS",
    });
  }
});

afterAll(async () => {
  await cleanTestData();
});

// ─── GET /api/reports/appointments ────────────────────────────────────────────

describe("GET /api/reports/appointments", () => {
  // ── RBAC ──────────────────────────────────────────────────────────────────

  it("ADMIN → 200", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });

  it("PROFESSIONAL → 403", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", profCookie);
    expect(res.status).toBe(403);
  });

  it("CLIENT → 403", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });

  it("anônimo → 401", async () => {
    const res = await request.get("/api/reports/appointments");
    expect(res.status).toBe(401);
  });

  // ── Estrutura da resposta ──────────────────────────────────────────────────

  it("retorna campos obrigatórios: data, summary, pagination", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const body = res.body as { data: unknown[]; summary: unknown; pagination: unknown };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.summary).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  it("summary contém total, byStatus com 5 status e byModality com 2 modalidades", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { summary } = res.body as {
      summary: {
        total: number;
        byStatus: Record<string, number>;
        byModality: Record<string, number>;
      };
    };
    expect(typeof summary.total).toBe("number");
    expect(typeof summary.byStatus.CONFIRMED).toBe("number");
    expect(typeof summary.byStatus.IN_PROGRESS).toBe("number");
    expect(typeof summary.byStatus.COMPLETED).toBe("number");
    expect(typeof summary.byStatus.CANCELLED).toBe("number");
    expect(typeof summary.byStatus.NO_SHOW).toBe("number");
    expect(typeof summary.byModality.IN_PERSON).toBe("number");
    expect(typeof summary.byModality.HOME_CARE).toBe("number");
  });

  it("summary.total >= 5 e soma de byStatus = total", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { summary } = res.body as {
      summary: {
        total: number;
        byStatus: Record<string, number>;
        byModality: Record<string, number>;
      };
    };
    // Inserimos 5 (IN_PERSON) + 1 (HOME_CARE se addressId disponível)
    expect(summary.total).toBeGreaterThanOrEqual(5);
    const statusSum =
      summary.byStatus.CONFIRMED +
      summary.byStatus.IN_PROGRESS +
      summary.byStatus.COMPLETED +
      summary.byStatus.CANCELLED +
      summary.byStatus.NO_SHOW;
    expect(statusSum).toBe(summary.total);
    const modalitySum = summary.byModality.IN_PERSON + summary.byModality.HOME_CARE;
    expect(modalitySum).toBe(summary.total);
  });

  it("summary.byStatus.COMPLETED >= 2 (completed_1 e completed_2 inseridos)", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { summary } = res.body as { summary: { byStatus: { COMPLETED: number } } };
    expect(summary.byStatus.COMPLETED).toBeGreaterThanOrEqual(2);
  });

  it("summary.byStatus.CANCELLED >= 1 (cancelled_1 inserido)", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { summary } = res.body as { summary: { byStatus: { CANCELLED: number } } };
    expect(summary.byStatus.CANCELLED).toBeGreaterThanOrEqual(1);
  });

  it("summary.byStatus.NO_SHOW >= 1 (no_show_1 inserido)", async () => {
    const res = await request.get("/api/reports/appointments").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { summary } = res.body as { summary: { byStatus: { NO_SHOW: number } } };
    expect(summary.byStatus.NO_SHOW).toBeGreaterThanOrEqual(1);
  });

  // ── Filtros ───────────────────────────────────────────────────────────────

  it("filtro status=COMPLETED → todos os registros têm status COMPLETED", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    const body = res.body as {
      data: { status: string }[];
      summary: { total: number; byStatus: { COMPLETED: number } };
    };
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    for (const row of body.data) {
      expect(row.status).toBe("COMPLETED");
    }
    expect(body.summary.total).toBe(body.summary.byStatus.COMPLETED);
  });

  it("filtro status=NO_SHOW → todos os registros têm status NO_SHOW", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ status: "NO_SHOW" });
    expect(res.status).toBe(200);
    const body = res.body as {
      data: { status: string }[];
      summary: { total: number };
    };
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    for (const row of body.data) {
      expect(row.status).toBe("NO_SHOW");
    }
  });

  it("filtro modality=HOME_CARE → todos os registros têm modality HOME_CARE", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ modality: "HOME_CARE" });
    expect(res.status).toBe(200);
    const body = res.body as { data: { modality: string }[] };
    if (addressId) {
      // HOME_CARE inserido apenas se addressId estava disponível
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      for (const row of body.data) {
        expect(row.modality).toBe("HOME_CARE");
      }
    }
  });

  it("filtro professionalId → todos os registros são do profissional correto", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ professionalId: ids.professionalId });
    expect(res.status).toBe(200);
    const body = res.body as { data: { professionalName: string | null }[]; summary: { total: number } };
    // Todos os fixtures usam o mesmo profissional
    expect(body.summary.total).toBeGreaterThanOrEqual(5);
    for (const row of body.data) {
      // professionalName é preenchido via JOIN com users
      expect(row.professionalName).toBe("Profissional Teste");
    }
  });

  it("filtro serviceId=serviceHomeCareId → apenas o appointment HOME_CARE", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ serviceId: extras.serviceHomeCareId });
    expect(res.status).toBe(200);
    const body = res.body as { data: unknown[]; summary: { total: number } };
    if (addressId) {
      // in_progress_1 usa serviceHomeCareId
      expect(body.summary.total).toBeGreaterThanOrEqual(1);
    }
  });

  it("filtro startDate/endDate → retorna apenas appointments no intervalo de datas", async () => {
    // Intervalo d-20 até d-5: deve incluir completed_1, completed_2, cancelled_1, no_show_1
    // Exclui confirmed_1 (d+30) e in_progress_1 (hoje)
    const startDate = toDateStr(dayAt(-20, 0));
    const endDate = toDateStr(dayAt(-5, 0));

    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ startDate, endDate });
    expect(res.status).toBe(200);
    const body = res.body as {
      data: { startDatetime: string }[];
      summary: { total: number };
    };

    // Todos os registros retornados devem ter startDatetime dentro do intervalo
    const start = new Date(startDate + "T00:00:00.000Z");
    const end = new Date(endDate + "T23:59:59.999Z");
    for (const row of body.data) {
      const dt = new Date(row.startDatetime);
      expect(dt.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(dt.getTime()).toBeLessThanOrEqual(end.getTime());
    }

    // completed_1, completed_2, cancelled_1, no_show_1 = 4 appointments no intervalo
    expect(body.summary.total).toBeGreaterThanOrEqual(4);
    // confirmed_1 (d+30) e in_progress_1 (hoje) não devem estar no intervalo
    expect(body.summary.total).toBeLessThan(6);
  });

  // ── Paginação ─────────────────────────────────────────────────────────────

  it("paginação: page=1&limit=2 → 2 registros retornados, totalPages calculado corretamente", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ page: 1, limit: 2 });
    expect(res.status).toBe(200);
    const body = res.body as {
      data: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
    expect(body.data.length).toBe(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.totalPages).toBe(Math.ceil(body.pagination.total / 2));
  });

  it("paginação: page=2&limit=2 → registros diferentes da página 1", async () => {
    const [page1, page2] = await Promise.all([
      request
        .get("/api/reports/appointments")
        .set("Cookie", adminCookie)
        .query({ page: 1, limit: 2 }),
      request
        .get("/api/reports/appointments")
        .set("Cookie", adminCookie)
        .query({ page: 2, limit: 2 }),
    ]);
    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    const ids1 = (page1.body.data as { id: string }[]).map((r) => r.id);
    const ids2 = (page2.body.data as { id: string }[]).map((r) => r.id);
    // IDs das duas páginas não devem ter interseção
    for (const id of ids2) {
      expect(ids1).not.toContain(id);
    }
  });

  // ── Validações ────────────────────────────────────────────────────────────

  it("professionalId inválido (não UUID) → 400", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ professionalId: "nao-e-um-uuid" });
    expect(res.status).toBe(400);
  });

  it("serviceId inválido (não UUID) → 400", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ serviceId: "invalido" });
    expect(res.status).toBe(400);
  });

  it("modality com valor fora do enum → 400", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ modality: "PRESENCIAL" });
    expect(res.status).toBe(400);
  });

  it("status com valor fora do enum → 400", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ status: "PENDENTE" });
    expect(res.status).toBe(400);
  });

  it("endDate < startDate → 400", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ startDate: "2026-08-10", endDate: "2026-08-01" });
    expect(res.status).toBe(400);
  });

  it("page=0 → 400", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ page: 0 });
    expect(res.status).toBe(400);
  });

  it("limit=101 → 400", async () => {
    const res = await request
      .get("/api/reports/appointments")
      .set("Cookie", adminCookie)
      .query({ limit: 101 });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/reports/resources ───────────────────────────────────────────────

describe("GET /api/reports/resources", () => {
  // ── RBAC ──────────────────────────────────────────────────────────────────

  it("ADMIN → 200", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });

  it("PROFESSIONAL → 403", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", profCookie);
    expect(res.status).toBe(403);
  });

  it("CLIENT → 403", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });

  it("anônimo → 401", async () => {
    const res = await request.get("/api/reports/resources");
    expect(res.status).toBe(401);
  });

  // ── Estrutura da resposta ──────────────────────────────────────────────────

  it("retorna campos obrigatórios: data (array) e period", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const body = res.body as { data: unknown[]; period: unknown };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.period).toBeDefined();
  });

  it("period retorna startDate e endDate (null quando não informados — D7)", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { period } = res.body as { period: { startDate: null; endDate: null } };
    expect(period.startDate).toBeNull();
    expect(period.endDate).toBeNull();
  });

  it("period retorna as datas informadas quando filtradas", async () => {
    const res = await request
      .get("/api/reports/resources")
      .set("Cookie", adminCookie)
      .query({ startDate: "2026-01-01", endDate: "2026-12-31" });
    expect(res.status).toBe(200);
    const { period } = res.body as { period: { startDate: string; endDate: string } };
    expect(period.startDate).toBe("2026-01-01");
    expect(period.endDate).toBe("2026-12-31");
  });

  // ── Dados ─────────────────────────────────────────────────────────────────

  it("cada resource contém os campos esperados (resourceId, resourceName, resourceStatus, totalAppointments, byStatus)", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const body = res.body as {
      data: {
        resourceId: string;
        resourceName: string;
        resourceStatus: string;
        totalAppointments: number;
        byStatus: Record<string, number>;
      }[];
    };
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    for (const row of body.data) {
      expect(typeof row.resourceId).toBe("string");
      expect(typeof row.resourceName).toBe("string");
      expect(typeof row.resourceStatus).toBe("string");
      expect(typeof row.totalAppointments).toBe("number");
      expect(typeof row.byStatus.CONFIRMED).toBe("number");
      expect(typeof row.byStatus.IN_PROGRESS).toBe("number");
      expect(typeof row.byStatus.COMPLETED).toBe("number");
      expect(typeof row.byStatus.CANCELLED).toBe("number");
      expect(typeof row.byStatus.NO_SHOW).toBe("number");
    }
  });

  it("resource 'Sala Teste Fase4' tem totalAppointments >= 5 (IN_PERSON fixtures)", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const body = res.body as {
      data: { resourceName: string; totalAppointments: number }[];
    };
    const sala = body.data.find((r) => r.resourceName === "Sala Teste Fase4");
    expect(sala).toBeDefined();
    // completed_1, completed_2, cancelled_1, no_show_1, confirmed_1 = 5 appointments IN_PERSON
    expect(sala!.totalAppointments).toBeGreaterThanOrEqual(5);
  });

  it("resource 'Sala Teste Fase4': byStatus.COMPLETED >= 2", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const body = res.body as {
      data: { resourceName: string; byStatus: { COMPLETED: number } }[];
    };
    const sala = body.data.find((r) => r.resourceName === "Sala Teste Fase4");
    expect(sala).toBeDefined();
    expect(sala!.byStatus.COMPLETED).toBeGreaterThanOrEqual(2);
  });

  it("resources ordenados por nome ASC", async () => {
    const res = await request.get("/api/reports/resources").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const body = res.body as { data: { resourceName: string }[] };
    const names = body.data.map((r) => r.resourceName);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("filtro startDate/endDate refletido no period e aplicado no cálculo de totalAppointments", async () => {
    // Filtrando apenas d-20 até d-5: deve contar completed_1, completed_2, cancelled_1, no_show_1
    const startDate = toDateStr(dayAt(-20, 0));
    const endDate = toDateStr(dayAt(-5, 0));

    const res = await request
      .get("/api/reports/resources")
      .set("Cookie", adminCookie)
      .query({ startDate, endDate });
    expect(res.status).toBe(200);
    const body = res.body as {
      data: { resourceName: string; totalAppointments: number }[];
      period: { startDate: string; endDate: string };
    };

    expect(body.period.startDate).toBe(startDate);
    expect(body.period.endDate).toBe(endDate);

    const sala = body.data.find((r) => r.resourceName === "Sala Teste Fase4");
    expect(sala).toBeDefined();
    // No intervalo d-20 a d-5: completed_1, completed_2 (d-15), cancelled_1 (d-15), no_show_1 (d-10) = 4
    // confirmed_1 (d+30) fica fora do intervalo
    expect(sala!.totalAppointments).toBeGreaterThanOrEqual(4);
    // confirmed_1 (d+30) NÃO deve ser contado
    // O total máximo esperado no intervalo é 4 (exatamente os inseridos entre d-20 e d-5)
    expect(sala!.totalAppointments).toBeLessThanOrEqual(4);
  });

  // ── Validações ────────────────────────────────────────────────────────────

  it("endDate < startDate → 400", async () => {
    const res = await request
      .get("/api/reports/resources")
      .set("Cookie", adminCookie)
      .query({ startDate: "2026-08-10", endDate: "2026-08-01" });
    expect(res.status).toBe(400);
  });
});
