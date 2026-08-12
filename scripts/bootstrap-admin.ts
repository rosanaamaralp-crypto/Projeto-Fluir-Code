#!/usr/bin/env node
/**
 * Bootstrap do primeiro ADMIN — script CLI seguro.
 *
 * Uso:
 *   pnpm --filter @workspace/scripts run bootstrap-admin
 *
 * Ou diretamente:
 *   node --import tsx/esm scripts/bootstrap-admin.ts
 *
 * Regras:
 * - Verifica se já existe um ADMIN antes de criar.
 * - Recusa a operação se já houver qualquer ADMIN.
 * - Nunca exibe a senha nos logs.
 * - Usa bcrypt com salt rounds 12.
 * - Cria apenas o registro em `users` com role_id = 1 (ADMIN).
 * - NÃO cria client nem professional.
 */

import pg from "pg";
import bcrypt from "bcrypt";
import readline from "node:readline";

const { Client } = pg;
const SALT_ROUNDS = 12;
const ADMIN_ROLE_ID = 1;

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden) {
      // Ocultar input da senha
      process.stdout.write(question);
      let password = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (char: string) => {
        if (char === "\r" || char === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          rl.close();
          resolve(password);
        } else if (char === "\u0003") {
          // Ctrl+C
          process.stdout.write("\n");
          process.exit(1);
        } else if (char === "\u007f") {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += char;
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function main() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    console.error("[bootstrap-admin] ERRO: DATABASE_URL não está definido.");
    process.exit(1);
  }

  console.log("\n=== Bootstrap do primeiro ADMIN ===\n");
  console.log("Verificando banco de dados...");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // Verificar se já existe algum ADMIN
    const { rows } = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users WHERE role_id = $1",
      [ADMIN_ROLE_ID],
    );
    const adminCount = parseInt(rows[0]?.count ?? "0", 10);

    if (adminCount > 0) {
      console.error(
        `[bootstrap-admin] RECUSADO: já existe ${adminCount} usuário(s) com role ADMIN.`,
      );
      console.error(
        "[bootstrap-admin] Este script só pode ser executado quando não há nenhum ADMIN.",
      );
      process.exit(1);
    }

    console.log("[bootstrap-admin] Nenhum ADMIN encontrado. Prosseguindo...\n");

    // Coletar dados do novo ADMIN
    const name = await prompt("Nome completo do ADMIN: ");
    if (!name || name.length < 2) {
      console.error("[bootstrap-admin] ERRO: Nome inválido.");
      process.exit(1);
    }

    const email = await prompt("Email do ADMIN: ");
    if (!email || !email.includes("@")) {
      console.error("[bootstrap-admin] ERRO: Email inválido.");
      process.exit(1);
    }

    const password = await prompt("Senha (mín. 8 caracteres): ", true);
    if (!password || password.length < 8) {
      console.error("[bootstrap-admin] ERRO: Senha deve ter no mínimo 8 caracteres.");
      process.exit(1);
    }

    const confirmPassword = await prompt("Confirme a senha: ", true);
    if (password !== confirmPassword) {
      console.error("[bootstrap-admin] ERRO: Senhas não coincidem.");
      process.exit(1);
    }

    console.log("\n[bootstrap-admin] Criando usuário ADMIN...");

    // Hash da senha — nunca armazenar em plaintext
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Verificar se o email já está em uso (case-insensitive)
    const emailCheck = await client.query(
      "SELECT id FROM users WHERE lower(email) = lower($1)",
      [email],
    );
    if (emailCheck.rows.length > 0) {
      console.error("[bootstrap-admin] ERRO: Este email já está em uso.");
      process.exit(1);
    }

    // Inserir ADMIN
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `INSERT INTO users (role_id, name, email, password_hash, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id`,
      [ADMIN_ROLE_ID, name, email, passwordHash],
    );
    await client.query("COMMIT");

    const adminId = result.rows[0]?.id;
    console.log(`\n[bootstrap-admin] ADMIN criado com sucesso!`);
    console.log(`  ID:    ${adminId}`);
    console.log(`  Nome:  ${name}`);
    console.log(`  Email: ${email}`);
    console.log(`\nUse estas credenciais para fazer login em POST /api/auth/login\n`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[bootstrap-admin] ERRO inesperado:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
