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
import { auditLogs } from "@workspace/db";
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
