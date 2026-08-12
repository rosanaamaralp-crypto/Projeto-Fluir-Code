/**
 * F10 — Segurança: testes de headers HTTP e controles de segurança.
 *
 * Verifica:
 * 1. Headers de segurança do helmet presentes em todas as respostas.
 * 2. Limite de tamanho de body JSON (50 kb).
 * 3. Stack trace nunca exposto em respostas de erro.
 * 4. CORS rejeita origens arbitrárias (sem CORS_ORIGIN env em dev, usa regex *.replit.dev).
 */
import { describe, it, expect } from "vitest";
import { request } from "../helpers/app.js";

// ---------------------------------------------------------------------------
// 1. Security headers (helmet)
// ---------------------------------------------------------------------------
describe("Security headers — helmet", () => {
  // Usa qualquer endpoint público; POST /api/auth/login com credenciais
  // inválidas retorna 401 mas já inclui os headers de segurança.
  it("X-Content-Type-Options: nosniff presente em respostas 4xx", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "nao@existe.com", password: "qualquer" });

    expect(res.status).toBe(401);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("X-Frame-Options presente em respostas 4xx", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "nao@existe.com", password: "qualquer" });

    // helmet define como SAMEORIGIN por padrão
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["x-frame-options"]!.toLowerCase()).toMatch(/sameorigin|deny/);
  });

  it("Referrer-Policy presente em respostas 4xx", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "nao@existe.com", password: "qualquer" });

    expect(res.headers["referrer-policy"]).toBeDefined();
  });

  it("X-DNS-Prefetch-Control presente em respostas 4xx", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "nao@existe.com", password: "qualquer" });

    expect(res.headers["x-dns-prefetch-control"]).toBeDefined();
  });

  it("headers de segurança presentes em respostas 404 (rota inexistente)", async () => {
    const res = await request.get("/api/rota-que-nao-existe");

    expect(res.status).toBe(404);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["referrer-policy"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Body size limit (express.json limit: '50kb')
// ---------------------------------------------------------------------------
describe("Body size limit — 50 kb", () => {
  it("payload JSON > 50 kb retorna 413 Payload Too Large", async () => {
    // Gera um payload ligeiramente acima de 50 kb
    const oversize = { data: "x".repeat(52 * 1024) };

    const res = await request
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(oversize));

    expect(res.status).toBe(413);
  });

  it("payload JSON dentro do limite (< 50 kb) é processado normalmente", async () => {
    // Payload válido pequeno → deve passar pelo parser e chegar no handler (401 ou 400)
    const res = await request
      .post("/api/auth/login")
      .send({ email: "nao@existe.com", password: "qualquer" });

    expect(res.status).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// 3. Stack trace nunca exposto em respostas de erro
// ---------------------------------------------------------------------------
describe("Exposição de stack trace", () => {
  it("resposta 401 não contém stack trace", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ email: "nao@existe.com", password: "qualquer" });

    expect(res.status).toBe(401);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at\s+\w+\s+\(/);    // padrão "at Function (" de stack trace
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toContain("stack");
  });

  it("resposta 404 não contém stack trace", async () => {
    const res = await request.get("/api/rota-inexistente-xyzabc");

    expect(res.status).toBe(404);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at\s+\w+\s+\(/);
    expect(body).not.toContain("stack");
  });

  it("resposta 400 (UUID inválido) não contém stack trace", async () => {
    const res = await request
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send({ email: 123, password: "qualquer" }); // email inválido → 400

    expect(res.status).toBe(400);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at\s+\w+\s+\(/);
    expect(body).not.toContain("stack");
  });
});

// ---------------------------------------------------------------------------
// 4. CORS — origens não autorizadas não recebem ACAO header
// ---------------------------------------------------------------------------
describe("CORS — controle de origem", () => {
  it("origem arbitrária (attacker.com) não recebe Access-Control-Allow-Origin", async () => {
    const res = await request
      .get("/api/auth/me")
      .set("Origin", "https://attacker.com");

    // O servidor deve responder mas sem refletir a origem do atacante
    const acao = res.headers["access-control-allow-origin"];
    expect(acao).not.toBe("https://attacker.com");
    expect(acao).not.toBe("*");
  });

  it("origem *.replit.dev recebe Access-Control-Allow-Origin (fallback dev)", async () => {
    // Em ambiente de testes, CORS_ORIGIN não está definido, então o fallback
    // /\.replit\.dev$/ é usado. Uma origem desse padrão deve ser refletida.
    const res = await request
      .get("/api/auth/me")
      .set("Origin", "https://abc123.replit.dev");

    const acao = res.headers["access-control-allow-origin"];
    // Deve refletir exatamente a origem enviada (cors com credentials: true)
    expect(acao).toBe("https://abc123.replit.dev");
  });
});
