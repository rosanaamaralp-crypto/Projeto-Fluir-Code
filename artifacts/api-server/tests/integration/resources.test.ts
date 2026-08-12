/**
 * F9 — Testes do módulo de resources (macas/recursos).
 *
 * Contratos verificados:
 * - GET  /api/resources         → { resources: [] } — ADMIN: todos; outros: apenas ACTIVE
 * - GET  /api/resources/:id     → { resource } 200 | 404
 * - POST /api/resources         → { resource } 201 — ADMIN only
 *
 * Nota: GET /api/resources/status NÃO existe nesta implementação (endpoint ausente).
 *
 * Cleanup: o resource criado em beforeAll é deletado em afterAll via DELETE
 * (não está no cleanTestData padrão).
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
import { getDatabaseClient } from "@workspace/db";
import { resources } from "@workspace/db";
import { inArray } from "drizzle-orm";

const { db } = getDatabaseClient();

let ids: TestUsers;
let adminCookie: string;
let profCookie: string;
let clientCookie: string;
let createdResourceId: string;

const RESOURCE_PAYLOAD = {
  name: "Recurso Teste F9",
  type: "MASSAGE_TABLE",
};

beforeAll(async () => {
  ids = await seedTestData();
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);

  // Limpeza idempotente — remove recursos de test com esses nomes caso tenham
  // sobrado de uma execução anterior (cleanTestData não os remove por padrão).
  await db
    .delete(resources)
    .where(inArray(resources.name, ["Recurso Teste F9", "Recurso Extra F9"]));

  // Criar resource para testes de GET /:id
  const res = await request
    .post("/api/resources")
    .set("Cookie", adminCookie)
    .send(RESOURCE_PAYLOAD);
  if (res.status !== 201) {
    throw new Error(
      `resources.test.ts beforeAll: POST /api/resources falhou ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }
  createdResourceId = res.body.resource?.id as string;
});

afterAll(async () => {
  // Remover resource criado neste teste (não está no cleanTestData)
  if (createdResourceId) {
    await request
      .delete(`/api/resources/${createdResourceId}`)
      .set("Cookie", adminCookie);
  }
  await cleanTestData();
});

// ─── GET /api/resources ───────────────────────────────────────────────────────

describe("GET /api/resources — RBAC", () => {
  it("anônimo → 401", async () => {
    const res = await request.get("/api/resources");
    expect(res.status).toBe(401);
  });

  it("ADMIN → 200 com array de resources", async () => {
    const res = await request.get("/api/resources").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.resources)).toBe(true);
  });

  it("PROFESSIONAL → 200 com array de resources", async () => {
    const res = await request.get("/api/resources").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.resources)).toBe(true);
  });

  it("CLIENT → 200 com array de resources", async () => {
    const res = await request.get("/api/resources").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.resources)).toBe(true);
  });
});

// ─── GET /api/resources/:id ───────────────────────────────────────────────────

describe("GET /api/resources/:id", () => {
  it("ADMIN busca resource por ID → 200 com campos obrigatórios", async () => {
    const res = await request
      .get(`/api/resources/${createdResourceId}`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.resource).toBeDefined();
    expect(res.body.resource.id).toBe(createdResourceId);
    expect(res.body.resource.name).toBe(RESOURCE_PAYLOAD.name);
    expect(res.body.resource.type).toBe(RESOURCE_PAYLOAD.type);
    expect(res.body.resource.status).toBeDefined();
  });

  it("CLIENT busca resource por ID → 200", async () => {
    const res = await request
      .get(`/api/resources/${createdResourceId}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.resource).toBeDefined();
  });

  it("ID inexistente → 404", async () => {
    const res = await request
      .get("/api/resources/00000000-0000-0000-0000-000000000099")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/resources ──────────────────────────────────────────────────────

describe("POST /api/resources — criação", () => {
  it("ADMIN cria resource → 201 com resource no body", async () => {
    const res = await request
      .post("/api/resources")
      .set("Cookie", adminCookie)
      .send({ name: "Recurso Extra F9", type: "ROOM" });
    expect(res.status).toBe(201);
    expect(res.body.resource).toBeDefined();
    expect(res.body.resource.name).toBe("Recurso Extra F9");
    expect(res.body.resource.type).toBe("ROOM");

    // Cleanup deste resource extra
    if (res.body.resource?.id) {
      await request
        .delete(`/api/resources/${res.body.resource.id as string}`)
        .set("Cookie", adminCookie);
    }
  });

  it("CLIENT → 403", async () => {
    const res = await request
      .post("/api/resources")
      .set("Cookie", clientCookie)
      .send({ name: "Tentativa", type: "ROOM" });
    expect(res.status).toBe(403);
  });

  it("PROFESSIONAL → 403", async () => {
    const res = await request
      .post("/api/resources")
      .set("Cookie", profCookie)
      .send({ name: "Tentativa", type: "ROOM" });
    expect(res.status).toBe(403);
  });

  it("anônimo → 401", async () => {
    const res = await request
      .post("/api/resources")
      .send({ name: "Tentativa", type: "ROOM" });
    expect(res.status).toBe(401);
  });
});
