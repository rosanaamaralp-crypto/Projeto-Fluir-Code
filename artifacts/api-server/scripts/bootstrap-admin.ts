/**
 * Bootstrap do primeiro ADMIN do sistema Fluir da Vida.
 *
 * SEGURANÇA:
 * - Aceita dados por variáveis de ambiente (não expõe senha em logs de processo)
 * - Nunca imprime senha ou password_hash
 * - Verifica se já existe ADMIN antes de criar (idempotente)
 * - Executa criação em transação atômica
 * - Fecha o pool após a execução
 *
 * Uso:
 *   BOOTSTRAP_ADMIN_NAME="Maria" \
 *   BOOTSTRAP_ADMIN_EMAIL="maria@fluir.com" \
 *   BOOTSTRAP_ADMIN_PASSWORD="SenhaMuitoForte123!" \
 *   pnpm --filter @workspace/api-server run bootstrap:admin
 *
 * Não cria endpoint público. Não altera migrations.
 */

import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { getDatabaseClient } from "@workspace/db";
import { users } from "@workspace/db";

const ADMIN_ROLE_ID = 1;
const SALT_ROUNDS = 12;

export interface BootstrapInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Verifica se já existe ao menos um usuário ADMIN.
 */
async function hasExistingAdmin(): Promise<boolean> {
  const { db } = getDatabaseClient();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.roleId, ADMIN_ROLE_ID))
    .limit(1);
  return rows.length > 0;
}

/**
 * Cria o primeiro ADMIN em uma transação atômica.
 * Retorna o ID do usuário criado.
 * Nunca imprime senha ou password_hash.
 */
export async function runBootstrap(input: BootstrapInput): Promise<string> {
  const { db, pool } = getDatabaseClient();

  // Validações mínimas
  if (!input.name || input.name.trim().length < 2) {
    throw new Error("Nome inválido: mínimo 2 caracteres.");
  }
  if (!input.email || !input.email.includes("@")) {
    throw new Error("Email inválido.");
  }
  if (!input.password || input.password.length < 8) {
    throw new Error("Senha inválida: mínimo 8 caracteres.");
  }

  // Verificar se já existe ADMIN
  const exists = await hasExistingAdmin();
  if (exists) {
    throw new Error(
      "ADMIN já existe. Bootstrap abortado para proteger o sistema. " +
      "Se precisar de outro ADMIN, use um endpoint administrativo autenticado.",
    );
  }

  const normalizedEmail = input.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const userId = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(users)
      .values({
        roleId: ADMIN_ROLE_ID,
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
      })
      .returning({ id: users.id });

    return rows[0]!.id;
  });

  // Fechar pool para encerrar o processo
  await pool.end();

  return userId;
}

/**
 * Ponto de entrada CLI.
 * Lê dados de variáveis de ambiente — não de argumentos de linha de comando
 * (para evitar que a senha apareça em logs de processo / historico de shell).
 */
async function main(): Promise<void> {
  const name = process.env["BOOTSTRAP_ADMIN_NAME"] ?? "";
  const email = process.env["BOOTSTRAP_ADMIN_EMAIL"] ?? "";
  const password = process.env["BOOTSTRAP_ADMIN_PASSWORD"] ?? "";

  if (!name || !email || !password) {
    console.error(
      "Erro: defina as variáveis de ambiente:\n" +
      "  BOOTSTRAP_ADMIN_NAME\n" +
      "  BOOTSTRAP_ADMIN_EMAIL\n" +
      "  BOOTSTRAP_ADMIN_PASSWORD",
    );
    process.exit(1);
  }

  try {
    const userId = await runBootstrap({ name, email, password });
    console.log(`✅ ADMIN criado com sucesso. ID: ${userId}`);
    console.log(`   Nome:  ${name.trim()}`);
    console.log(`   Email: ${email.toLowerCase().trim()}`);
    // Nunca imprimir senha ou hash
  } catch (err) {
    console.error("❌ Falha ao criar ADMIN:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
