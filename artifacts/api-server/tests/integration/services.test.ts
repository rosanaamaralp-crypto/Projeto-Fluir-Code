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

describe("GET /api/services", () => {
  it("retorna 401 sem sessão", async () => {
    const res = await request.get("/api/services");
    expect(res.status).toBe(401);
  });

  it("retorna lista de services para autenticado", async () => {
    const res = await request.get("/api/services").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.services)).toBe(true);
  });
});

describe("POST /api/services", () => {
  it("retorna 403 para CLIENT", async () => {
    const res = await request
      .post("/api/services")
      .set("Cookie", clientCookie)
      .send({ name: "Serviço X", durationMinutes: 30, price: 50, allowedModalities: "BOTH" });
    expect(res.status).toBe(403);
  });

  it("ADMIN cria service com sucesso", async () => {
    const res = await request
      .post("/api/services")
      .set("Cookie", adminCookie)
      .send({ name: "Serviço Teste", durationMinutes: 45, price: 80.5, allowedModalities: "IN_PERSON" });
    expect(res.status).toBe(201);
    expect(res.body.service.name).toBe("Serviço Teste");
    expect(res.body.service.durationMinutes).toBe(45);
  });

  it("retorna 400 para dados inválidos (preço negativo)", async () => {
    const res = await request
      .post("/api/services")
      .set("Cookie", adminCookie)
      .send({ name: "Serviço Inválido", durationMinutes: 30, price: -10, allowedModalities: "BOTH" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/services/:id", () => {
  it("ADMIN atualiza service", async () => {
    const res = await request
      .patch(`/api/services/${ids.serviceId}`)
      .set("Cookie", adminCookie)
      .send({ name: "Massagem Atualizada" });
    expect(res.status).toBe(200);
    expect(res.body.service.name).toBe("Massagem Atualizada");
  });

  it("CLIENT não pode atualizar service (403)", async () => {
    const res = await request
      .patch(`/api/services/${ids.serviceId}`)
      .set("Cookie", clientCookie)
      .send({ name: "Tentativa" });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/services/:id", () => {
  it("ADMIN desativa service (soft delete)", async () => {
    // Criar service para deletar
    const createRes = await request
      .post("/api/services")
      .set("Cookie", adminCookie)
      .send({ name: "Para Deletar", durationMinutes: 30, price: 50, allowedModalities: "BOTH" });
    const svcId = createRes.body.service.id;

    const deleteRes = await request
      .delete(`/api/services/${svcId}`)
      .set("Cookie", adminCookie);
    expect(deleteRes.status).toBe(200);

    // Verificar que foi desativado
    const getRes = await request
      .get(`/api/services/${svcId}`)
      .set("Cookie", adminCookie);
    expect(getRes.body.service.status).toBe("INACTIVE");
  });
});

// ─── GET /api/services/:id (F9 — GAP-07) ─────────────────────────────────────

describe("GET /api/services/:id", () => {
  it("autenticado busca service por ID → 200 com campos obrigatórios", async () => {
    const res = await request
      .get(`/api/services/${ids.serviceId}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.service).toBeDefined();
    expect(res.body.service.id).toBe(ids.serviceId);
    expect(res.body.service.name).toBeDefined();
    expect(res.body.service.durationMinutes).toBeDefined();
    expect(res.body.service.price).toBeDefined();
    expect(res.body.service.allowedModalities).toBeDefined();
  });

  it("ADMIN busca service por ID → 200", async () => {
    const res = await request
      .get(`/api/services/${ids.serviceId}`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.service.id).toBe(ids.serviceId);
  });

  it("ID inexistente → 404", async () => {
    const res = await request
      .get("/api/services/00000000-0000-0000-0000-000000000099")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(404);
  });

  it("anônimo → 401", async () => {
    const res = await request.get(`/api/services/${ids.serviceId}`);
    expect(res.status).toBe(401);
  });
});
