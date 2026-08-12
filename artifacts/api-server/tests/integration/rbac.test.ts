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
let profCookie: string;

beforeAll(async () => {
  ids = await seedTestData();
  adminCookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
  clientCookie = await loginAs(TEST_EMAILS.client, TEST_PASSWORDS.client);
  profCookie = await loginAs(TEST_EMAILS.professional, TEST_PASSWORDS.professional);
});

afterAll(async () => {
  await cleanTestData();
});

describe("RBAC — Endpoints protegidos retornam 401 sem sessão", () => {
  const protectedEndpoints = [
    { method: "get", path: "/api/clients" },
    { method: "get", path: "/api/professionals" },
    { method: "get", path: "/api/services" },
    { method: "get", path: "/api/resources" },
    { method: "get", path: "/api/auth/me" },
    { method: "get", path: "/api/slots?professionalId=00000000-0000-0000-0000-000000000001&serviceId=00000000-0000-0000-0000-000000000002&date=2026-09-07" },
  ];

  for (const { method, path } of protectedEndpoints) {
    it(`${method.toUpperCase()} ${path} → 401 sem sessão`, async () => {
      const res = await (request as any)[method](path);
      expect(res.status).toBe(401);
    });
  }
});

describe("RBAC — Operações admin-only retornam 403 para não-admin", () => {
  it("CLIENT não pode criar serviço", async () => {
    const res = await request
      .post("/api/services")
      .set("Cookie", clientCookie)
      .send({ name: "X", durationMinutes: 30, price: 10, allowedModalities: "BOTH" });
    expect(res.status).toBe(403);
  });

  it("PROFESSIONAL não pode criar serviço", async () => {
    const res = await request
      .post("/api/services")
      .set("Cookie", profCookie)
      .send({ name: "X", durationMinutes: 30, price: 10, allowedModalities: "BOTH" });
    expect(res.status).toBe(403);
  });

  it("CLIENT não pode criar resource", async () => {
    const res = await request
      .post("/api/resources")
      .set("Cookie", clientCookie)
      .send({ name: "Maca", type: "MASSAGE_TABLE" });
    expect(res.status).toBe(403);
  });

  it("CLIENT não pode criar professional", async () => {
    const res = await request
      .post("/api/professionals")
      .set("Cookie", clientCookie)
      .send({ name: "P", email: "p@test.com", password: "Senha12345!" });
    expect(res.status).toBe(403);
  });

  it("CLIENT não pode criar client (via POST /api/clients)", async () => {
    const res = await request
      .post("/api/clients")
      .set("Cookie", clientCookie)
      .send({ name: "C", email: "c@test.com", password: "Senha12345!" });
    expect(res.status).toBe(403);
  });
});

describe("RBAC — Ownership de resources", () => {
  it("PROFESSIONAL não acessa availability de outro profissional (criação)", async () => {
    // Criar outro profissional
    const createRes = await request
      .post("/api/professionals")
      .set("Cookie", adminCookie)
      .send({
        name: "Outro Prof 2",
        email: "outro-prof2-rbac@fluir.test",
        password: "Senha12345!",
      });
    const otherId = createRes.body.professional.id;

    // profCookie tenta criar availability no outro profissional
    const res = await request
      .post(`/api/professionals/${otherId}/availability`)
      .set("Cookie", profCookie)
      .send({ weekday: 1, startTime: "09:00", endTime: "12:00" });
    expect(res.status).toBe(403);
  });

  it("ADMIN pode operar em qualquer profissional", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}/availability`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });
});
