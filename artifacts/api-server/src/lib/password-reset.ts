/**
 * T-003 (F17.3) — Tokens de recuperação de senha SEM tabela nova.
 *
 * Estratégia stateless (padrão Django PasswordResetTokenGenerator):
 * o token é `base64url(userId.exp).assinatura`, onde a assinatura é
 * HMAC-SHA256 com chave = SESSION_SECRET, sobre o payload + um derivado do
 * password_hash ATUAL do usuário.
 *
 * Propriedades garantidas:
 * - Seguro: inforjável sem SESSION_SECRET (HMAC-SHA256, comparação timing-safe).
 * - Temporário: `exp` embutido e verificado (TTL configurável, padrão 60 min).
 * - Uso único: ao redefinir a senha o password_hash muda → a assinatura de
 *   qualquer token anterior deixa de bater → token invalidado após o uso.
 * - Sem migration: nenhuma tabela nova (estrutura reutilizada: users.password_hash).
 */
import crypto from "node:crypto";

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set before starting the server.");
}
const SECRET: string = SESSION_SECRET;

/** TTL do token em minutos (padrão 60; configurável por ambiente). */
function getTtlMs(): number {
  const minutes = Number(process.env["PASSWORD_RESET_TTL_MINUTES"] ?? "60");
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 60) * 60 * 1000;
}

function sign(payload: string, currentPasswordHash: string): string {
  // O hash da senha entra no material assinado (não na chave) — troca de senha
  // invalida todos os tokens emitidos antes dela.
  const material = `${payload}:${crypto.createHash("sha256").update(currentPasswordHash).digest("hex")}`;
  return crypto.createHmac("sha256", SECRET).update(material).digest("base64url");
}

/** Gera um token de recuperação para o usuário. */
export function createResetToken(userId: string, currentPasswordHash: string): string {
  // Math.floor: exp deve ser inteiro — o payload usa "." como separador
  const exp = Math.floor(Date.now() + getTtlMs());
  const payload = Buffer.from(`${userId}.${exp}`, "utf8").toString("base64url");
  return `${payload}.${sign(payload, currentPasswordHash)}`;
}

/** Extrai o userId do token SEM validar assinatura (para buscar o usuário). */
export function parseResetToken(token: string): { userId: string; exp: number; payload: string; signature: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [payload, signature] = parts as [string, string];
  let decoded: string;
  try {
    decoded = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const sep = decoded.lastIndexOf(".");
  if (sep <= 0) return null;
  const userId = decoded.slice(0, sep);
  const exp = Number(decoded.slice(sep + 1));
  if (!userId || !Number.isFinite(exp)) return null;
  return { userId, exp, payload, signature };
}

/** Verifica assinatura + expiração contra o password_hash atual. */
export function verifyResetToken(
  parsed: { exp: number; payload: string; signature: string },
  currentPasswordHash: string,
): boolean {
  if (Date.now() > parsed.exp) return false;
  const expected = sign(parsed.payload, currentPasswordHash);
  const a = Buffer.from(parsed.signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
