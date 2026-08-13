/**
 * T-003 (F17.3) — Recuperação de senha
 *
 * Cobre o ciclo completo:
 * - forgot-password: resposta genérica idêntica para e-mail existente e
 *   inexistente (não revela existência);
 * - reset-password: token válido troca a senha (login novo funciona, antigo não);
 * - uso único: o mesmo token não pode ser reutilizado após a troca;
 * - token adulterado / malformado → 401;
 * - token expirado → 401.
 *
 * MAIL_DRIVER=console é forçado para não enviar e-mails reais durante testes.
 */
process.env["MAIL_DRIVER"] = "console";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request } from "../helpers/app.js";
import {
  seedTestData,
  cleanTestData,
  TEST_EMAILS,
  TEST_PASSWORDS,
  type TestUsers,
} from "../helpers/seed.js";
import { getDatabaseClient } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createResetToken } from "../../src/lib/password-reset.js";

const { db } = getDatabaseClient();

let ids: TestUsers;

const NEW_PASSWORD = "NovaSenhaSegura123!";

async function getClientUser() {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, TEST_EMAILS.client))
    .limit(1);
  expect(rows[0]).toBeDefined();
  return rows[0]!;
}

beforeAll(async () => {
  ids = await seedTestData();
  void ids;
}, 60000);

afterAll(async () => {
  await cleanTestData();
});

describe("T-003 — POST /api/auth/forgot-password", () => {
  it("resposta genérica idêntica para e-mail existente e inexistente", async () => {
    const existing = await request
      .post("/api/auth/forgot-password")
      .send({ email: TEST_EMAILS.client });
    const unknown = await request
      .post("/api/auth/forgot-password")
      .send({ email: "nao-existe-t003@fluir.test" });

    expect(existing.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(existing.body).toEqual(unknown.body);
  });

  it("e-mail inválido → 400", async () => {
    const res = await request
      .post("/api/auth/forgot-password")
      .send({ email: "nao-e-email" });
    expect(res.status).toBe(400);
  });
});

describe("T-003 — POST /api/auth/reset-password", () => {
  it("token válido redefine a senha; token é de uso único; login reflete a troca", async () => {
    const user = await getClientUser();
    const token = createResetToken(user.id, user.passwordHash);

    // 1. Redefinir com token válido
    const reset = await request
      .post("/api/auth/reset-password")
      .send({ token, password: NEW_PASSWORD });
    expect(reset.status).toBe(200);

    // 2. Login com a senha ANTIGA falha
    const oldLogin = await request
      .post("/api/auth/login")
      .send({ email: TEST_EMAILS.client, password: TEST_PASSWORDS.client });
    expect(oldLogin.status).toBe(401);

    // 3. Login com a NOVA senha funciona
    const newLogin = await request
      .post("/api/auth/login")
      .send({ email: TEST_EMAILS.client, password: NEW_PASSWORD });
    expect(newLogin.status).toBe(200);

    // 4. USO ÚNICO: mesmo token de novo → 401 (hash mudou, assinatura não bate)
    const reuse = await request
      .post("/api/auth/reset-password")
      .send({ token, password: "OutraSenha123!" });
    expect(reuse.status).toBe(401);
  });

  it("token adulterado → 401", async () => {
    const user = await getClientUser();
    const token = createResetToken(user.id, user.passwordHash);
    const tampered = token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");

    const res = await request
      .post("/api/auth/reset-password")
      .send({ token: tampered, password: "SenhaQualquer123!" });
    expect(res.status).toBe(401);
  });

  it("token malformado → 401", async () => {
    const res = await request
      .post("/api/auth/reset-password")
      .send({ token: "lixo-completamente-invalido-1234567890", password: "SenhaQualquer123!" });
    expect(res.status).toBe(401);
  });

  it("token expirado → 401", async () => {
    const user = await getClientUser();

    // TTL mínimo (frações de minuto) para gerar token já vencido
    const prevTtl = process.env["PASSWORD_RESET_TTL_MINUTES"];
    process.env["PASSWORD_RESET_TTL_MINUTES"] = "0.000001";
    const expired = createResetToken(user.id, user.passwordHash);
    if (prevTtl === undefined) {
      delete process.env["PASSWORD_RESET_TTL_MINUTES"];
    } else {
      process.env["PASSWORD_RESET_TTL_MINUTES"] = prevTtl;
    }

    await new Promise((r) => setTimeout(r, 20));

    const res = await request
      .post("/api/auth/reset-password")
      .send({ token: expired, password: "SenhaQualquer123!" });
    expect(res.status).toBe(401);
  });

  it("corrida: dois resets simultâneos com o MESMO token → exatamente 1 sucesso", async () => {
    const user = await getClientUser();
    const token = createResetToken(user.id, user.passwordHash);

    const [r1, r2] = await Promise.all([
      request
        .post("/api/auth/reset-password")
        .send({ token, password: "CorridaSenhaA123!" }),
      request
        .post("/api/auth/reset-password")
        .send({ token, password: "CorridaSenhaB123!" }),
    ]);

    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 401]);
  });

  it("senha curta demais → 400", async () => {
    const user = await getClientUser();
    const token = createResetToken(user.id, user.passwordHash);
    const res = await request
      .post("/api/auth/reset-password")
      .send({ token, password: "curta" });
    expect(res.status).toBe(400);
  });
});
