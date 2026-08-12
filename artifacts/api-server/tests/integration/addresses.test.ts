/**
 * F9 — Testes do módulo de endereços.
 *
 * Contratos verificados:
 * - GET  /api/clients/:clientId/addresses → { address: null | address }
 * - POST /api/clients/:clientId/addresses → { address } 201 (criação) | 200 (update)
 * - PUT  /api/clients/:clientId/addresses → { address } (upsert)
 * - DELETE /api/clients/:clientId/addresses → { message } 200
 *
 * RBAC: requireAuth — IDOR via assertClientOwnership no controller.
 * ADMIN: bypass completo.
 * CLIENT: acesso apenas ao próprio clientId (userId match).
 * PROFESSIONAL: ForbiddenError (não é admin, não é o cliente dono).
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

/** clientId do segundo cliente (criado via API para testes de IDOR) */
let client2Id: string;

const ADDRESS_PAYLOAD = {
  street: "Rua dos Testes F9",
  number: "99",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  postalCode: "01310-100",
};

beforeAll(async () => {
  ids = await seedTestData();
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);

  // Criar segundo cliente via API (email já está no cleanTestData)
  const res = await request
    .post("/api/clients")
    .set("Cookie", adminCookie)
    .send({
      name: "Outro Client F9",
      email: "outro-client@fluir.test",
      password: "OutroClient123!",
    });
  client2Id = res.body.client?.id as string;
});

afterAll(async () => {
  await cleanTestData();
});

// ─── Autenticação básica ──────────────────────────────────────────────────────

describe("GET /api/clients/:clientId/addresses — autenticação", () => {
  it("anônimo → 401", async () => {
    const res = await request.get(`/api/clients/${ids.clientId}/addresses`);
    expect(res.status).toBe(401);
  });
});

// ─── RBAC / IDOR ─────────────────────────────────────────────────────────────

describe("GET /api/clients/:clientId/addresses — RBAC e IDOR", () => {
  it("CLIENT acessa os próprios endereços → 200", async () => {
    const res = await request
      .get(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("address");
  });

  it("ADMIN acessa endereços de qualquer cliente → 200", async () => {
    const res = await request
      .get(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("address");
  });

  it("PROFESSIONAL acessa endereços de cliente → 403 (IDOR)", async () => {
    const res = await request
      .get(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", profCookie);
    expect(res.status).toBe(403);
  });

  it("CLIENT não acessa endereços de outro CLIENT → 403 (IDOR)", async () => {
    const res = await request
      .get(`/api/clients/${client2Id}/addresses`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });
});

// ─── Criação (POST) ───────────────────────────────────────────────────────────

describe("POST /api/clients/:clientId/addresses — criação", () => {
  it("CLIENT cria endereço próprio → 201 com address", async () => {
    const res = await request
      .post(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", clientCookie)
      .send(ADDRESS_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.address).toBeDefined();
    expect(res.body.address.street).toBe(ADDRESS_PAYLOAD.street);
    expect(res.body.address.state).toBe("SP");
  });

  it("CLIENT não cria endereço para outro CLIENT → 403 (IDOR)", async () => {
    const res = await request
      .post(`/api/clients/${client2Id}/addresses`)
      .set("Cookie", clientCookie)
      .send(ADDRESS_PAYLOAD);
    expect(res.status).toBe(403);
  });

  it("ADMIN cria endereço para qualquer cliente → 201 ou 200", async () => {
    const res = await request
      .post(`/api/clients/${client2Id}/addresses`)
      .set("Cookie", adminCookie)
      .send(ADDRESS_PAYLOAD);
    // 201 se novo, 200 se já existe (upsert)
    expect([200, 201]).toContain(res.status);
    expect(res.body.address).toBeDefined();
  });

  it("payload inválido (sem street) → 400", async () => {
    const res = await request
      .post(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", clientCookie)
      .send({ number: "10", neighborhood: "Centro", city: "SP", state: "SP", postalCode: "01310100" });
    expect(res.status).toBe(400);
  });

  it("payload com state de tamanho errado → 400", async () => {
    const res = await request
      .post(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", clientCookie)
      .send({ ...ADDRESS_PAYLOAD, state: "São Paulo" });
    expect(res.status).toBe(400);
  });
});

// ─── Atualização (POST/PUT upsert) ────────────────────────────────────────────

describe("POST /api/clients/:clientId/addresses — atualização (upsert)", () => {
  it("POST no mesmo clientId com novo street → 200 (update)", async () => {
    // Endereço já foi criado no describe anterior; agora atualiza
    const res = await request
      .post(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", clientCookie)
      .send({ ...ADDRESS_PAYLOAD, street: "Av. Paulista" });
    // Segundo POST no mesmo clientId → upsert → 200
    expect([200, 201]).toContain(res.status);
    expect(res.body.address.street).toBe("Av. Paulista");
  });

  it("CLIENT não atualiza endereço de outro CLIENT → 403 (IDOR)", async () => {
    const res = await request
      .put(`/api/clients/${client2Id}/addresses`)
      .set("Cookie", clientCookie)
      .send(ADDRESS_PAYLOAD);
    expect(res.status).toBe(403);
  });
});

// ─── Exclusão (DELETE) ────────────────────────────────────────────────────────

describe("DELETE /api/clients/:clientId/addresses — exclusão", () => {
  it("CLIENT deleta endereço próprio → 200 com message", async () => {
    const res = await request
      .delete(`/api/clients/${ids.clientId}/addresses`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it("CLIENT não deleta endereço de outro CLIENT → 403 (IDOR)", async () => {
    const res = await request
      .delete(`/api/clients/${client2Id}/addresses`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });
});
