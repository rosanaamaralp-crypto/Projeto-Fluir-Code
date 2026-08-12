/**
 * Helper para testes HTTP com supertest.
 * Cria uma instância do app para uso nos testes.
 */
import supertest from "supertest";
import app from "../../src/app.js";

export const request = supertest(app);

/**
 * Faz login e retorna o cookie de sessão para uso nos próximos requests.
 */
export async function loginAs(
  email: string,
  password: string,
): Promise<string> {
  const res = await request
    .post("/api/auth/login")
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(
      `Login falhou para ${email}: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }

  const setCookie = res.headers["set-cookie"] as string[] | string | undefined;
  if (!setCookie) throw new Error("Cookie de sessão não retornado no login.");
  const cookie = Array.isArray(setCookie) ? setCookie[0]! : setCookie;
  return cookie;
}
