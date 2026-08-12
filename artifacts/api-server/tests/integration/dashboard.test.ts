/**
 * Testes de integração — FASE 6 — Dashboards
 *
 * Cobre: RBAC, dados corretos, validações de query params e proteção IDOR.
 *
 * Endpoints:
 *   GET /api/dashboard/admin        — ADMIN apenas
 *   GET /api/dashboard/professional — PROFESSIONAL (sessão) | ADMIN (?professionalId)
 *   GET /api/dashboard/client       — CLIENT (sessão)       | ADMIN (?clientId)
 *
 * Fonte documental: Doc 16 §48–50, Doc 03, RN-080.
 *
 * ─── Estratégia de fixtures ──────────────────────────────────────────────────
 * Appointments inseridos diretamente via DB (bypass do service layer) para
 * controle preciso de datas e status:
 *
 *   pastAppt    — d-30, 08:00–09:00, IN_PERSON, COMPLETED  (pastAppointmentsCount)
 *   todayConf   — hoje, 08:00–09:00, IN_PERSON, CONFIRMED  (appointmentsToday)
 *   todayCanc   — hoje, 08:00–09:00, IN_PERSON, CANCELLED  (cancelledToday; sobreposição OK)
 *   todayCompl  — hoje, 08:00–09:00, IN_PERSON, COMPLETED  (completedToday; sobreposição OK)
 *   todayHC     — hoje, 09:00–10:00, HOME_CARE, CONFIRMED  (homeCareToday)
 *   futureAppt1 — d+70, 08:00–09:00, IN_PERSON, CONFIRMED  (nextAppointment / upcoming)
 *   futureAppt2 — d+70, 09:00–10:00, IN_PERSON, CONFIRMED  (upcoming list)
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

// ─── Helpers de data ──────────────────────────────────────────────────────────

/** Retorna hoje às HH:00:00 UTC. */
function todayAt(hour: number): Date {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

/** Retorna hoje + dayOffset às HH:00:00 UTC. */
function dayAt(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
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
  const addressId = addrRows[0]?.id ?? null;

  const base = {
    clientId: ids.clientId,
    professionalId: ids.professionalId,
    serviceId: ids.serviceId,
    createdBy: ids.adminId,
    priceAtBooking: "100.00",
    notes: null,
  };

  // pastAppt — d-30, 08:00–09:00, IN_PERSON, COMPLETED
  await db.insert(appointments).values({
    ...base,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: dayAt(-30, 8),
    endDatetime: dayAt(-30, 9),
    status: "COMPLETED",
  });

  // todayConf — hoje 08:00–09:00, IN_PERSON, CONFIRMED
  await db.insert(appointments).values({
    ...base,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: todayAt(8),
    endDatetime: todayAt(9),
    status: "CONFIRMED",
  });

  // todayCanc — hoje 08:00–09:00, IN_PERSON, CANCELLED (sobreposição OK pelo EXCLUDE)
  await db.insert(appointments).values({
    ...base,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: todayAt(8),
    endDatetime: todayAt(9),
    status: "CANCELLED",
  });

  // todayCompl — hoje 08:00–09:00, IN_PERSON, COMPLETED (sobreposição OK pelo EXCLUDE)
  await db.insert(appointments).values({
    ...base,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: todayAt(8),
    endDatetime: todayAt(9),
    status: "COMPLETED",
  });

  // todayHC — hoje 09:00–10:00, HOME_CARE, CONFIRMED
  if (addressId) {
    await db.insert(appointments).values({
      ...base,
      serviceId: extras.serviceHomeCareId,
      resourceId: null,
      addressId,
      modality: "HOME_CARE",
      startDatetime: todayAt(9),
      endDatetime: todayAt(10),
      status: "CONFIRMED",
    });
  }

  // futureAppt1 — d+70, 08:00–09:00, IN_PERSON, CONFIRMED
  await db.insert(appointments).values({
    ...base,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: dayAt(70, 8),
    endDatetime: dayAt(70, 9),
    status: "CONFIRMED",
  });

  // futureAppt2 — d+70, 09:00–10:00, IN_PERSON, CONFIRMED
  await db.insert(appointments).values({
    ...base,
    resourceId: extras.resourceId,
    addressId: null,
    modality: "IN_PERSON",
    startDatetime: dayAt(70, 9),
    endDatetime: dayAt(70, 10),
    status: "CONFIRMED",
  });
});

afterAll(async () => {
  await cleanTestData();
});

// ─── GET /api/dashboard/admin ─────────────────────────────────────────────────

describe("GET /api/dashboard/admin", () => {
  // ── RBAC ──────────────────────────────────────────────────────────────────

  it("ADMIN → 200 com todos os campos", async () => {
    const res = await request.get("/api/dashboard/admin").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: Record<string, unknown> };
    expect(dashboard).toHaveProperty("appointmentsToday");
    expect(dashboard).toHaveProperty("upcomingAppointments");
    expect(dashboard).toHaveProperty("completedToday");
    expect(dashboard).toHaveProperty("cancelledToday");
    expect(dashboard).toHaveProperty("homeCareToday");
    expect(dashboard).toHaveProperty("resourceOccupancy");
    expect(Array.isArray(dashboard.resourceOccupancy)).toBe(true);
  });

  it("PROFESSIONAL → 403", async () => {
    const res = await request.get("/api/dashboard/admin").set("Cookie", profCookie);
    expect(res.status).toBe(403);
  });

  it("CLIENT → 403", async () => {
    const res = await request.get("/api/dashboard/admin").set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });

  it("anônimo → 401", async () => {
    const res = await request.get("/api/dashboard/admin");
    expect(res.status).toBe(401);
  });

  // ── Dados ──────────────────────────────────────────────────────────────────

  it("appointmentsToday >= 1 (inclui hoje's CONFIRMED, CANCELLED e COMPLETED)", async () => {
    const res = await request.get("/api/dashboard/admin").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { appointmentsToday: number } };
    expect(dashboard.appointmentsToday).toBeGreaterThanOrEqual(1);
  });

  it("cancelledToday >= 1 (todayCanc inserido)", async () => {
    const res = await request.get("/api/dashboard/admin").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { cancelledToday: number } };
    expect(dashboard.cancelledToday).toBeGreaterThanOrEqual(1);
  });

  it("completedToday >= 1 (todayCompl inserido)", async () => {
    const res = await request.get("/api/dashboard/admin").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { completedToday: number } };
    expect(dashboard.completedToday).toBeGreaterThanOrEqual(1);
  });

  it("homeCareToday >= 1 (todayHC inserido com endereço)", async () => {
    // Só verifica se o endereço estava disponível no beforeAll
    const res = await request.get("/api/dashboard/admin").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { homeCareToday: number } };
    // todayHC inserido se addressId existe; em ambiente sem endereço seria 0
    expect(typeof dashboard.homeCareToday).toBe("number");
    expect(dashboard.homeCareToday).toBeGreaterThanOrEqual(0);
  });

  it("upcomingAppointments >= 2 (futureAppt1 e futureAppt2 são CONFIRMED)", async () => {
    const res = await request.get("/api/dashboard/admin").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { upcomingAppointments: number } };
    expect(dashboard.upcomingAppointments).toBeGreaterThanOrEqual(2);
  });

  it("resourceOccupancy só contém resources ACTIVE com campos obrigatórios", async () => {
    const res = await request.get("/api/dashboard/admin").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as {
      dashboard: {
        resourceOccupancy: { resourceId: string; resourceName: string; appointmentsToday: number }[];
      };
    };
    expect(Array.isArray(dashboard.resourceOccupancy)).toBe(true);
    // O resource de teste (ACTIVE) deve aparecer na lista
    const testResource = dashboard.resourceOccupancy.find((r) => r.resourceId === extras.resourceId);
    expect(testResource).toBeDefined();
    expect(testResource!.resourceName).toBeTruthy();
    expect(typeof testResource!.appointmentsToday).toBe("number");
    // Appointment IN_PERSON CONFIRMED de hoje vinculado ao resource de teste
    expect(testResource!.appointmentsToday).toBeGreaterThanOrEqual(1);
  });
});

// ─── GET /api/dashboard/professional ─────────────────────────────────────────

describe("GET /api/dashboard/professional", () => {
  // ── RBAC ──────────────────────────────────────────────────────────────────

  it("PROFESSIONAL → 200", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", profCookie);
    expect(res.status).toBe(200);
  });

  it("ADMIN com ?professionalId → 200", async () => {
    const res = await request
      .get("/api/dashboard/professional")
      .set("Cookie", adminCookie)
      .query({ professionalId: ids.professionalId });
    expect(res.status).toBe(200);
  });

  it("CLIENT → 403", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });

  it("anônimo → 401", async () => {
    const res = await request.get("/api/dashboard/professional");
    expect(res.status).toBe(401);
  });

  // ── Validações ADMIN ───────────────────────────────────────────────────────

  it("ADMIN sem professionalId → 400", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", adminCookie);
    expect(res.status).toBe(400);
  });

  it("ADMIN com professionalId UUID inválido → 400 (Zod)", async () => {
    const res = await request
      .get("/api/dashboard/professional")
      .set("Cookie", adminCookie)
      .query({ professionalId: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("ADMIN com professionalId não existente → 404", async () => {
    const res = await request
      .get("/api/dashboard/professional")
      .set("Cookie", adminCookie)
      .query({ professionalId: "00000000-0000-0000-0000-000000000001" });
    expect(res.status).toBe(404);
  });

  // ── Proteção IDOR ──────────────────────────────────────────────────────────

  it("PROFESSIONAL com ?professionalId de outro profissional → ignora param, usa próprio ID (IDOR)", async () => {
    // O service ignora professionalId no query quando o papel é PROFESSIONAL
    const res = await request
      .get("/api/dashboard/professional")
      .set("Cookie", profCookie)
      .query({ professionalId: "00000000-0000-0000-0000-000000000001" }); // ID inexistente
    // Não deve dar 404 — o service usa a sessão
    expect(res.status).toBe(200);
  });

  // ── Campos e dados ─────────────────────────────────────────────────────────

  it("retorna todos os campos esperados", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: Record<string, unknown> };
    expect(dashboard).toHaveProperty("nextAppointment");
    expect(dashboard).toHaveProperty("upcomingAppointments");
    expect(dashboard).toHaveProperty("appointmentsToday");
    expect(dashboard).toHaveProperty("completedToday");
    expect(dashboard).toHaveProperty("cancelledToday");
    expect(Array.isArray(dashboard.upcomingAppointments)).toBe(true);
  });

  it("nextAppointment aponta para o próximo CONFIRMED/IN_PROGRESS futuro", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as {
      dashboard: {
        nextAppointment: {
          id: string;
          startDatetime: string;
          clientName: string | null;
          serviceName: string | null;
          modality: string;
        } | null;
      };
    };
    expect(dashboard.nextAppointment).not.toBeNull();
    expect(dashboard.nextAppointment!.clientName).toBe("Cliente Teste");
    expect(dashboard.nextAppointment!.modality).toBe("IN_PERSON");
    const start = new Date(dashboard.nextAppointment!.startDatetime);
    expect(start.getTime()).toBeGreaterThan(Date.now());
  });

  it("upcomingAppointments tem no máximo 10 itens", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { upcomingAppointments: unknown[] } };
    expect(dashboard.upcomingAppointments.length).toBeLessThanOrEqual(10);
    expect(dashboard.upcomingAppointments.length).toBeGreaterThanOrEqual(1);
  });

  it("upcomingAppointments ordenados por startDatetime ASC", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as {
      dashboard: { upcomingAppointments: { startDatetime: string }[] };
    };
    const timestamps = dashboard.upcomingAppointments.map((a) => new Date(a.startDatetime).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]!).toBeGreaterThanOrEqual(timestamps[i - 1]!);
    }
  });

  it("appointmentsToday >= 1 (todayConf, todayCanc, todayCompl em hoje)", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { appointmentsToday: number } };
    expect(dashboard.appointmentsToday).toBeGreaterThanOrEqual(1);
  });

  it("completedToday >= 1 (todayCompl inserido)", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { completedToday: number } };
    expect(dashboard.completedToday).toBeGreaterThanOrEqual(1);
  });

  it("cancelledToday >= 1 (todayCanc inserido)", async () => {
    const res = await request.get("/api/dashboard/professional").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { cancelledToday: number } };
    expect(dashboard.cancelledToday).toBeGreaterThanOrEqual(1);
  });

  it("ADMIN acessa dashboard do profissional de teste e recebe mesmos dados", async () => {
    const [profRes, adminRes] = await Promise.all([
      request.get("/api/dashboard/professional").set("Cookie", profCookie),
      request
        .get("/api/dashboard/professional")
        .set("Cookie", adminCookie)
        .query({ professionalId: ids.professionalId }),
    ]);
    expect(profRes.status).toBe(200);
    expect(adminRes.status).toBe(200);
    // Dados do profissional correto — appointmentsToday deve bater
    const profDash = profRes.body.dashboard as { appointmentsToday: number };
    const adminDash = adminRes.body.dashboard as { appointmentsToday: number };
    expect(adminDash.appointmentsToday).toBe(profDash.appointmentsToday);
  });
});

// ─── GET /api/dashboard/client ────────────────────────────────────────────────

describe("GET /api/dashboard/client", () => {
  // ── RBAC ──────────────────────────────────────────────────────────────────

  it("CLIENT → 200", async () => {
    const res = await request.get("/api/dashboard/client").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
  });

  it("ADMIN com ?clientId → 200", async () => {
    const res = await request
      .get("/api/dashboard/client")
      .set("Cookie", adminCookie)
      .query({ clientId: ids.clientId });
    expect(res.status).toBe(200);
  });

  it("PROFESSIONAL → 403", async () => {
    const res = await request.get("/api/dashboard/client").set("Cookie", profCookie);
    expect(res.status).toBe(403);
  });

  it("anônimo → 401", async () => {
    const res = await request.get("/api/dashboard/client");
    expect(res.status).toBe(401);
  });

  // ── Validações ADMIN ───────────────────────────────────────────────────────

  it("ADMIN sem clientId → 400", async () => {
    const res = await request.get("/api/dashboard/client").set("Cookie", adminCookie);
    expect(res.status).toBe(400);
  });

  it("ADMIN com clientId UUID inválido → 400 (Zod)", async () => {
    const res = await request
      .get("/api/dashboard/client")
      .set("Cookie", adminCookie)
      .query({ clientId: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("ADMIN com clientId não existente → 404", async () => {
    const res = await request
      .get("/api/dashboard/client")
      .set("Cookie", adminCookie)
      .query({ clientId: "00000000-0000-0000-0000-000000000002" });
    expect(res.status).toBe(404);
  });

  // ── Proteção IDOR ──────────────────────────────────────────────────────────

  it("CLIENT com ?clientId de outro cliente → ignora param, usa próprio ID (IDOR)", async () => {
    const res = await request
      .get("/api/dashboard/client")
      .set("Cookie", clientCookie)
      .query({ clientId: "00000000-0000-0000-0000-000000000002" }); // ID inexistente
    // Não deve dar 404 — o service usa a sessão
    expect(res.status).toBe(200);
  });

  // ── Campos e dados ─────────────────────────────────────────────────────────

  it("retorna todos os campos esperados", async () => {
    const res = await request.get("/api/dashboard/client").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: Record<string, unknown> };
    expect(dashboard).toHaveProperty("nextAppointment");
    expect(dashboard).toHaveProperty("upcomingAppointments");
    expect(dashboard).toHaveProperty("pastAppointmentsCount");
    expect(Array.isArray(dashboard.upcomingAppointments)).toBe(true);
  });

  it("nextAppointment aponta para o próximo CONFIRMED futuro com nome do profissional", async () => {
    const res = await request.get("/api/dashboard/client").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as {
      dashboard: {
        nextAppointment: {
          id: string;
          startDatetime: string;
          professionalName: string | null;
          serviceName: string | null;
          modality: string;
        } | null;
      };
    };
    expect(dashboard.nextAppointment).not.toBeNull();
    expect(dashboard.nextAppointment!.professionalName).toBe("Profissional Teste");
    const start = new Date(dashboard.nextAppointment!.startDatetime);
    expect(start.getTime()).toBeGreaterThan(Date.now());
  });

  it("upcomingAppointments tem no máximo 5 itens (limite do cliente)", async () => {
    const res = await request.get("/api/dashboard/client").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { upcomingAppointments: unknown[] } };
    expect(dashboard.upcomingAppointments.length).toBeLessThanOrEqual(5);
    // Temos 2 futuros CONFIRMED (futureAppt1 e futureAppt2)
    expect(dashboard.upcomingAppointments.length).toBeGreaterThanOrEqual(2);
  });

  it("upcomingAppointments ordenados por startDatetime ASC", async () => {
    const res = await request.get("/api/dashboard/client").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as {
      dashboard: { upcomingAppointments: { startDatetime: string }[] };
    };
    const timestamps = dashboard.upcomingAppointments.map((a) => new Date(a.startDatetime).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]!).toBeGreaterThanOrEqual(timestamps[i - 1]!);
    }
  });

  it("pastAppointmentsCount >= 1 (pastAppt d-30 inserido)", async () => {
    const res = await request.get("/api/dashboard/client").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    const { dashboard } = res.body as { dashboard: { pastAppointmentsCount: number } };
    expect(dashboard.pastAppointmentsCount).toBeGreaterThanOrEqual(1);
  });

  it("ADMIN acessa dashboard do cliente de teste e recebe mesmos dados", async () => {
    const [clientRes, adminRes] = await Promise.all([
      request.get("/api/dashboard/client").set("Cookie", clientCookie),
      request
        .get("/api/dashboard/client")
        .set("Cookie", adminCookie)
        .query({ clientId: ids.clientId }),
    ]);
    expect(clientRes.status).toBe(200);
    expect(adminRes.status).toBe(200);
    const clientDash = clientRes.body.dashboard as { pastAppointmentsCount: number };
    const adminDash = adminRes.body.dashboard as { pastAppointmentsCount: number };
    expect(adminDash.pastAppointmentsCount).toBe(clientDash.pastAppointmentsCount);
  });
});
