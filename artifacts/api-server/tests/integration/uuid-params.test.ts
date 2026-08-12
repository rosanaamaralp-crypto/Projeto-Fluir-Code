/**
 * Testes de validação de UUID nos path parameters (P6).
 *
 * UUIDs inválidos devem retornar HTTP 400 (ValidationError)
 * e não HTTP 500 (erro de banco pg 22P02).
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

const INVALID_UUID = "not-a-uuid";
const ANOTHER_INVALID = "00000000-0000-0000-ZZZZ-000000000000";

let ids: TestUsers;
let adminCookie: string;
let profCookie: string;

beforeAll(async () => {
  ids = await seedTestData();
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
});

afterAll(async () => {
  await cleanTestData();
});

describe("P6 — UUID inválido em path params retorna 400", () => {
  describe("GET /api/clients/:id", () => {
    it("UUID inválido → 400 (não 500)", async () => {
      const res = await request
        .get(`/api/clients/${INVALID_UUID}`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("UUID com formato parcialmente inválido → 400", async () => {
      const res = await request
        .get(`/api/clients/${ANOTHER_INVALID}`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/clients/:id", () => {
    it("UUID inválido → 400", async () => {
      const res = await request
        .patch(`/api/clients/${INVALID_UUID}`)
        .set("Cookie", adminCookie)
        .send({ notes: "test" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/professionals/:id", () => {
    it("UUID inválido → 400", async () => {
      const res = await request
        .get(`/api/professionals/${INVALID_UUID}`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/professionals/:id", () => {
    it("UUID inválido → 400", async () => {
      const res = await request
        .patch(`/api/professionals/${INVALID_UUID}`)
        .set("Cookie", adminCookie)
        .send({ bio: "test" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/services/:id", () => {
    it("UUID inválido → 400", async () => {
      const res = await request
        .get(`/api/services/${INVALID_UUID}`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/services/:id", () => {
    it("UUID inválido → 400", async () => {
      const res = await request
        .patch(`/api/services/${INVALID_UUID}`)
        .set("Cookie", adminCookie)
        .send({ name: "test" });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/services/:id", () => {
    it("UUID inválido → 400", async () => {
      const res = await request
        .delete(`/api/services/${INVALID_UUID}`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/resources/:id", () => {
    it("UUID inválido → 400", async () => {
      const res = await request
        .get(`/api/resources/${INVALID_UUID}`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/professionals/:profId/services", () => {
    it("profId inválido → 400", async () => {
      const res = await request
        .get(`/api/professionals/${INVALID_UUID}/services`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/professionals/:profId/availability", () => {
    it("profId inválido → 400", async () => {
      const res = await request
        .get(`/api/professionals/${INVALID_UUID}/availability`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/professionals/:profId/blocked-periods", () => {
    it("profId inválido → 400 (não 500)", async () => {
      const res = await request
        .get(`/api/professionals/${INVALID_UUID}/blocked-periods`)
        .set("Cookie", profCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/clients/:clientId/addresses", () => {
    it("clientId inválido → 400", async () => {
      const res = await request
        .get(`/api/clients/${INVALID_UUID}/addresses`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("UUID válido (nil UUID) → 404 correto", () => {
    it("UUID válido mas inexistente retorna 404, não 400", async () => {
      const nilUUID = "00000000-0000-0000-0000-000000000000";
      const res = await request
        .get(`/api/clients/${nilUUID}`)
        .set("Cookie", adminCookie);
      // UUID válido mas não existe no banco → 404
      expect(res.status).toBe(404);
    });
  });

  // F9 — GAP-01: UUID em appointments/:id/history e notifications/:id/read

  describe("GET /api/appointments/:id/history", () => {
    it("UUID inválido → 400 (não 500)", async () => {
      const res = await request
        .get(`/api/appointments/${INVALID_UUID}/history`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/notifications/:id/read", () => {
    it("UUID inválido → 400 (não 500)", async () => {
      const res = await request
        .post(`/api/notifications/${INVALID_UUID}/read`)
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
    });
  });
});
