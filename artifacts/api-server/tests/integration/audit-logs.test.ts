/**
 * Testes de integração — F5.7 — GET /api/audit-logs
 *
 * Cobre: RBAC (ADMIN/PROFESSIONAL/CLIENT/anon), filtros (action, entityType,
 * entityId, userId, startDate, endDate), paginação (page, limit), validações
 * de query params (UUIDs inválidos, page<1, limit>100, endDate<startDate).
 *
 * Fonte documental: Doc 16 §53, Doc 17 FASE 17, RN-063, RN-064.
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

let ids: TestUsers;
let extras: AppointmentTestExtras;
let adminCookie: string;
let profCookie: string;
let clientCookie: string;

/** Slot futuro simples para criação de appointments que geram audit logs. */
let auditSlotCounter = 0;
function auditSlot(): string {
  const dayOffset = 5 + Math.floor(auditSlotCounter / 4);
  const hour = 10 + (auditSlotCounter % 4);
  auditSlotCounter += 1;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** ID de appointment criado no beforeAll — usado para filtrar por entityId. */
let auditAppointmentId: string;
/** ID do usuário admin — usado para filtrar por userId. */
let adminUserId: string;

beforeAll(async () => {
  ids = await seedTestData();
  extras = await seedAppointmentExtras(ids);
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);

  // Criar um appointment como CLIENT para gerar APPOINTMENT_CREATED no audit log
  const res = await request
    .post("/api/appointments")
    .set("Cookie", clientCookie)
    .send({
      professionalId: ids.professionalId,
      serviceId: ids.serviceId,
      startDatetime: auditSlot(),
      modality: "IN_PERSON",
    });
  expect(res.status).toBe(201);
  auditAppointmentId = res.body.appointment.id as string;

  // Recuperar userId do admin via /api/auth/me ou GET /api/appointments — não há
  // endpoint de perfil exposto, então buscamos via audit log já gerado.
  const logsRes = await request
    .get("/api/audit-logs")
    .set("Cookie", adminCookie)
    .query({ entityId: auditAppointmentId });
  expect(logsRes.status).toBe(200);
  adminUserId = (logsRes.body.data[0] as { userId: string }).userId;
});

afterAll(async () => {
  await cleanTestData();
});

// ─── Acesso e RBAC ─────────────────────────────────────────────────────────

describe("GET /api/audit-logs — RBAC", () => {
  it("ADMIN acessa sem filtros → 200 com estrutura correta", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(typeof res.body.pagination.page).toBe("number");
    expect(typeof res.body.pagination.limit).toBe("number");
    expect(typeof res.body.pagination.total).toBe("number");
    expect(typeof res.body.pagination.totalPages).toBe("number");
    // Deve haver ao menos 1 log (gerado pelo beforeAll)
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("CLIENT tenta acessar → 403", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", clientCookie);

    expect(res.status).toBe(403);
  });

  it("PROFESSIONAL tenta acessar → 403", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", profCookie);

    expect(res.status).toBe(403);
  });

  it("sem autenticação → 401", async () => {
    const res = await request.get("/api/audit-logs");

    expect(res.status).toBe(401);
  });
});

// ─── Filtros ───────────────────────────────────────────────────────────────

describe("GET /api/audit-logs — filtros", () => {
  it("filtro por action=APPOINTMENT_CREATED → somente logs dessa action", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ action: "APPOINTMENT_CREATED" });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const log of res.body.data as { action: string }[]) {
      expect(log.action).toBe("APPOINTMENT_CREATED");
    }
  });

  it("filtro por entityType=appointments → somente logs de appointments", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ entityType: "appointments" });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const log of res.body.data as { entityType: string }[]) {
      expect(log.entityType).toBe("appointments");
    }
  });

  it("filtro por entityId → somente logs daquele appointment", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ entityId: auditAppointmentId });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const log of res.body.data as { entityId: string }[]) {
      expect(log.entityId).toBe(auditAppointmentId);
    }
  });

  it("filtro por userId → somente logs daquele usuário", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ userId: adminUserId });

    expect(res.status).toBe(200);
    // Pode haver 0 se o admin não gerou nenhum log além do beforeAll
    // — mas o beforeAll cria o appointment via CLIENT, não ADMIN.
    // Apenas verificamos que os logs retornados pertencem ao userId filtrado.
    for (const log of res.body.data as { userId: string }[]) {
      expect(log.userId).toBe(adminUserId);
    }
  });

  it("filtro por startDate e endDate → somente logs no período", async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 60_000).toISOString(); // -1 min
    const end = new Date(now.getTime() + 60_000).toISOString();   // +1 min

    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ startDate: start, endDate: end });

    expect(res.status).toBe(200);
    // Todos os logs criados no beforeAll estão dentro do período
    for (const log of res.body.data as { createdAt: string }[]) {
      const ts = new Date(log.createdAt).getTime();
      expect(ts).toBeGreaterThanOrEqual(new Date(start).getTime());
      expect(ts).toBeLessThanOrEqual(new Date(end).getTime());
    }
  });

  it("action inexistente retorna data vazia", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ action: "ACAO_INEXISTENTE_XYZ_9999" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });
});

// ─── Paginação ─────────────────────────────────────────────────────────────

describe("GET /api/audit-logs — paginação", () => {
  it("defaults: page=1, limit=20 aplicados quando não fornecidos", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
  });

  it("page=1&limit=1 retorna no máximo 1 item, totalPages calculado corretamente", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ page: 1, limit: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.limit).toBe(1);
    const expected = Math.ceil(res.body.pagination.total / 1);
    expect(res.body.pagination.totalPages).toBe(expected);
  });

  it("oldData e newData retornados completos na resposta", async () => {
    // O log de APPOINTMENT_CREATED deve ter newData com os campos do appointment
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ action: "APPOINTMENT_CREATED", entityId: auditAppointmentId });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const log = res.body.data[0] as { newData: unknown; oldData: unknown };
    // newData deve existir (appointment criado)
    expect(log.newData).toBeDefined();
    // oldData pode ser null para criação
    expect("oldData" in log).toBe(true);
  });

  it("resultado ordenado por createdAt DESC", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    const data = res.body.data as { createdAt: string }[];
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1]!.createdAt).getTime();
      const curr = new Date(data[i]!.createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});

// ─── Validações de query params ────────────────────────────────────────────

describe("GET /api/audit-logs — validações", () => {
  it("page=0 → 400", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ page: 0 });

    expect(res.status).toBe(400);
  });

  it("limit=0 → 400", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ limit: 0 });

    expect(res.status).toBe(400);
  });

  it("limit=200 (acima do máximo de 100) → 400", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ limit: 200 });

    expect(res.status).toBe(400);
  });

  it("entityId não-UUID → 400", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ entityId: "nao-e-um-uuid" });

    expect(res.status).toBe(400);
  });

  it("userId não-UUID → 400", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({ userId: "invalido" });

    expect(res.status).toBe(400);
  });

  it("endDate < startDate → 400", async () => {
    const res = await request
      .get("/api/audit-logs")
      .set("Cookie", adminCookie)
      .query({
        startDate: "2026-12-31T23:59:59Z",
        endDate: "2026-01-01T00:00:00Z",
      });

    expect(res.status).toBe(400);
  });
});
