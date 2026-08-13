/**
 * Testes de integração — F8 — Notificações
 *
 * Cobre: RBAC, IDOR, estrutura de resposta, paginação, filtro unread,
 * marcação como lida (idempotente), geração de notificações por evento
 * (create / cancel / alter / complete), e validações de query/params.
 *
 * Fonte documental: Doc 16 §46-47, Doc 17 §43, Doc 18 §38, RN-087.
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
import { notifications, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const { db: testDb } = getDatabaseClient();

// ─── Estado compartilhado ─────────────────────────────────────────────────

let ids: TestUsers;
let extras: AppointmentTestExtras;
let adminCookie: string;
let profCookie: string;
let clientCookie: string;

/** Notificação criada para o CLIENT via criação de appointment no beforeAll. */
let clientNotifId: string;
/** Notificação criada para o PROFESSIONAL via criação de appointment no beforeAll. */
let profNotifId: string;
/** Notificação seeded diretamente para o ADMIN (ADMIN não recebe notifs de appointment). */
let adminNotifId: string;

// ─── Slot counter (cada chamada retorna slot único no futuro) ─────────────

let slotCounter = 0;
function nextSlot(): string {
  const dayOffset = 5 + Math.floor(slotCounter / 4);
  const hour = 10 + (slotCounter % 4);
  slotCounter += 1;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────

beforeAll(async () => {
  ids = await seedTestData();
  extras = await seedAppointmentExtras(ids);

  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);

  // Criar appointment como CLIENT → gera APPOINTMENT_CONFIRMED (client) + NEW_APPOINTMENT_RECEIVED (prof)
  const apptRes = await request
    .post("/api/appointments")
    .set("Cookie", clientCookie)
    .send({
      professionalId: ids.professionalId,
      serviceId: ids.serviceId,
      startDatetime: nextSlot(),
      modality: "IN_PERSON",
    });
  expect(apptRes.status, "beforeAll: criar appointment para gerar notificações").toBe(201);

  // Buscar notificação do CLIENT
  const clientNotifRes = await request
    .get("/api/notifications")
    .set("Cookie", clientCookie);
  expect(clientNotifRes.status, "beforeAll: GET notifs CLIENT").toBe(200);
  const clientData = clientNotifRes.body.data as Array<{ id: string; type: string }>;
  const clientConfirmed = clientData.find((n) => n.type === "APPOINTMENT_CONFIRMED");
  expect(clientConfirmed, "beforeAll: CLIENT deve ter APPOINTMENT_CONFIRMED").toBeDefined();
  clientNotifId = clientConfirmed!.id;

  // Buscar notificação do PROFESSIONAL
  const profNotifRes = await request
    .get("/api/notifications")
    .set("Cookie", profCookie);
  expect(profNotifRes.status, "beforeAll: GET notifs PROF").toBe(200);
  const profData = profNotifRes.body.data as Array<{ id: string; type: string }>;
  const profReceived = profData.find((n) => n.type === "NEW_APPOINTMENT_RECEIVED");
  expect(profReceived, "beforeAll: PROFESSIONAL deve ter NEW_APPOINTMENT_RECEIVED").toBeDefined();
  profNotifId = profReceived!.id;

  // Seed notificação diretamente para ADMIN (ADMIN não recebe notifs de appointment)
  const [adminNotif] = await testDb
    .insert(notifications)
    .values({
      userId: ids.adminId,
      type: "SYSTEM",
      title: "Notificação de sistema",
      message: "Mensagem de teste para o admin.",
    })
    .returning({ id: notifications.id });
  adminNotifId = adminNotif!.id;
});

afterAll(async () => {
  await cleanTestData();
});

// ─── RBAC — GET /api/notifications ───────────────────────────────────────

describe("GET /api/notifications — RBAC", () => {
  it("ADMIN autenticado → 200", async () => {
    const res = await request.get("/api/notifications").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });

  it("PROFESSIONAL autenticado → 200", async () => {
    const res = await request.get("/api/notifications").set("Cookie", profCookie);
    expect(res.status).toBe(200);
  });

  it("CLIENT autenticado → 200", async () => {
    const res = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
  });

  it("sem autenticação → 401", async () => {
    const res = await request.get("/api/notifications");
    expect(res.status).toBe(401);
  });
});

// ─── RBAC — POST /api/notifications/:id/read ─────────────────────────────

describe("POST /api/notifications/:id/read — RBAC", () => {
  it("ADMIN marca própria notificação → 200", async () => {
    const res = await request
      .post(`/api/notifications/${adminNotifId}/read`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.notification).toBeDefined();
    expect(res.body.notification.id).toBe(adminNotifId);
    expect(res.body.notification.readAt).toBeTruthy();
  });

  it("PROFESSIONAL marca própria notificação → 200", async () => {
    const res = await request
      .post(`/api/notifications/${profNotifId}/read`)
      .set("Cookie", profCookie);
    expect(res.status).toBe(200);
    expect(res.body.notification.id).toBe(profNotifId);
    expect(res.body.notification.readAt).toBeTruthy();
  });

  it("CLIENT marca própria notificação → 200", async () => {
    const res = await request
      .post(`/api/notifications/${clientNotifId}/read`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.notification.id).toBe(clientNotifId);
    expect(res.body.notification.readAt).toBeTruthy();
  });

  it("sem autenticação → 401", async () => {
    const res = await request.post(`/api/notifications/${clientNotifId}/read`);
    expect(res.status).toBe(401);
  });
});

// ─── IDOR — GET /api/notifications ───────────────────────────────────────

describe("GET /api/notifications — IDOR", () => {
  it("CLIENT vê apenas as próprias notificações — não vê as do PROFESSIONAL", async () => {
    const res = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    const ids_returned = (res.body.data as Array<{ id: string }>).map((n) => n.id);
    // ID da notificação do PROFESSIONAL não deve aparecer na lista do CLIENT
    expect(ids_returned).not.toContain(profNotifId);
  });

  it("PROFESSIONAL vê apenas as próprias notificações — não vê as do CLIENT", async () => {
    const res = await request.get("/api/notifications").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const ids_returned = (res.body.data as Array<{ id: string }>).map((n) => n.id);
    // ID da notificação do CLIENT não deve aparecer na lista do PROFESSIONAL
    expect(ids_returned).not.toContain(clientNotifId);
  });
});

// ─── IDOR — POST /api/notifications/:id/read ─────────────────────────────

describe("POST /api/notifications/:id/read — IDOR", () => {
  it("CLIENT tenta marcar notificação do PROFESSIONAL → 403", async () => {
    // Criar nova notificação para PROF (a anterior pode já estar lida)
    const [newProfNotif] = await testDb
      .insert(notifications)
      .values({
        userId: ids.professionalUserId,
        type: "NEW_APPOINTMENT_RECEIVED",
        title: "Teste IDOR",
        message: "Mensagem de teste.",
      })
      .returning({ id: notifications.id });

    const res = await request
      .post(`/api/notifications/${newProfNotif!.id}/read`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });

  it("PROFESSIONAL tenta marcar notificação do CLIENT → 403", async () => {
    const [newClientNotif] = await testDb
      .insert(notifications)
      .values({
        userId: ids.clientUserId,
        type: "APPOINTMENT_CONFIRMED",
        title: "Teste IDOR",
        message: "Mensagem de teste.",
      })
      .returning({ id: notifications.id });

    const res = await request
      .post(`/api/notifications/${newClientNotif!.id}/read`)
      .set("Cookie", profCookie);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/notifications — estrutura e happy path ─────────────────────

describe("GET /api/notifications — estrutura e happy path", () => {
  it("retorna os campos esperados na resposta", async () => {
    const res = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(res.status).toBe(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(typeof res.body.pagination.page).toBe("number");
    expect(typeof res.body.pagination.limit).toBe("number");
    expect(typeof res.body.pagination.total).toBe("number");
    expect(typeof res.body.pagination.totalPages).toBe("number");

    // Verificar campos de uma notificação existente
    const notif = res.body.data[0] as Record<string, unknown>;
    expect(notif).toHaveProperty("id");
    expect(notif).toHaveProperty("type");
    expect(notif).toHaveProperty("title");
    expect(notif).toHaveProperty("message");
    expect(notif).toHaveProperty("appointmentId");
    expect(notif).toHaveProperty("readAt");
    expect(notif).toHaveProperty("createdAt");
  });

  it("notificações não lidas têm readAt = null", async () => {
    // Criar nova notificação não lida para CLIENT
    const [unreadNotif] = await testDb
      .insert(notifications)
      .values({
        userId: ids.clientUserId,
        type: "APPOINTMENT_CONFIRMED",
        title: "Não lida",
        message: "Esta notificação não está lida.",
      })
      .returning({ id: notifications.id });

    const res = await request
      .get("/api/notifications")
      .set("Cookie", clientCookie)
      .query({ unread: "true" });
    expect(res.status).toBe(200);

    const found = (res.body.data as Array<{ id: string; readAt: unknown }>).find(
      (n) => n.id === unreadNotif!.id,
    );
    expect(found).toBeDefined();
    expect(found!.readAt).toBeNull();
  });

  it("notificações lidas têm readAt preenchido", async () => {
    // clientNotifId foi marcado como lido nos testes RBAC acima
    const res = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(res.status).toBe(200);

    const lida = (res.body.data as Array<{ id: string; readAt: unknown }>).find(
      (n) => n.id === clientNotifId,
    );
    expect(lida).toBeDefined();
    expect(lida!.readAt).not.toBeNull();
  });

  it("paginação: limit=1 retorna 1 item com totalPages correto", async () => {
    const allRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    const total = (allRes.body.pagination as { total: number }).total;

    const res = await request
      .get("/api/notifications")
      .set("Cookie", clientCookie)
      .query({ page: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.total).toBe(total);
    expect(res.body.pagination.totalPages).toBe(total);
  });

  it("filtro unread=true retorna apenas notificações com readAt = null", async () => {
    const res = await request
      .get("/api/notifications")
      .set("Cookie", clientCookie)
      .query({ unread: "true" });
    expect(res.status).toBe(200);

    const items = res.body.data as Array<{ readAt: unknown }>;
    for (const n of items) {
      expect(n.readAt).toBeNull();
    }
  });

  it("filtro unread=false retorna todas (lidas e não lidas)", async () => {
    const allRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    const unreadRes = await request
      .get("/api/notifications")
      .set("Cookie", clientCookie)
      .query({ unread: "false" });

    expect(unreadRes.status).toBe(200);
    // unread=false (sem filtro) deve retornar o mesmo total que sem parâmetro
    expect(unreadRes.body.pagination.total).toBe(allRes.body.pagination.total);
  });

  it("ordenação DESC: primeira notificação é a mais recente", async () => {
    const res = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(res.status).toBe(200);

    const items = res.body.data as Array<{ createdAt: string }>;
    if (items.length >= 2) {
      const first = new Date(items[0]!.createdAt).getTime();
      const second = new Date(items[1]!.createdAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });

  it("limit máximo aceito: limit=50 → 200", async () => {
    const res = await request
      .get("/api/notifications")
      .set("Cookie", clientCookie)
      .query({ limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(50);
  });
});

// ─── POST /api/notifications/:id/read — happy path ───────────────────────

describe("POST /api/notifications/:id/read — happy path", () => {
  let freshNotifId: string;

  beforeAll(async () => {
    // Criar notificação fresca para os testes de leitura
    const [n] = await testDb
      .insert(notifications)
      .values({
        userId: ids.clientUserId,
        type: "APPOINTMENT_CONFIRMED",
        title: "Leitura fresh",
        message: "Para testar marcação como lida.",
      })
      .returning({ id: notifications.id });
    freshNotifId = n!.id;
  });

  it("marca notificação como lida e retorna id + readAt", async () => {
    const res = await request
      .post(`/api/notifications/${freshNotifId}/read`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.notification.id).toBe(freshNotifId);
    expect(res.body.notification.readAt).toBeTruthy();
  });

  it("readAt foi persistido — GET confirma a leitura", async () => {
    const res = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(res.status).toBe(200);

    const found = (res.body.data as Array<{ id: string; readAt: unknown }>).find(
      (n) => n.id === freshNotifId,
    );
    expect(found).toBeDefined();
    expect(found!.readAt).not.toBeNull();
  });

  it("segunda chamada é idempotente — retorna 200 com mesmo readAt", async () => {
    const first = await request
      .post(`/api/notifications/${freshNotifId}/read`)
      .set("Cookie", clientCookie);
    expect(first.status).toBe(200);
    const firstReadAt = first.body.notification.readAt as string;

    const second = await request
      .post(`/api/notifications/${freshNotifId}/read`)
      .set("Cookie", clientCookie);
    expect(second.status).toBe(200);
    expect(second.body.notification.readAt).toBe(firstReadAt);
  });
});

// ─── Geração de notificações por evento de appointment ────────────────────

describe("Geração de notificações — eventos de appointment", () => {
  it("criar appointment → CLIENT recebe APPOINTMENT_CONFIRMED", async () => {
    const beforeRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    const beforeTotal = (beforeRes.body.pagination as { total: number }).total;

    await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });

    const afterRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    const types = (afterRes.body.data as Array<{ type: string }>).map((n) => n.type);
    expect(afterRes.body.pagination.total).toBeGreaterThan(beforeTotal);
    expect(types).toContain("APPOINTMENT_CONFIRMED");
  });

  it("criar appointment → PROFESSIONAL recebe NEW_APPOINTMENT_RECEIVED", async () => {
    const beforeRes = await request.get("/api/notifications").set("Cookie", profCookie);
    const beforeTotal = (beforeRes.body.pagination as { total: number }).total;

    await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });

    const afterRes = await request.get("/api/notifications").set("Cookie", profCookie);
    expect(afterRes.body.pagination.total).toBeGreaterThan(beforeTotal);
    const types = (afterRes.body.data as Array<{ type: string }>).map((n) => n.type);
    expect(types).toContain("NEW_APPOINTMENT_RECEIVED");
  });

  it("cancelar appointment → CLIENT recebe APPOINTMENT_CANCELLED", async () => {
    const apptRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });
    expect(apptRes.status).toBe(201);
    const apptId = (apptRes.body.appointment as { id: string }).id;

    const beforeRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    const beforeTotal = (beforeRes.body.pagination as { total: number }).total;

    await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", clientCookie)
      .send({ status: "CANCELLED" });

    const afterRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(afterRes.body.pagination.total).toBeGreaterThan(beforeTotal);
    const types = (afterRes.body.data as Array<{ type: string }>).map((n) => n.type);
    expect(types).toContain("APPOINTMENT_CANCELLED");
  });

  it("cancelar appointment → PROFESSIONAL recebe APPOINTMENT_CANCELLED", async () => {
    const apptRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });
    expect(apptRes.status).toBe(201);
    const apptId = (apptRes.body.appointment as { id: string }).id;

    const beforeRes = await request.get("/api/notifications").set("Cookie", profCookie);
    const beforeTotal = (beforeRes.body.pagination as { total: number }).total;

    await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", clientCookie)
      .send({ status: "CANCELLED" });

    const afterRes = await request.get("/api/notifications").set("Cookie", profCookie);
    expect(afterRes.body.pagination.total).toBeGreaterThan(beforeTotal);
    const types = (afterRes.body.data as Array<{ type: string }>).map((n) => n.type);
    expect(types).toContain("APPOINTMENT_CANCELLED");
  });

  it("alterar appointment → CLIENT recebe APPOINTMENT_ALTERED", async () => {
    const apptRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });
    expect(apptRes.status).toBe(201);
    const apptId = (apptRes.body.appointment as { id: string }).id;

    const beforeRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    const beforeTotal = (beforeRes.body.pagination as { total: number }).total;

    // ADMIN altera (ALTER operation — F5.6)
    await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", adminCookie)
      .send({ startDatetime: nextSlot() });

    const afterRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(afterRes.body.pagination.total).toBeGreaterThan(beforeTotal);
    const types = (afterRes.body.data as Array<{ type: string }>).map((n) => n.type);
    expect(types).toContain("APPOINTMENT_ALTERED");
  });

  it("alterar appointment → PROFESSIONAL recebe APPOINTMENT_ALTERED", async () => {
    const apptRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });
    expect(apptRes.status).toBe(201);
    const apptId = (apptRes.body.appointment as { id: string }).id;

    const beforeRes = await request.get("/api/notifications").set("Cookie", profCookie);
    const beforeTotal = (beforeRes.body.pagination as { total: number }).total;

    await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", adminCookie)
      .send({ startDatetime: nextSlot() });

    const afterRes = await request.get("/api/notifications").set("Cookie", profCookie);
    expect(afterRes.body.pagination.total).toBeGreaterThan(beforeTotal);
    const types = (afterRes.body.data as Array<{ type: string }>).map((n) => n.type);
    expect(types).toContain("APPOINTMENT_ALTERED");
  });

  it("concluir appointment → CLIENT recebe APPOINTMENT_COMPLETED", async () => {
    const apptRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });
    expect(apptRes.status).toBe(201);
    const apptId = (apptRes.body.appointment as { id: string }).id;

    // Transição: CONFIRMED → IN_PROGRESS → COMPLETED
    await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", profCookie)
      .send({ status: "IN_PROGRESS" });

    const beforeRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    const beforeTotal = (beforeRes.body.pagination as { total: number }).total;

    await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", profCookie)
      .send({ status: "COMPLETED" });

    const afterRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(afterRes.body.pagination.total).toBeGreaterThan(beforeTotal);
    const types = (afterRes.body.data as Array<{ type: string }>).map((n) => n.type);
    expect(types).toContain("APPOINTMENT_COMPLETED");
  });

  it("concluir appointment → PROFESSIONAL NÃO recebe APPOINTMENT_COMPLETED", async () => {
    const apptRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });
    expect(apptRes.status).toBe(201);
    const apptId = (apptRes.body.appointment as { id: string }).id;

    await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", profCookie)
      .send({ status: "IN_PROGRESS" });

    const beforeRes = await request.get("/api/notifications").set("Cookie", profCookie);
    const beforeCount = (beforeRes.body.pagination as { total: number }).total;

    await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", profCookie)
      .send({ status: "COMPLETED" });

    const afterRes = await request.get("/api/notifications").set("Cookie", profCookie);
    // Contagem não deve aumentar (PROFESSIONAL não recebe COMPLETED)
    expect(afterRes.body.pagination.total).toBe(beforeCount);
  });

  it("ADMIN não recebe notificações de appointment criado", async () => {
    const beforeRes = await request.get("/api/notifications").set("Cookie", adminCookie);
    const beforeTotal = (beforeRes.body.pagination as { total: number }).total;

    await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: nextSlot(),
        modality: "IN_PERSON",
      });

    const afterRes = await request.get("/api/notifications").set("Cookie", adminCookie);
    // Total não deve aumentar (ADMIN não é destinatário)
    expect(afterRes.body.pagination.total).toBe(beforeTotal);
  });
});

// ─── Validações ───────────────────────────────────────────────────────────

describe("GET /api/notifications — validações de query params", () => {
  it("unread com valor inválido → 400", async () => {
    const res = await request
      .get("/api/notifications")
      .set("Cookie", clientCookie)
      .query({ unread: "maybe" });
    expect(res.status).toBe(400);
  });

  it("page=0 → 400", async () => {
    const res = await request
      .get("/api/notifications")
      .set("Cookie", clientCookie)
      .query({ page: 0 });
    expect(res.status).toBe(400);
  });

  it("limit=51 → 400", async () => {
    const res = await request
      .get("/api/notifications")
      .set("Cookie", clientCookie)
      .query({ limit: 51 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/notifications/:id/read — validações", () => {
  it("UUID inválido no path → 400", async () => {
    const res = await request
      .post("/api/notifications/nao-e-uuid/read")
      .set("Cookie", clientCookie);
    expect(res.status).toBe(400);
  });

  it("UUID válido mas inexistente → 404", async () => {
    const res = await request
      .post("/api/notifications/00000000-0000-0000-0000-000000000000/read")
      .set("Cookie", clientCookie);
    expect(res.status).toBe(404);
  });
});

// ─── IDOR CLIENT A × CLIENT B — Saneamento Pré-F16 ────────────────────────
// Cobre explicitamente o cenário de dois usuários com o MESMO papel (CLIENT),
// complementando os testes IDOR cross-role acima. Apenas QA — nenhuma
// alteração de código de produção.

describe("IDOR CLIENT A × CLIENT B — Saneamento Pré-F16", () => {
  const clientBPassword = "SenhaForte123!";
  let clientBEmail: string;
  let clientBCookie: string;
  let clientBNotifId: string;

  beforeAll(async () => {
    // Criar CLIENT B via ADMIN (mesmo padrão de clients.test.ts)
    clientBEmail = `client-b-notif-idor-${Date.now()}@fluir.test`;
    const created = await request
      .post("/api/clients")
      .set("Cookie", adminCookie)
      .send({
        name: "Client B IDOR Notificações",
        email: clientBEmail,
        password: clientBPassword,
      });
    expect(created.status, "beforeAll: criar CLIENT B").toBe(201);
    clientBCookie = await loginAs(clientBEmail, clientBPassword);

    // Semear notificação pertencente ao CLIENT B
    const [userB] = await testDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, clientBEmail));
    expect(userB, "beforeAll: user do CLIENT B deve existir").toBeDefined();

    const [notifB] = await testDb
      .insert(notifications)
      .values({
        userId: userB!.id,
        type: "SYSTEM",
        title: "Notificação do CLIENT B",
        message: "Pertence exclusivamente ao CLIENT B.",
      })
      .returning({ id: notifications.id });
    clientBNotifId = notifB!.id;
  });

  it("Caso 1 — CLIENT A não vê notificações do CLIENT B na listagem", async () => {
    // CLIENT B vê a própria notificação
    const resB = await request.get("/api/notifications").set("Cookie", clientBCookie);
    expect(resB.status).toBe(200);
    const idsB = (resB.body.data as Array<{ id: string }>).map((n) => n.id);
    expect(idsB).toContain(clientBNotifId);

    // CLIENT A não vê a notificação do CLIENT B
    const resA = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(resA.status).toBe(200);
    const idsA = (resA.body.data as Array<{ id: string }>).map((n) => n.id);
    expect(idsA).not.toContain(clientBNotifId);
  });

  it("Caso 2 — CLIENT A tenta marcar notificação do CLIENT B como lida → 403", async () => {
    const res = await request
      .post(`/api/notifications/${clientBNotifId}/read`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });

  it("Caso 3 — CLIENT A continua acessando e marcando as próprias notificações", async () => {
    // Semear notificação nova para o CLIENT A
    const [notifA] = await testDb
      .insert(notifications)
      .values({
        userId: ids.clientUserId,
        type: "SYSTEM",
        title: "Notificação do CLIENT A",
        message: "Pertence ao CLIENT A.",
      })
      .returning({ id: notifications.id });

    // Acessa
    const listRes = await request.get("/api/notifications").set("Cookie", clientCookie);
    expect(listRes.status).toBe(200);
    const idsA = (listRes.body.data as Array<{ id: string }>).map((n) => n.id);
    expect(idsA).toContain(notifA!.id);

    // Marca como lida
    const readRes = await request
      .post(`/api/notifications/${notifA!.id}/read`)
      .set("Cookie", clientCookie);
    expect(readRes.status).toBe(200);
    expect(readRes.body.notification.readAt).toBeTruthy();
  });
});
