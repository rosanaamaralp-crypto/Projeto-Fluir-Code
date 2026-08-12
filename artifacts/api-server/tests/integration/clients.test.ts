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

describe("GET /api/clients", () => {
  it("retorna 401 sem sessão", async () => {
    const res = await request.get("/api/clients");
    expect(res.status).toBe(401);
  });

  it("ADMIN lista todos os clients", async () => {
    const res = await request.get("/api/clients").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.clients)).toBe(true);
    expect(res.body.clients.length).toBeGreaterThan(0);
  });

  it("CLIENT vê apenas o próprio registro", async () => {
    const res = await request.get("/api/clients").set("Cookie", clientCookie);
    expect(res.status).toBe(200);
    expect(res.body.clients).toHaveLength(1);
    expect(res.body.clients[0].id).toBe(ids.clientId);
  });
});

describe("GET /api/clients/:id", () => {
  it("ADMIN acessa qualquer client", async () => {
    const res = await request
      .get(`/api/clients/${ids.clientId}`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.client.id).toBe(ids.clientId);
  });

  it("CLIENT acessa o próprio", async () => {
    const res = await request
      .get(`/api/clients/${ids.clientId}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(200);
  });

  it("CLIENT não acessa client de outro usuário (403)", async () => {
    // Criar outro client via admin
    const createRes = await request
      .post("/api/clients")
      .set("Cookie", adminCookie)
      .send({
        name: "Outro Cliente",
        email: "outro-client@fluir.test",
        password: "Outro12345!",
      });
    expect(createRes.status).toBe(201);
    const otherId = createRes.body.client.id;

    const res = await request
      .get(`/api/clients/${otherId}`)
      .set("Cookie", clientCookie);
    expect(res.status).toBe(403);

    // Cleanup
    await request
      .patch(`/api/clients/${otherId}`)
      .set("Cookie", adminCookie)
      .send({ status: "INACTIVE" });
  });

  it("retorna 404 para ID inexistente", async () => {
    const res = await request
      .get("/api/clients/00000000-0000-0000-0000-000000000000")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/clients", () => {
  it("retorna 403 se não for ADMIN", async () => {
    const res = await request
      .post("/api/clients")
      .set("Cookie", clientCookie)
      .send({
        name: "Novo Cliente",
        email: "novo@fluir.test",
        password: "Senha123456!",
      });
    expect(res.status).toBe(403);
  });

  it("ADMIN cria client com sucesso", async () => {
    const res = await request
      .post("/api/clients")
      .set("Cookie", adminCookie)
      .send({
        name: "Cliente Criado",
        email: "criado-client@fluir.test",
        password: "Senha123456!",
        birthDate: "1995-05-15",
      });
    expect(res.status).toBe(201);
    expect(res.body.client).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.email).toBe("criado-client@fluir.test");
  });

  it("retorna 409 para email duplicado", async () => {
    const res = await request
      .post("/api/clients")
      .set("Cookie", adminCookie)
      .send({
        name: "Duplicado",
        email: TEST_EMAILS.client, // já existe
        password: "Senha123456!",
      });
    expect(res.status).toBe(409);
  });

  it("retorna 400 para dados inválidos", async () => {
    const res = await request
      .post("/api/clients")
      .set("Cookie", adminCookie)
      .send({ name: "X", email: "nao-email", password: "123" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/clients/:id", () => {
  it("CLIENT atualiza os próprios dados", async () => {
    const res = await request
      .patch(`/api/clients/${ids.clientId}`)
      .set("Cookie", clientCookie)
      .send({ notes: "Nota atualizada pelo cliente" });
    expect(res.status).toBe(200);
    expect(res.body.client.notes).toBe("Nota atualizada pelo cliente");
  });

  it("CLIENT não consegue alterar status", async () => {
    // Status ignorado silenciosamente para não-admin
    const res = await request
      .patch(`/api/clients/${ids.clientId}`)
      .set("Cookie", clientCookie)
      .send({ status: "INACTIVE" });
    expect(res.status).toBe(200);
    // Status deve continuar ACTIVE
    expect(res.body.client.status).toBe("ACTIVE");
  });

  it("ADMIN altera status", async () => {
    const res = await request
      .patch(`/api/clients/${ids.clientId}`)
      .set("Cookie", adminCookie)
      .send({ status: "INACTIVE" });
    expect(res.status).toBe(200);
    expect(res.body.client.status).toBe("INACTIVE");

    // Reverter
    await request
      .patch(`/api/clients/${ids.clientId}`)
      .set("Cookie", adminCookie)
      .send({ status: "ACTIVE" });
  });
});
