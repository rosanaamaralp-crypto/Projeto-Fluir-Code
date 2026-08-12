/**
 * Seed de dados para testes de integração.
 * Cleanup usa DISABLE/ENABLE TRIGGER nos logs append-only — exclusivo para testes.
 */
import bcrypt from "bcrypt";
import { getDatabaseClient } from "@workspace/db";
import { users, clients, professionals, services } from "@workspace/db";
import { eq } from "drizzle-orm";

const { db, pool } = getDatabaseClient();

const SALT_ROUNDS = 10; // Menor para testes (mais rápido)

export const TEST_PASSWORDS = {
  admin: "AdminPass123!",
  professional: "ProfPass123!",
  client: "ClientPass123!",
};

export const TEST_EMAILS = {
  admin: "admin-test@fluir.test",
  professional: "prof-test@fluir.test",
  client: "client-test@fluir.test",
};

export interface TestUsers {
  adminId: string;
  professionalId: string;
  professionalUserId: string;
  clientId: string;
  clientUserId: string;
  serviceId: string;
}

export async function seedTestData(): Promise<TestUsers> {
  await cleanTestData();

  const adminHash = await bcrypt.hash(TEST_PASSWORDS.admin, SALT_ROUNDS);
  const profHash = await bcrypt.hash(TEST_PASSWORDS.professional, SALT_ROUNDS);
  const clientHash = await bcrypt.hash(TEST_PASSWORDS.client, SALT_ROUNDS);

  const [adminUser] = await db
    .insert(users)
    .values({ roleId: 1, name: "Admin Teste", email: TEST_EMAILS.admin, passwordHash: adminHash })
    .returning({ id: users.id });

  const [profUser] = await db
    .insert(users)
    .values({ roleId: 2, name: "Profissional Teste", email: TEST_EMAILS.professional, passwordHash: profHash })
    .returning({ id: users.id });

  const [prof] = await db
    .insert(professionals)
    .values({ userId: profUser!.id, specialty: "Massoterapeuta", bio: "Bio de teste" })
    .returning({ id: professionals.id });

  const [clientUser] = await db
    .insert(users)
    .values({ roleId: 3, name: "Cliente Teste", email: TEST_EMAILS.client, passwordHash: clientHash })
    .returning({ id: users.id });

  const [client] = await db
    .insert(clients)
    .values({ userId: clientUser!.id, birthDate: "1990-01-01" })
    .returning({ id: clients.id });

  const [svc] = await db
    .insert(services)
    .values({ name: "Massagem Teste", durationMinutes: 60, price: "100.00", allowedModalities: "BOTH" })
    .returning({ id: services.id });

  return {
    adminId: adminUser!.id,
    professionalId: prof!.id,
    professionalUserId: profUser!.id,
    clientId: client!.id,
    clientUserId: clientUser!.id,
    serviceId: svc!.id,
  };
}

/**
 * Limpa dados de teste.
 * DISABLE/ENABLE TRIGGER é usado exclusivamente aqui para remover audit_logs
 * referenciados pelos usuários de teste. Os triggers são reativados imediatamente.
 * Mecanismo permitido somente em scripts de teste (conforme decisão da Fase 3).
 */
export async function cleanTestData(): Promise<void> {
  const pgClient = await pool.connect();
  try {
    await pgClient.query("BEGIN");

    // Desabilitar trigger append-only SOMENTE para limpeza de dados de teste
    await pgClient.query("ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_no_delete");

    const testEmails = [
      ...Object.values(TEST_EMAILS),
      "criado-client@fluir.test",
      "outro-client@fluir.test",
      "prof-criado@fluir.test",
      "outro-prof-test@fluir.test",
      "outro-prof2-rbac@fluir.test",
      // P1: bootstrap admin test email
      "bootstrap-admin@fluir.test",
    ];

    for (const email of testEmails) {
      const result = await pgClient.query<{ id: string; role_id: number }>(
        "SELECT id, role_id FROM users WHERE lower(email) = lower($1)",
        [email],
      );
      const u = result.rows[0];
      if (!u) continue;

      // Remover audit_logs do usuário (trigger desabilitado neste bloco)
      await pgClient.query("DELETE FROM audit_logs WHERE user_id = $1", [u.id]);

      if (u.role_id === 3) {
        // Endereços do cliente
        await pgClient.query(
          "DELETE FROM addresses WHERE client_id IN (SELECT id FROM clients WHERE user_id = $1)",
          [u.id],
        );
        await pgClient.query("DELETE FROM clients WHERE user_id = $1", [u.id]);
      } else if (u.role_id === 2) {
        const profResult = await pgClient.query<{ id: string }>(
          "SELECT id FROM professionals WHERE user_id = $1",
          [u.id],
        );
        for (const prof of profResult.rows) {
          // Remover entidades que referenciam professionals (ordem importa: FK)
          await pgClient.query(
            "DELETE FROM blocked_periods WHERE professional_id = $1",
            [prof.id],
          );
          await pgClient.query(
            "DELETE FROM professional_services WHERE professional_id = $1",
            [prof.id],
          );
          await pgClient.query(
            "DELETE FROM availability WHERE professional_id = $1",
            [prof.id],
          );
        }
        await pgClient.query("DELETE FROM professionals WHERE user_id = $1", [u.id]);
      }

      await pgClient.query("DELETE FROM users WHERE id = $1", [u.id]);
    }

    // Limpar services de teste
    await pgClient.query("DELETE FROM services WHERE name = 'Massagem Teste'");

    // Reativar trigger imediatamente após o cleanup
    await pgClient.query("ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_no_delete");

    await pgClient.query("COMMIT");
  } catch (err) {
    await pgClient.query("ROLLBACK").catch(() => {});
    // Garantir reativação mesmo em caso de erro
    await pgClient.query("ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_no_delete").catch(() => {});
    throw err;
  } finally {
    pgClient.release();
  }
}
