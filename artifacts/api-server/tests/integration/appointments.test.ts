/**
 * Testes de integração do módulo de appointments.
 * Cobre: criação, listagem, GET por ID, cancelamento, status history, audit,
 * ownership, RBAC, price_at_booking, blocked periods, resource, address, UUID inválido.
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
import { auditLogs, appointmentStatusHistory } from "@workspace/db";
import { eq } from "drizzle-orm";

const { db } = getDatabaseClient();

let ids: TestUsers;
let extras: AppointmentTestExtras;
let adminCookie: string;
let profCookie: string;
let clientCookie: string;

/**
 * Gera um slot dentro da janela de disponibilidade (08:00–20:00 UTC) em um
 * dia futuro. Cada chamada retorna um horário diferente para evitar conflitos.
 *
 * Estratégia:
 * - Começa 2 dias no futuro (bem acima da antecedência mínima de 2h)
 * - Usa horas de início 10:00, 11:00, 12:00, 13:00 UTC (todas dentro de 08:00–20:00)
 * - Após 4 slots em um dia, avança para o dia seguinte
 * - Cada slot tem 1h de separação (60min de duração), sem sobreposição
 */
let slotCounter = 0;
function uniqueSlot(): string {
  const dayOffset = 2 + Math.floor(slotCounter / 4); // d+2, d+2, d+2, d+2, d+3, ...
  const hour = 10 + (slotCounter % 4);               // 10, 11, 12, 13, 10, 11, ...
  slotCounter += 1;

  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

beforeAll(async () => {
  ids = await seedTestData();
  extras = await seedAppointmentExtras(ids);
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);
});

afterAll(async () => {
  await cleanTestData();
});

// ─── POST /api/appointments ────────────────────────────────────────────────

describe("POST /api/appointments", () => {
  it("CLIENT cria agendamento IN_PERSON com sucesso (201)", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(201);
    expect(res.body.appointment).toBeDefined();
    expect(res.body.appointment.status).toBe("CONFIRMED");
    expect(res.body.appointment.clientId).toBe(ids.clientId);
    expect(res.body.appointment.modality).toBe("IN_PERSON");
    expect(res.body.appointment.resourceId).not.toBeNull();
    expect(res.body.appointment.addressId).toBeNull();
  });

  it("CLIENT cria agendamento HOME_CARE com sucesso (201)", async () => {
    // Buscar address do cliente
    const addrRes = await request
      .get(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", clientCookie);
    const addressId = addrRes.body.address?.id;
    expect(addressId).toBeDefined();

    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: extras.serviceHomeCareId,
        startDatetime: uniqueSlot(),
        modality: "HOME_CARE",
        addressId,
      });

    expect(res.status).toBe(201);
    expect(res.body.appointment.modality).toBe("HOME_CARE");
    expect(res.body.appointment.addressId).toBe(addressId);
    expect(res.body.appointment.resourceId).toBeNull();
  });

  it("price_at_booking é congelado no momento da criação", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(201);
    expect(res.body.appointment.priceAtBooking).toBe("100.00");
  });

  it("PROFESSIONAL não pode criar agendamento (403)", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", profCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(403);
  });

  it("sem autenticação retorna 401", async () => {
    const res = await request
      .post("/api/appointments")
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(401);
  });

  it("UUID inválido retorna 400", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: "nao-e-uuid",
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("payload inválido (sem startDatetime) retorna 400", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(400);
  });

  it("modality inválida ('REMOTE') retorna 400", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "REMOTE", // inválido — o banco usa "HOME_CARE"
      });

    expect(res.status).toBe(400);
  });

  it("HOME_CARE sem addressId retorna 400", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: extras.serviceHomeCareId,
        startDatetime: uniqueSlot(),
        modality: "HOME_CARE",
        // sem addressId — deve falhar com 400 antes de checar disponibilidade
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("serviço inativo retorna 400", async () => {
    await request
      .patch(`/api/services/${ids.serviceId}`)
      .set("Cookie", adminCookie)
      .send({ status: "INACTIVE" });

    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(400);

    // Reativar
    await request
      .patch(`/api/services/${ids.serviceId}`)
      .set("Cookie", adminCookie)
      .send({ status: "ACTIVE" });
  });

  it("professional_service não vinculado retorna 400", async () => {
    // Criar serviço sem vínculo com o profissional de teste
    const svcRes = await request
      .post("/api/services")
      .set("Cookie", adminCookie)
      .send({
        name: "Serviço Sem Vínculo",
        durationMinutes: 30,
        price: 50.0,          // number, não string
        allowedModalities: "IN_PERSON",
      });
    expect(svcRes.status).toBe(201);
    const newSvcId = svcRes.body.service.id;

    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: newSvcId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(400);

    // Cleanup do serviço criado
    await request.delete(`/api/services/${newSvcId}`).set("Cookie", adminCookie);
  });

  it("antecedência mínima não cumprida retorna 400", async () => {
    const tooSoon = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: tooSoon,
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(400);
  });

  it("ADMIN cria appointment fornecendo clientId (201)", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", adminCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
        clientId: ids.clientId,
      });

    expect(res.status).toBe(201);
    expect(res.body.appointment.clientId).toBe(ids.clientId);
  });

  it("ADMIN sem clientId retorna 400", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", adminCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
        // sem clientId para ADMIN
      });

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/appointments ─────────────────────────────────────────────────

describe("GET /api/appointments", () => {
  it("CLIENT vê apenas os próprios agendamentos", async () => {
    const res = await request.get("/api/appointments").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.appointments)).toBe(true);
    for (const a of res.body.appointments) {
      expect(a.clientId).toBe(ids.clientId);
    }
  });

  it("CLIENT não vê agendamentos de outro client mesmo passando ?clientId", async () => {
    const res = await request
      .get("/api/appointments?clientId=00000000-0000-0000-0000-000000000001")
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    for (const a of res.body.appointments) {
      expect(a.clientId).toBe(ids.clientId);
    }
  });

  it("PROFESSIONAL vê apenas os próprios agendamentos", async () => {
    const res = await request.get("/api/appointments").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    for (const a of res.body.appointments) {
      expect(a.professionalId).toBe(ids.professionalId);
    }
  });

  it("ADMIN vê todos", async () => {
    const res = await request.get("/api/appointments").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.appointments)).toBe(true);
    expect(res.body.appointments.length).toBeGreaterThan(0);
  });

  it("filtro por status funciona para ADMIN", async () => {
    const res = await request
      .get("/api/appointments?status=CONFIRMED")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    for (const a of res.body.appointments) {
      expect(a.status).toBe("CONFIRMED");
    }
  });

  it("sem autenticação retorna 401", async () => {
    const res = await request.get("/api/appointments");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/appointments/:id ─────────────────────────────────────────────

describe("GET /api/appointments/:id", () => {
  let appointmentId: string;

  beforeAll(async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(res.status).toBe(201);
    appointmentId = res.body.appointment.id;
  });

  it("CLIENT busca próprio agendamento (200)", async () => {
    const res = await request
      .get(`/api/appointments/${appointmentId}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.appointment.id).toBe(appointmentId);
  });

  it("PROFESSIONAL busca agendamento do próprio (200)", async () => {
    const res = await request
      .get(`/api/appointments/${appointmentId}`)
      .set("Cookie", profCookie);
    expect(res.status).toBe(200);
  });

  it("ADMIN busca qualquer agendamento (200)", async () => {
    const res = await request
      .get(`/api/appointments/${appointmentId}`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });

  it("UUID inválido retorna 400", async () => {
    const res = await request
      .get("/api/appointments/nao-uuid")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(400);
  });

  it("appointment inexistente retorna 404", async () => {
    const res = await request
      .get("/api/appointments/00000000-0000-0000-0000-000000000001")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH — cancelamento ──────────────────────────────────────────────────

describe("PATCH /api/appointments/:id — cancelamento", () => {
  let appointmentId: string;

  beforeAll(async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(res.status).toBe(201);
    appointmentId = res.body.appointment.id;
  });

  it("CLIENT cancela próprio agendamento CONFIRMED (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${appointmentId}`)
      .set("Cookie", clientCookie)
      .send({ status: "CANCELLED", reason: "Mudança de planos" });

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("CANCELLED");
  });

  it("não pode cancelar appointment já CANCELLED (400)", async () => {
    const res = await request
      .patch(`/api/appointments/${appointmentId}`)
      .set("Cookie", clientCookie)
      .send({ status: "CANCELLED" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ─── PATCH — mudança de status ─────────────────────────────────────────────

describe("PATCH /api/appointments/:id — mudança de status", () => {
  let appointmentId: string;

  beforeAll(async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(res.status).toBe(201);
    appointmentId = res.body.appointment.id;
  });

  it("CLIENT não pode marcar IN_PROGRESS (400)", async () => {
    const res = await request
      .patch(`/api/appointments/${appointmentId}`)
      .set("Cookie", clientCookie)
      .send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(400);
  });

  it("PROFESSIONAL marca CONFIRMED → IN_PROGRESS (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${appointmentId}`)
      .set("Cookie", profCookie)
      .send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("IN_PROGRESS");
  });

  it("PROFESSIONAL marca IN_PROGRESS → COMPLETED (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${appointmentId}`)
      .set("Cookie", profCookie)
      .send({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("COMPLETED");
  });

  it("COMPLETED não pode ser alterado (400)", async () => {
    const res = await request
      .patch(`/api/appointments/${appointmentId}`)
      .set("Cookie", adminCookie)
      .send({ status: "CANCELLED" });
    expect(res.status).toBe(400);
  });
});

// ─── Status history ────────────────────────────────────────────────────────

describe("GET /api/appointments/:id/history", () => {
  let appointmentId: string;

  beforeAll(async () => {
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    appointmentId = createRes.body.appointment.id;

    await request
      .patch(`/api/appointments/${appointmentId}`)
      .set("Cookie", clientCookie)
      .send({ status: "CANCELLED", reason: "Teste history" });
  });

  it("retorna histórico com pelo menos 2 entradas (CREATED + CANCELLED)", async () => {
    const res = await request
      .get(`/api/appointments/${appointmentId}/history`)
      .set("Cookie", clientCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThanOrEqual(2);

    const first = res.body.history[0];
    expect(first.oldStatus).toBeNull();
    expect(first.newStatus).toBe("CONFIRMED");

    const second = res.body.history[1];
    expect(second.oldStatus).toBe("CONFIRMED");
    expect(second.newStatus).toBe("CANCELLED");
    expect(second.reason).toBe("Teste history");
  });

  it("appointment inexistente retorna 404 no histórico", async () => {
    const res = await request
      .get("/api/appointments/00000000-0000-0000-0000-000000000001/history")
      .set("Cookie", clientCookie);
    expect(res.status).toBe(404);
  });
});

// ─── F5.2 — CONFIRMED → NO_SHOW (RN-054) ──────────────────────────────────

describe("PATCH /api/appointments/:id — CONFIRMED → NO_SHOW (F5.2 — RN-054)", () => {
  let apptProfId: string;   // appointment para testes do PROFESSIONAL
  let apptAdminId: string;  // appointment para teste do ADMIN
  let apptClientId: string; // appointment para teste de RBAC do CLIENT

  beforeAll(async () => {
    // Criar 3 appointments CONFIRMED independentes (slots diferentes)
    const [r1, r2, r3] = await Promise.all([
      request.post("/api/appointments").set("Cookie", clientCookie).send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      }),
      request.post("/api/appointments").set("Cookie", clientCookie).send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      }),
      request.post("/api/appointments").set("Cookie", clientCookie).send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      }),
    ]);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r3.status).toBe(201);
    apptProfId = r1.body.appointment.id;
    apptAdminId = r2.body.appointment.id;
    apptClientId = r3.body.appointment.id;
  });

  it("CLIENT não consegue CONFIRMED → NO_SHOW (400)", async () => {
    const res = await request
      .patch(`/api/appointments/${apptClientId}`)
      .set("Cookie", clientCookie)
      .send({ status: "NO_SHOW" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    // Confirmar que o appointment permanece CONFIRMED
    const check = await request
      .get(`/api/appointments/${apptClientId}`)
      .set("Cookie", adminCookie);
    expect(check.body.appointment.status).toBe("CONFIRMED");
  });

  it("PROFESSIONAL consegue CONFIRMED → NO_SHOW (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${apptProfId}`)
      .set("Cookie", profCookie)
      .send({ status: "NO_SHOW" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("NO_SHOW");
  });

  it("NO_SHOW é estado terminal: tentativa de CANCELLED retorna 400", async () => {
    // apptProfId está agora em NO_SHOW (teste anterior)
    const res = await request
      .patch(`/api/appointments/${apptProfId}`)
      .set("Cookie", adminCookie)
      .send({ status: "CANCELLED" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("histórico registra a transição CONFIRMED → NO_SHOW", async () => {
    const res = await request
      .get(`/api/appointments/${apptProfId}/history`)
      .set("Cookie", profCookie);
    expect(res.status).toBe(200);
    const history = res.body.history as Array<{ oldStatus: string | null; newStatus: string }>;
    const noShowEntry = history.find((h) => h.newStatus === "NO_SHOW");
    expect(noShowEntry).toBeDefined();
    expect(noShowEntry!.oldStatus).toBe("CONFIRMED");
    expect(noShowEntry!.newStatus).toBe("NO_SHOW");
  });

  it("audit_log registra APPOINTMENT_STATUS_CHANGED para CONFIRMED → NO_SHOW", async () => {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, apptProfId));
    const statusLog = logs.find((l) => l.action === "APPOINTMENT_STATUS_CHANGED");
    expect(statusLog).toBeDefined();
    expect(statusLog!.newData).toMatchObject({ status: "NO_SHOW" });
  });

  it("ADMIN consegue CONFIRMED → NO_SHOW (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${apptAdminId}`)
      .set("Cookie", adminCookie)
      .send({ status: "NO_SHOW" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("NO_SHOW");
  });

  it("transições existentes não foram afetadas: CONFIRMED → IN_PROGRESS ainda funciona", async () => {
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const freshId = createRes.body.appointment.id;

    const res = await request
      .patch(`/api/appointments/${freshId}`)
      .set("Cookie", profCookie)
      .send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("IN_PROGRESS");
  });
});

// ─── Audit log ────────────────────────────────────────────────────────────

describe("Audit log de appointments (verificação direta no banco)", () => {
  it("APPOINTMENT_CREATED é registrado dentro da transaction", async () => {
    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(201);
    const apptId = res.body.appointment.id;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, apptId));

    expect(logs.some((l) => l.action === "APPOINTMENT_CREATED")).toBe(true);
  });
});

// ─── F5.3 — Cancelamento: PROFESSIONAL e ADMIN ────────────────────────────

describe("F5.3 — cancelamento por PROFESSIONAL (CONFIRMED) e ADMIN (IN_PROGRESS)", () => {
  let profCancelId: string;  // ficará em CONFIRMED → PROFESSIONAL cancela
  let adminCancelId: string; // será avançado para IN_PROGRESS → ADMIN cancela

  beforeAll(async () => {
    const rA = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(rA.status).toBe(201);
    profCancelId = rA.body.appointment.id;

    const rB = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(rB.status).toBe(201);
    adminCancelId = rB.body.appointment.id;

    // Avança B para IN_PROGRESS
    const adv = await request
      .patch(`/api/appointments/${adminCancelId}`)
      .set("Cookie", profCookie)
      .send({ status: "IN_PROGRESS" });
    expect(adv.status).toBe(200);
  });

  it("PROFESSIONAL cancela próprio appointment CONFIRMED (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${profCancelId}`)
      .set("Cookie", profCookie)
      .send({ status: "CANCELLED", reason: "Agenda cheia" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("CANCELLED");
  });

  it("ADMIN cancela appointment IN_PROGRESS (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${adminCancelId}`)
      .set("Cookie", adminCookie)
      .send({ status: "CANCELLED", reason: "Emergência administrativa" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("CANCELLED");
  });
});

// ─── F5.3 — IN_PROGRESS → NO_SHOW (RBAC) ──────────────────────────────────

describe("F5.3 — IN_PROGRESS → NO_SHOW (RBAC)", () => {
  let profNoShowId: string;
  let adminNoShowId: string;
  let clientNoShowId: string;

  beforeAll(async () => {
    // Criar 3 appointments em slots distintos
    const [rA, rB, rC] = await Promise.all([
      request.post("/api/appointments").set("Cookie", clientCookie).send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      }),
      request.post("/api/appointments").set("Cookie", clientCookie).send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      }),
      request.post("/api/appointments").set("Cookie", clientCookie).send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      }),
    ]);
    expect(rA.status).toBe(201);
    expect(rB.status).toBe(201);
    expect(rC.status).toBe(201);
    profNoShowId  = rA.body.appointment.id;
    adminNoShowId = rB.body.appointment.id;
    clientNoShowId = rC.body.appointment.id;

    // Avançar todos para IN_PROGRESS
    const advances = await Promise.all([
      request.patch(`/api/appointments/${profNoShowId}`).set("Cookie", profCookie).send({ status: "IN_PROGRESS" }),
      request.patch(`/api/appointments/${adminNoShowId}`).set("Cookie", profCookie).send({ status: "IN_PROGRESS" }),
      request.patch(`/api/appointments/${clientNoShowId}`).set("Cookie", profCookie).send({ status: "IN_PROGRESS" }),
    ]);
    for (const adv of advances) expect(adv.status).toBe(200);
  });

  it("CLIENT não pode IN_PROGRESS → NO_SHOW (400)", async () => {
    const res = await request
      .patch(`/api/appointments/${clientNoShowId}`)
      .set("Cookie", clientCookie)
      .send({ status: "NO_SHOW" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    // Confirmar que permanece IN_PROGRESS
    const check = await request
      .get(`/api/appointments/${clientNoShowId}`)
      .set("Cookie", adminCookie);
    expect(check.body.appointment.status).toBe("IN_PROGRESS");
  });

  it("PROFESSIONAL consegue IN_PROGRESS → NO_SHOW (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${profNoShowId}`)
      .set("Cookie", profCookie)
      .send({ status: "NO_SHOW" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("NO_SHOW");
  });

  it("ADMIN consegue IN_PROGRESS → NO_SHOW (200)", async () => {
    const res = await request
      .patch(`/api/appointments/${adminNoShowId}`)
      .set("Cookie", adminCookie)
      .send({ status: "NO_SHOW" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("NO_SHOW");
  });
});

// ─── F5.3 — Audit log: transições de status ───────────────────────────────

describe("F5.3 — Audit log: CONFIRMED → IN_PROGRESS, IN_PROGRESS → COMPLETED, IN_PROGRESS → NO_SHOW", () => {
  it("CONFIRMED → IN_PROGRESS gera APPOINTMENT_STATUS_CHANGED com status IN_PROGRESS", async () => {
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const apptId = createRes.body.appointment.id;

    const patchRes = await request
      .patch(`/api/appointments/${apptId}`)
      .set("Cookie", profCookie)
      .send({ status: "IN_PROGRESS" });
    expect(patchRes.status).toBe(200);

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, apptId));
    const statusLog = logs.find(
      (l) => l.action === "APPOINTMENT_STATUS_CHANGED" &&
             (l.newData as Record<string, unknown>)?.status === "IN_PROGRESS",
    );
    expect(statusLog).toBeDefined();
    expect(statusLog!.newData).toMatchObject({ status: "IN_PROGRESS" });
  });

  it("IN_PROGRESS → COMPLETED gera APPOINTMENT_STATUS_CHANGED com status COMPLETED", async () => {
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const apptId = createRes.body.appointment.id;

    await request.patch(`/api/appointments/${apptId}`).set("Cookie", profCookie).send({ status: "IN_PROGRESS" });
    const patchRes = await request.patch(`/api/appointments/${apptId}`).set("Cookie", profCookie).send({ status: "COMPLETED" });
    expect(patchRes.status).toBe(200);

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, apptId));
    const completedLog = logs.find(
      (l) => l.action === "APPOINTMENT_STATUS_CHANGED" &&
             (l.newData as Record<string, unknown>)?.status === "COMPLETED",
    );
    expect(completedLog).toBeDefined();
    expect(completedLog!.newData).toMatchObject({ status: "COMPLETED" });
  });

  it("IN_PROGRESS → NO_SHOW gera APPOINTMENT_STATUS_CHANGED com status NO_SHOW", async () => {
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const apptId = createRes.body.appointment.id;

    await request.patch(`/api/appointments/${apptId}`).set("Cookie", profCookie).send({ status: "IN_PROGRESS" });
    const patchRes = await request.patch(`/api/appointments/${apptId}`).set("Cookie", profCookie).send({ status: "NO_SHOW" });
    expect(patchRes.status).toBe(200);

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, apptId));
    const noShowLog = logs.find(
      (l) => l.action === "APPOINTMENT_STATUS_CHANGED" &&
             (l.newData as Record<string, unknown>)?.status === "NO_SHOW",
    );
    expect(noShowLog).toBeDefined();
    expect(noShowLog!.newData).toMatchObject({ status: "NO_SHOW" });
  });
});

// ─── F5.3 — appointment_status_history: integridade append-only ────────────

describe("F5.3 — appointment_status_history: integridade append-only", () => {
  let historyEntryId: string;

  beforeAll(async () => {
    // Criar appointment para garantir pelo menos uma entrada no histórico
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: uniqueSlot(),
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const apptId = createRes.body.appointment.id;

    const entries = await db
      .select()
      .from(appointmentStatusHistory)
      .where(eq(appointmentStatusHistory.appointmentId, apptId));
    expect(entries.length).toBeGreaterThanOrEqual(1);
    historyEntryId = entries[0].id;
  });

  it("UPDATE em appointment_status_history é bloqueado pelo trigger", async () => {
    // O Drizzle encapsula o erro do PostgreSQL em error.cause; verificamos a cadeia completa.
    let caughtError: unknown = null;
    try {
      await db
        .update(appointmentStatusHistory)
        .set({ reason: "tentativa não autorizada" })
        .where(eq(appointmentStatusHistory.id, historyEntryId));
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    const err = caughtError as Error & { cause?: Error };
    const pgMessage = err.cause?.message ?? err.message;
    expect(pgMessage).toMatch(/append-only/);
  });

  it("DELETE em appointment_status_history é bloqueado pelo trigger", async () => {
    let caughtError: unknown = null;
    try {
      await db
        .delete(appointmentStatusHistory)
        .where(eq(appointmentStatusHistory.id, historyEntryId));
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).not.toBeNull();
    const err = caughtError as Error & { cause?: Error };
    const pgMessage = err.cause?.message ?? err.message;
    expect(pgMessage).toMatch(/append-only/);
  });
});

// ─── Blocked period ────────────────────────────────────────────────────────

describe("Blocked period impede criação de agendamento (409)", () => {
  it("agendamento durante blocked period retorna 409", async () => {
    const slotTime = uniqueSlot();
    const slotDate = new Date(slotTime);

    const bpStart = new Date(slotDate.getTime() - 30 * 60 * 1000).toISOString();
    const bpEnd = new Date(slotDate.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const bpRes = await request
      .post(`/api/professionals/${ids.professionalId}/blocked-periods`)
      .set("Cookie", profCookie)
      .send({ startDatetime: bpStart, endDatetime: bpEnd, reason: "Teste bloqueio" });
    expect(bpRes.status).toBe(201);

    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: slotTime,
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(409);
  });
});

// ─── Disponibilidade ──────────────────────────────────────────────────────

describe("Horário fora da disponibilidade do profissional (409)", () => {
  it("slot às 03:00 UTC (fora da janela 08:00-20:00) retorna 409", async () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 3);
    d.setUTCHours(3, 0, 0, 0); // 03:00 UTC — fora da janela

    const res = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: d.toISOString(),
        modality: "IN_PERSON",
      });

    expect(res.status).toBe(409);
  });
});

// ─── OBS-E — Testes de integração do reagendamento ────────────────────────
//
// Cobre PATCH /api/appointments/:id com body { reschedule: { startDatetime } }.
// Slots de reagendamento começam em d+20 para evitar qualquer colisão com os
// testes anteriores (que usam d+2 a d+~8 via uniqueSlot).

let rescheduleSlotCounter = 0;
/** Slot fixo dentro da janela 08:00–20:00 UTC, começando em d+20. */
function rSlot(): string {
  const dayOffset = 20 + Math.floor(rescheduleSlotCounter / 4);
  const hour = 10 + (rescheduleSlotCounter % 4); // 10, 11, 12, 13 UTC
  rescheduleSlotCounter += 1;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("OBS-E — PATCH /api/appointments/:id (reagendamento)", () => {

  // ── Teste 1: CLIENT happy path ─────────────────────────────────────────

  it("Teste 1 — CLIENT reagenda próprio appointment CONFIRMED (200)", async () => {
    const originalSlot = rSlot();
    const newSlot = rSlot();

    // Criar appointment original
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: originalSlot,
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const originalId = createRes.body.appointment.id;
    expect(createRes.body.appointment.status).toBe("CONFIRMED");

    // Reagendar
    const patchRes = await request
      .patch(`/api/appointments/${originalId}`)
      .set("Cookie", clientCookie)
      .send({ reschedule: { startDatetime: newSlot } });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.appointment).toBeDefined();

    const newApptId = patchRes.body.appointment.id;
    expect(newApptId).not.toBe(originalId); // novo appointment criado

    // Appointment original → CANCELLED
    const origRes = await request
      .get(`/api/appointments/${originalId}`)
      .set("Cookie", clientCookie);
    expect(origRes.status).toBe(200);
    expect(origRes.body.appointment.status).toBe("CANCELLED");

    // Novo appointment → CONFIRMED
    expect(patchRes.body.appointment.status).toBe("CONFIRMED");
    expect(patchRes.body.appointment.startDatetime).toBe(newSlot);

    // Audit logs — OBS-A: deve existir APPOINTMENT_CANCELLED e APPOINTMENT_RESCHEDULED
    const logsOriginal = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, originalId));

    expect(logsOriginal.some((l) => l.action === "APPOINTMENT_CANCELLED")).toBe(true);

    const logsNew = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, newApptId));

    expect(logsNew.some((l) => l.action === "APPOINTMENT_RESCHEDULED")).toBe(true);

    // Histórico do appointment original: CONFIRMED → CANCELLED
    const histOrigRes = await request
      .get(`/api/appointments/${originalId}/history`)
      .set("Cookie", clientCookie);
    expect(histOrigRes.status).toBe(200);
    const histOrig = histOrigRes.body.history as Array<{ oldStatus: string | null; newStatus: string }>;
    expect(histOrig.some((h) => h.oldStatus === "CONFIRMED" && h.newStatus === "CANCELLED")).toBe(true);

    // Histórico do novo appointment: null → CONFIRMED
    const histNewRes = await request
      .get(`/api/appointments/${newApptId}/history`)
      .set("Cookie", clientCookie);
    expect(histNewRes.status).toBe(200);
    const histNew = histNewRes.body.history as Array<{ oldStatus: string | null; newStatus: string }>;
    expect(histNew.some((h) => h.oldStatus === null && h.newStatus === "CONFIRMED")).toBe(true);
  });

  // ── Teste 2: ADMIN happy path ──────────────────────────────────────────

  it("Teste 2 — ADMIN reagenda appointment de um cliente (200)", async () => {
    const originalSlot = rSlot();
    const newSlot = rSlot();

    // Criar via CLIENT
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: originalSlot,
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const originalId = createRes.body.appointment.id;

    // ADMIN reagenda
    const patchRes = await request
      .patch(`/api/appointments/${originalId}`)
      .set("Cookie", adminCookie)
      .send({ reschedule: { startDatetime: newSlot } });

    expect(patchRes.status).toBe(200);
    const newApptId = patchRes.body.appointment.id;
    expect(newApptId).not.toBe(originalId);
    expect(patchRes.body.appointment.status).toBe("CONFIRMED");

    // Original → CANCELLED
    const origRes = await request
      .get(`/api/appointments/${originalId}`)
      .set("Cookie", adminCookie);
    expect(origRes.status).toBe(200);
    expect(origRes.body.appointment.status).toBe("CANCELLED");

    // Audit logs corretos
    const logsOrig = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, originalId));
    expect(logsOrig.some((l) => l.action === "APPOINTMENT_CANCELLED")).toBe(true);

    const logsNew = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, newApptId));
    expect(logsNew.some((l) => l.action === "APPOINTMENT_RESCHEDULED")).toBe(true);
  });

  // ── Teste 3: PROFESSIONAL → 403 ───────────────────────────────────────

  it("Teste 3 — PROFESSIONAL tenta reagendar → 403, appointment original inalterado", async () => {
    const originalSlot = rSlot();
    const newSlot = rSlot();

    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: originalSlot,
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const originalId = createRes.body.appointment.id;

    // PROFESSIONAL tenta reagendar
    const patchRes = await request
      .patch(`/api/appointments/${originalId}`)
      .set("Cookie", profCookie)
      .send({ reschedule: { startDatetime: newSlot } });

    expect(patchRes.status).toBe(403);

    // Appointment original permanece CONFIRMED
    const origRes = await request
      .get(`/api/appointments/${originalId}`)
      .set("Cookie", clientCookie);
    expect(origRes.status).toBe(200);
    expect(origRes.body.appointment.status).toBe("CONFIRMED");

    // Nenhum audit log de APPOINTMENT_CANCELLED nem APPOINTMENT_RESCHEDULED para o original
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, originalId));
    expect(logs.some((l) => l.action === "APPOINTMENT_CANCELLED")).toBe(false);
    expect(logs.some((l) => l.action === "APPOINTMENT_RESCHEDULED")).toBe(false);
  });

  // ── Teste 4: appointment não CONFIRMED → 400 ──────────────────────────

  it("Teste 4 — reagendar appointment CANCELLED retorna 400, sem novo appointment", async () => {
    const originalSlot = rSlot();
    const newSlot = rSlot();

    // Criar e cancelar
    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: originalSlot,
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const originalId = createRes.body.appointment.id;

    // Cancelar
    const cancelRes = await request
      .patch(`/api/appointments/${originalId}`)
      .set("Cookie", clientCookie)
      .send({ status: "CANCELLED" });
    expect(cancelRes.status).toBe(200);

    // Tentar reagendar → deve ser 400
    const patchRes = await request
      .patch(`/api/appointments/${originalId}`)
      .set("Cookie", clientCookie)
      .send({ reschedule: { startDatetime: newSlot } });

    expect(patchRes.status).toBe(400);

    // Verificar que nenhum novo appointment foi criado ao novo slot
    const origRes = await request
      .get(`/api/appointments/${originalId}`)
      .set("Cookie", clientCookie);
    expect(origRes.body.appointment.status).toBe("CANCELLED");

    // Nenhum APPOINTMENT_RESCHEDULED no audit para o original
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, originalId));
    expect(logs.some((l) => l.action === "APPOINTMENT_RESCHEDULED")).toBe(false);
  });

  // ── Teste 5: conflito no novo horário → 409 + rollback total ──────────

  it("Teste 5 — conflito no novo horário → 409, original permanece CONFIRMED, rollback", async () => {
    const slotForOriginal = rSlot();
    const slotOccupied = rSlot(); // este slot será ocupado por outro appointment

    // Criar appointment X (o que queremos reagendar)
    const createX = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: slotForOriginal,
        modality: "IN_PERSON",
      });
    expect(createX.status).toBe(201);
    const xId = createX.body.appointment.id;

    // Criar appointment Y no slot conflitante (mesmo client → excl_client_no_overlap)
    // Para que haja conflito, o mesmo client não pode ter dois appointments sobrepostos.
    // Mas Y é criado com o mesmo client e mesmo profissional — isso é válido em slots diferentes.
    // Vamos usar um segundo client para Y para conflito via profissional (excl_professional_no_overlap)
    // Mas mais simples: Y é criado pelo admin com o mesmo client no slotOccupied
    const createY = await request
      .post("/api/appointments")
      .set("Cookie", adminCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        clientId: ids.clientId,
        startDatetime: slotOccupied,
        modality: "IN_PERSON",
      });
    expect(createY.status).toBe(201);
    const yId = createY.body.appointment.id;

    // Tentar reagendar X para o slotOccupied (onde Y já existe para o mesmo cliente)
    const patchRes = await request
      .patch(`/api/appointments/${xId}`)
      .set("Cookie", clientCookie)
      .send({ reschedule: { startDatetime: slotOccupied } });

    expect(patchRes.status).toBe(409);

    // X deve continuar CONFIRMED (rollback da transaction)
    const xRes = await request
      .get(`/api/appointments/${xId}`)
      .set("Cookie", clientCookie);
    expect(xRes.status).toBe(200);
    expect(xRes.body.appointment.status).toBe("CONFIRMED");

    // Y deve continuar CONFIRMED (não foi afetado)
    const yRes = await request
      .get(`/api/appointments/${yId}`)
      .set("Cookie", adminCookie);
    expect(yRes.status).toBe(200);
    expect(yRes.body.appointment.status).toBe("CONFIRMED");

    // Audit: NÃO deve existir APPOINTMENT_CANCELLED para X (rollback)
    const logsX = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, xId));
    // Apenas APPOINTMENT_CREATED (da criação), sem CANCELLED nem RESCHEDULED
    expect(logsX.some((l) => l.action === "APPOINTMENT_CANCELLED")).toBe(false);
    expect(logsX.some((l) => l.action === "APPOINTMENT_RESCHEDULED")).toBe(false);

    // Histórico de X: não deve ter entrada de CANCELLED
    const histRes = await request
      .get(`/api/appointments/${xId}/history`)
      .set("Cookie", clientCookie);
    expect(histRes.status).toBe(200);
    const hist = histRes.body.history as Array<{ newStatus: string }>;
    expect(hist.every((h) => h.newStatus !== "CANCELLED")).toBe(true);
  });

  // ── Teste 6: regra de negócio inválida no novo horário ────────────────

  it("Teste 6 — reagendar para horário fora da disponibilidade → erro, original inalterado", async () => {
    const originalSlot = rSlot();

    const createRes = await request
      .post("/api/appointments")
      .set("Cookie", clientCookie)
      .send({
        professionalId: ids.professionalId,
        serviceId: ids.serviceId,
        startDatetime: originalSlot,
        modality: "IN_PERSON",
      });
    expect(createRes.status).toBe(201);
    const originalId = createRes.body.appointment.id;

    // Tentar reagendar para 03:00 UTC (fora da janela 08:00–20:00)
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 21);
    d.setUTCHours(3, 0, 0, 0);
    const invalidSlot = d.toISOString();

    const patchRes = await request
      .patch(`/api/appointments/${originalId}`)
      .set("Cookie", clientCookie)
      .send({ reschedule: { startDatetime: invalidSlot } });

    // Deve retornar erro (409 por regra de disponibilidade)
    expect([400, 409]).toContain(patchRes.status);

    // Appointment original permanece CONFIRMED
    const origRes = await request
      .get(`/api/appointments/${originalId}`)
      .set("Cookie", clientCookie);
    expect(origRes.status).toBe(200);
    expect(origRes.body.appointment.status).toBe("CONFIRMED");

    // Nenhum audit de reagendamento
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, originalId));
    expect(logs.some((l) => l.action === "APPOINTMENT_RESCHEDULED")).toBe(false);
  });
});
