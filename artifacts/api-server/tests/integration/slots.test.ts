import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, loginAs } from "../helpers/app.js";
import {
  seedTestData,
  cleanTestData,
  TEST_EMAILS,
  TEST_PASSWORDS,
  type TestUsers,
} from "../helpers/seed.js";
import { getDatabaseClient } from "@workspace/db";
import { availability, professionalServices } from "@workspace/db";
import { eq } from "drizzle-orm";

const { db } = getDatabaseClient();

let ids: TestUsers;
let adminCookie: string;
let clientCookie: string;

// Data futura dentro do limite de 60 dias
function getFutureDate(daysFromNow = 3): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

beforeAll(async () => {
  ids = await seedTestData();
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);

  // Vincular professional ao service
  await db
    .insert(professionalServices)
    .values({ professionalId: ids.professionalId, serviceId: ids.serviceId, active: true })
    .onConflictDoNothing();

  // Criar availability para todos os dias da semana (0-6)
  for (let weekday = 0; weekday <= 6; weekday++) {
    await db.insert(availability).values({
      professionalId: ids.professionalId,
      weekday,
      startTime: "09:00:00",
      endTime: "18:00:00",
      active: true,
    });
  }
});

afterAll(async () => {
  await db.delete(availability).where(eq(availability.professionalId, ids.professionalId));
  await db.delete(professionalServices).where(eq(professionalServices.professionalId, ids.professionalId));
  await cleanTestData();
});

describe("GET /api/slots", () => {
  it("retorna 401 sem sessão", async () => {
    const res = await request.get("/api/slots");
    expect(res.status).toBe(401);
  });

  it("retorna 400 sem parâmetros obrigatórios", async () => {
    const res = await request.get("/api/slots").set("Cookie", clientCookie);
    expect(res.status).toBe(400);
  });

  it("retorna 400 para UUID inválido em professionalId", async () => {
    const res = await request
      .get("/api/slots?professionalId=nao-uuid&serviceId=00000000-0000-0000-0000-000000000001&date=2026-09-07")
      .set("Cookie", clientCookie);
    expect(res.status).toBe(400);
  });

  it("retorna 400 para date em formato inválido", async () => {
    const res = await request
      .get(`/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=07-09-2026`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(400);
  });

  it("retorna lista de slots disponíveis para profissional com availability configurada", async () => {
    const date = getFutureDate(3);
    const res = await request
      .get(`/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}`)
      .set("Cookie", clientCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);
    // 09:00-18:00 com 60min = 9 slots, descontando min notice (2h)
    expect(res.body.slots.length).toBeGreaterThan(0);
  });

  it("slots retornados estão em formato ISO 8601 UTC", async () => {
    const date = getFutureDate(5);
    const res = await request
      .get(`/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}`)
      .set("Cookie", clientCookie);

    expect(res.status).toBe(200);
    if (res.body.slots.length > 0) {
      const slot = res.body.slots[0];
      expect(slot.startDatetime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(slot.endDatetime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });

  it("duração de cada slot corresponde à duração do service (60min)", async () => {
    const date = getFutureDate(4);
    const res = await request
      .get(`/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${date}`)
      .set("Cookie", clientCookie);

    expect(res.status).toBe(200);
    for (const slot of res.body.slots) {
      const duration = new Date(slot.endDatetime).getTime() - new Date(slot.startDatetime).getTime();
      expect(duration).toBe(60 * 60 * 1000);
    }
  });

  it("retorna lista vazia para data no passado", async () => {
    const pastDate = "2020-01-01";
    const res = await request
      .get(`/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${pastDate}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(0);
  });

  it("retorna lista vazia para data além do limite máximo (60 dias)", async () => {
    const farFuture = getFutureDate(65);
    const res = await request
      .get(`/api/slots?professionalId=${ids.professionalId}&serviceId=${ids.serviceId}&date=${farFuture}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(0);
  });

  it("retorna 404 para profissional inexistente", async () => {
    const date = getFutureDate(3);
    const res = await request
      .get(`/api/slots?professionalId=00000000-0000-0000-0000-000000000000&serviceId=${ids.serviceId}&date=${date}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(404);
  });
});
