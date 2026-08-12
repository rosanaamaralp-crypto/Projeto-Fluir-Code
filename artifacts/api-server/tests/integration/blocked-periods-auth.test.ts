/**
 * Testes de autorização do PATCH /api/professionals/:profId/blocked-periods/:id (P9).
 *
 * Confirmações:
 * - ADMIN consegue alterar blocked_periods
 * - PROFESSIONAL não consegue (403)
 * - CLIENT não consegue (403)
 * - Resposta correta continua sendo 403
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, loginAs } from "../helpers/app.js";
import {
  seedTestData,
  cleanTestData,
  TEST_EMAILS,
  TEST_PASSWORDS,
  type TestUsers,
} from "../helpers/seed.js";

let ids: TestUsers;
let adminCookie: string;
let profCookie: string;
let clientCookie: string;
let blockedPeriodId: string;

beforeAll(async () => {
  ids = await seedTestData();
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);

  // Criar um blocked_period para usar nos testes de PATCH
  const res = await request
    .post(`/api/professionals/${ids.professionalId}/blocked-periods`)
    .set("Cookie", profCookie)
    .send({
      startDatetime: "2027-01-10T09:00:00.000Z",
      endDatetime: "2027-01-10T12:00:00.000Z",
      reason: "Viagem",
    });
  expect(res.status).toBe(201);
  blockedPeriodId = res.body.blockedPeriod.id;
});

afterAll(async () => {
  await cleanTestData();
});

describe("P9 — PATCH blocked_periods: autorização via requireAdmin na rota", () => {
  it("ADMIN consegue alterar status de blocked_period", async () => {
    const res = await request
      .patch(`/api/professionals/${ids.professionalId}/blocked-periods/${blockedPeriodId}`)
      .set("Cookie", adminCookie)
      .send({ status: "CANCELLED" });
    expect(res.status).toBe(200);
    expect(res.body.blockedPeriod.status).toBe("CANCELLED");
  });

  it("PROFESSIONAL recebe 403 ao tentar alterar blocked_period (protegido na rota)", async () => {
    const res = await request
      .patch(`/api/professionals/${ids.professionalId}/blocked-periods/${blockedPeriodId}`)
      .set("Cookie", profCookie)
      .send({ status: "ACTIVE" });
    // requireAdmin na rota → 403 antes de chegar ao controller
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("CLIENT recebe 403 ao tentar alterar blocked_period", async () => {
    const res = await request
      .patch(`/api/professionals/${ids.professionalId}/blocked-periods/${blockedPeriodId}`)
      .set("Cookie", clientCookie)
      .send({ status: "ACTIVE" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("sem sessão recebe 401", async () => {
    const res = await request
      .patch(`/api/professionals/${ids.professionalId}/blocked-periods/${blockedPeriodId}`)
      .send({ status: "ACTIVE" });
    expect(res.status).toBe(401);
  });
});
