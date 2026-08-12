import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import { AuthService } from "../../../src/services/auth.service.js";

describe("AuthService.hashPassword", () => {
  it("deve gerar um hash bcrypt válido", async () => {
    const hash = await AuthService.hashPassword("SenhaSegura123!");
    expect(hash).toMatch(/^\$2b\$/);
    expect(hash.length).toBeGreaterThan(30);
  });

  it("hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const h1 = await AuthService.hashPassword("Senha123!");
    const h2 = await AuthService.hashPassword("Senha123!");
    expect(h1).not.toBe(h2);
  });

  it("hash gerado deve ser verificável com bcrypt.compare", async () => {
    const password = "MinhaSenh@123";
    const hash = await AuthService.hashPassword(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare("SenhaErrada", hash)).toBe(false);
  });
});
