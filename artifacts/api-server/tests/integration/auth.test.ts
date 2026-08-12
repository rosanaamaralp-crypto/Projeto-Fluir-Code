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

beforeAll(async () => {
  ids = await seedTestData();
});

afterAll(async () => {
  await cleanTestData();
});

describe("POST /api/auth/login", () => {
  it("retorna 200 e cookie de sessão com credenciais válidas (admin)", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: TEST_EMAILS.admin, password: TEST_PASSWORDS.admin });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAILS.admin);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("retorna 200 para professional", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: TEST_EMAILS.professional, password: TEST_PASSWORDS.professional });
    expect(res.status).toBe(200);
    expect(res.body.user.roleId).toBe(2);
  });

  it("retorna 401 para senha incorreta", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: TEST_EMAILS.admin, password: "SenhaErrada999!" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("retorna 401 para email inexistente (resposta indistinguível da senha errada)", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "naoexiste@teste.com", password: "SenhaQualquer123!" });
    expect(res.status).toBe(401);
    // A mensagem deve ser IDÊNTICA para ambos os casos (user enumeration prevention)
    expect(res.body.error.message).toBe("Email ou senha inválidos.");
  });

  it("retorna 401 para senha errada (mesma mensagem — user enumeration)", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: TEST_EMAILS.admin, password: "SenhaErrada!" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Email ou senha inválidos.");
  });

  it("nunca retorna password_hash na resposta", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: TEST_EMAILS.admin, password: TEST_PASSWORDS.admin });
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("password_hash");
  });

  it("retorna 400 para email inválido", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "nao-é-email", password: "Senha123!" });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para senha vazia", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: TEST_EMAILS.admin, password: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("retorna 401 sem sessão", async () => {
    const res = await request.get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("retorna dados do usuário autenticado", async () => {
    const cookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);
    const res = await request.get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_EMAILS.admin);
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });
});

describe("POST /api/auth/logout", () => {
  it("retorna 401 sem sessão", async () => {
    const res = await request.post("/api/auth/logout");
    expect(res.status).toBe(401);
  });

  it("encerra sessão e cookie fica inválido após logout", async () => {
    const cookie = await loginAs(TEST_EMAILS.admin, TEST_PASSWORDS.admin);

    const logoutRes = await request
      .post("/api/auth/logout")
      .set("Cookie", cookie);
    expect(logoutRes.status).toBe(200);

    // Cookie antigo não deve mais funcionar
    const meRes = await request.get("/api/auth/me").set("Cookie", cookie);
    expect(meRes.status).toBe(401);
  });
});

describe("Rate limiting — POST /api/auth/login", () => {
  it("bloqueia após 10 tentativas consecutivas", async () => {
    const email = "ratelimit-test@fluir.test";
    const requests = Array.from({ length: 11 }, (_, i) =>
      request
        .post("/api/auth/login")
        .send({ email, password: `SenhaErrada${i}!` }),
    );

    const results = await Promise.all(requests);
    const statuses = results.map((r) => r.status);

    // Pelo menos uma deve ter sido bloqueada (429)
    expect(statuses).toContain(429);
  });
});
