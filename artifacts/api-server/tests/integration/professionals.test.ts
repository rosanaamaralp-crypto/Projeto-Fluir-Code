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

describe("GET /api/professionals", () => {
  it("retorna 401 sem sessão", async () => {
    const res = await request.get("/api/professionals");
    expect(res.status).toBe(401);
  });

  it("ADMIN lista todos (incluindo inativos)", async () => {
    const res = await request.get("/api/professionals").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.professionals)).toBe(true);
  });

  it("CLIENT lista apenas ativos", async () => {
    const res = await request.get("/api/professionals").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    const statuses = res.body.professionals.map((p: { status: string }) => p.status);
    expect(statuses.every((s: string) => s === "ACTIVE")).toBe(true);
  });
});

describe("GET /api/professionals/:id", () => {
  it("qualquer autenticado pode visualizar", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.professional.id).toBe(ids.professionalId);
  });
});

describe("POST /api/professionals", () => {
  it("retorna 403 se não for ADMIN", async () => {
    const res = await request
      .post("/api/professionals")
      .set("Cookie", profCookie)
      .send({
        name: "Novo Prof",
        email: "novoprof@fluir.test",
        password: "Senha123456!",
      });
    expect(res.status).toBe(403);
  });

  it("ADMIN cria professional com sucesso", async () => {
    const res = await request
      .post("/api/professionals")
      .set("Cookie", adminCookie)
      .send({
        name: "Prof Criado",
        email: "prof-criado@fluir.test",
        password: "Senha123456!",
        specialty: "Acupuntura",
      });
    expect(res.status).toBe(201);
    expect(res.body.professional).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.professional.specialty).toBe("Acupuntura");
  });

  it("retorna 409 para email duplicado", async () => {
    const res = await request
      .post("/api/professionals")
      .set("Cookie", adminCookie)
      .send({
        name: "Duplicado",
        email: TEST_EMAILS.professional,
        password: "Senha123456!",
      });
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/professionals/:id", () => {
  it("PROFESSIONAL atualiza os próprios dados", async () => {
    const res = await request
      .patch(`/api/professionals/${ids.professionalId}`)
      .set("Cookie", profCookie)
      .send({ bio: "Bio atualizada pelo profissional" });
    expect(res.status).toBe(200);
    expect(res.body.professional.bio).toBe("Bio atualizada pelo profissional");
  });

  it("PROFESSIONAL não pode alterar dados de outro profissional (403)", async () => {
    // Criar outro prof
    const createRes = await request
      .post("/api/professionals")
      .set("Cookie", adminCookie)
      .send({
        name: "Outro Prof",
        email: "outro-prof-test@fluir.test",
        password: "Senha12345!",
      });
    const otherId = createRes.body.professional.id;

    const res = await request
      .patch(`/api/professionals/${otherId}`)
      .set("Cookie", profCookie)
      .send({ bio: "Tentativa de adulteração" });
    expect(res.status).toBe(403);
  });
});

// ─── Sub-recursos de professionals (F9 — GAP-03) ─────────────────────────────

describe("GET /api/professionals/:profId/services", () => {
  it("qualquer autenticado pode listar serviços do profissional → 200", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}/services`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    // Controller responde com chave `professionalServices` (não `services`)
    expect(Array.isArray(res.body.professionalServices)).toBe(true);
  });

  it("ADMIN lista serviços do profissional → 200", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}/services`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.professionalServices)).toBe(true);
  });

  it("anônimo → 401", async () => {
    const res = await request.get(`/api/professionals/${ids.professionalId}/services`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/professionals/:profId/availability", () => {
  it("qualquer autenticado pode listar disponibilidade → 200", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}/availability`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.availability)).toBe(true);
  });

  it("PROFESSIONAL pode listar própria disponibilidade → 200", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}/availability`)
      .set("Cookie", profCookie);
    expect(res.status).toBe(200);
  });

  it("anônimo → 401", async () => {
    const res = await request.get(`/api/professionals/${ids.professionalId}/availability`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/professionals/:profId/blocked-periods", () => {
  it("PROFESSIONAL lista períodos bloqueados → 200", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}/blocked-periods`)
      .set("Cookie", profCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.blockedPeriods)).toBe(true);
  });

  it("ADMIN lista períodos bloqueados de qualquer profissional → 200", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}/blocked-periods`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });

  it("CLIENT → 403 (requireProfessional middleware)", async () => {
    const res = await request
      .get(`/api/professionals/${ids.professionalId}/blocked-periods`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(403);
  });

  it("anônimo → 401", async () => {
    const res = await request.get(`/api/professionals/${ids.professionalId}/blocked-periods`);
    expect(res.status).toBe(401);
  });
});
