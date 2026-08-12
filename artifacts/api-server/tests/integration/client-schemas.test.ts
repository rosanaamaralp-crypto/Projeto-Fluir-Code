/**
 * Testes dos schemas separados de PATCH /api/clients/:id (P8).
 *
 * UpdateClientSchemaSelf: CLIENT não pode enviar status
 * UpdateClientSchemaAdmin: ADMIN pode enviar status
 *
 * Confirmações:
 * - CLIENT não consegue alterar status via schema (schema rejeita implicitamente)
 * - ADMIN consegue alterar status
 * - Campos permitidos continuam funcionando para ambos
 * - Campo inválido retorna 400
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
let clientCookie: string;

beforeAll(async () => {
  ids = await seedTestData();
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);
});

afterAll(async () => {
  await cleanTestData();
});

describe("P8 — Schemas separados por role para PATCH /api/clients/:id", () => {
  describe("CLIENT usando UpdateClientSchemaSelf", () => {
    it("CLIENT atualiza notas (campo permitido) → 200", async () => {
      const res = await request
        .patch(`/api/clients/${ids.clientId}`)
        .set("Cookie", clientCookie)
        .send({ notes: "Nota de teste P8" });
      expect(res.status).toBe(200);
      expect(res.body.client.notes).toBe("Nota de teste P8");
    });

    it("CLIENT envia status=INACTIVE → schema strips → status permanece ACTIVE", async () => {
      const res = await request
        .patch(`/api/clients/${ids.clientId}`)
        .set("Cookie", clientCookie)
        .send({ status: "INACTIVE" });
      // Schema Self não inclui status → campo é removido → no-op → 200 com status atual
      expect(res.status).toBe(200);
      expect(res.body.client.status).toBe("ACTIVE");
    });

    it("CLIENT envia birthDate válido → 200", async () => {
      const res = await request
        .patch(`/api/clients/${ids.clientId}`)
        .set("Cookie", clientCookie)
        .send({ birthDate: "1995-06-15" });
      expect(res.status).toBe(200);
    });

    it("CLIENT envia birthDate inválido → 400 do schema Self", async () => {
      const res = await request
        .patch(`/api/clients/${ids.clientId}`)
        .set("Cookie", clientCookie)
        .send({ birthDate: "não-é-data" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("ADMIN usando UpdateClientSchemaAdmin", () => {
    it("ADMIN pode alterar status → 200 com novo status", async () => {
      const resInactive = await request
        .patch(`/api/clients/${ids.clientId}`)
        .set("Cookie", adminCookie)
        .send({ status: "INACTIVE" });
      expect(resInactive.status).toBe(200);
      expect(resInactive.body.client.status).toBe("INACTIVE");

      // Reverter para ACTIVE
      const resActive = await request
        .patch(`/api/clients/${ids.clientId}`)
        .set("Cookie", adminCookie)
        .send({ status: "ACTIVE" });
      expect(resActive.status).toBe(200);
      expect(resActive.body.client.status).toBe("ACTIVE");
    });

    it("ADMIN envia status inválido → 400", async () => {
      const res = await request
        .patch(`/api/clients/${ids.clientId}`)
        .set("Cookie", adminCookie)
        .send({ status: "DELETED" }); // não é enum válido
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("ADMIN atualiza notas → 200", async () => {
      const res = await request
        .patch(`/api/clients/${ids.clientId}`)
        .set("Cookie", adminCookie)
        .send({ notes: "Nota via admin P8" });
      expect(res.status).toBe(200);
      expect(res.body.client.notes).toBe("Nota via admin P8");
    });
  });
});
