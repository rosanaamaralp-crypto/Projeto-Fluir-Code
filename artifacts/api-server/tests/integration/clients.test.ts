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

  it("PROFESSIONAL lista a base de clientes cadastrados — F21", async () => {
    // F21: o profissional pode buscar clientes já cadastrados (inclusive
    // atendidos por outros profissionais) para agendar/cadastrar.
    const res = await request.get("/api/clients").set("Cookie", profCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.clients)).toBe(true);
    expect(res.body.clients.length).toBeGreaterThan(0);
    expect(res.body.clients[0].name).toBeDefined();
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
  it("CLIENT não pode criar cliente (403) — F20", async () => {
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

  it("F20: PROFESSIONAL cria cliente e ele entra em seus clientes (relacionamento)", async () => {
    const res = await request
      .post("/api/clients")
      .set("Cookie", profCookie)
      .send({
        name: "Cliente do Profissional F20",
        email: `criado-pelo-prof-${Date.now()}@fluir.test`,
        password: "Senha123456!",
        phone: "(11) 98888-0000",
      });
    expect(res.status).toBe(201);
    expect(res.body.client).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    const newClientId = res.body.client.id as string;

    // Aparece na lista "Meus Clientes" do profissional
    const list = await request.get("/api/me/professional/clients").set("Cookie", profCookie);
    expect(list.status).toBe(200);
    const found = (list.body.clients as Array<{ id: string }>).find((c) => c.id === newClientId);
    expect(found).toBeDefined();

    // Detalhe acessível pelo profissional criador
    const detail = await request
      .get(`/api/me/professional/clients/${newClientId}`)
      .set("Cookie", profCookie);
    expect(detail.status).toBe(200);
  });

  it("F20: cliente criado pelo ADMIN não fica visível ao profissional sem relacionamento (404)", async () => {
    const res = await request
      .post("/api/clients")
      .set("Cookie", adminCookie)
      .send({
        name: "Cliente do Admin F20",
        email: `criado-pelo-admin-f20-${Date.now()}@fluir.test`,
        password: "Senha123456!",
      });
    expect(res.status).toBe(201);

    const detail = await request
      .get(`/api/me/professional/clients/${res.body.client.id}`)
      .set("Cookie", profCookie);
    expect(detail.status).toBe(404);
  });

  it("F20: PROFESSIONAL com email duplicado recebe 409 (sem duplicidade)", async () => {
    const res = await request
      .post("/api/clients")
      .set("Cookie", profCookie)
      .send({
        name: "Duplicado Prof",
        email: TEST_EMAILS.client, // já existe
        password: "Senha123456!",
      });
    expect(res.status).toBe(409);
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

  it("CLIENT edita nome, telefone e data de nascimento (F15 D5)", async () => {
    const res = await request
      .patch(`/api/clients/${ids.clientId}`)
      .set("Cookie", clientCookie)
      .send({ name: "Cliente Renomeado", phone: "11988887777", birthDate: "1991-03-15" });
    expect(res.status).toBe(200);
    expect(res.body.client.birthDate).toBe("1991-03-15");

    // Confirma que name/phone foram persistidos em users (via GET enriquecido)
    const check = await request
      .get(`/api/clients/${ids.clientId}`)
      .set("Cookie", clientCookie);
    expect(check.status).toBe(200);
    expect(check.body.client.name).toBe("Cliente Renomeado");
    expect(check.body.client.phone).toBe("11988887777");
  });

  it("CLIENT não consegue alterar email, role, clientId ou userId (F15 D5)", async () => {
    const before = await request
      .get(`/api/clients/${ids.clientId}`)
      .set("Cookie", clientCookie);
    const originalEmail = before.body.client.email;

    const res = await request
      .patch(`/api/clients/${ids.clientId}`)
      .set("Cookie", clientCookie)
      .send({
        email: "hacker@fluir.test",
        role: "ADMIN",
        roleId: 1,
        id: "00000000-0000-0000-0000-000000000000",
        clientId: "00000000-0000-0000-0000-000000000000",
        userId: "00000000-0000-0000-0000-000000000000",
      });
    // Campos desconhecidos são ignorados pelo schema (strip)
    expect(res.status).toBe(200);
    expect(res.body.client.id).toBe(ids.clientId);
    expect(res.body.client.userId).toBe(ids.clientUserId);

    const after = await request
      .get(`/api/clients/${ids.clientId}`)
      .set("Cookie", clientCookie);
    expect(after.body.client.email).toBe(originalEmail);
  });

  it("CLIENT não consegue editar outro client (IDOR) — 403", async () => {
    // Cria um segundo client via ADMIN
    const created = await request
      .post("/api/clients")
      .set("Cookie", adminCookie)
      .send({
        name: "Outro Cliente IDOR",
        email: `idor-target-${Date.now()}@fluir.test`,
        password: "SenhaForte123!",
      });
    expect(created.status).toBe(201);
    const otherClientId = created.body.client.id;

    const res = await request
      .patch(`/api/clients/${otherClientId}`)
      .set("Cookie", clientCookie)
      .send({ name: "Invasao" });
    expect(res.status).toBe(403);
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
