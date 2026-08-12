/**
 * Seed de dados para testes de integração.
 * Cleanup usa DISABLE/ENABLE TRIGGER nos logs append-only — exclusivo para testes.
 *
 * Fase 4: estendido para incluir cleanup de appointments e appointment_status_history.
 */
import bcrypt from "bcrypt";
import { getDatabaseClient } from "@workspace/db";
import {
  users,
  clients,
  professionals,
  services,
  resources,
  availability,
  professionalServices,
  addresses,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const { db, pool } = getDatabaseClient();

const SALT_ROUNDS = 10; // Menor para testes (mais rápido)

export const TEST_PASSWORDS = {
  admin: "AdminPass123!",
  professional: "ProfPass123!",
  client: "ClientPass123!",
  client2: "Client2Pass123!",
};

export const TEST_EMAILS = {
  admin: "admin-test@fluir.test",
  professional: "prof-test@fluir.test",
  client: "client-test@fluir.test",
};

export const TEST_SERVICE_NAMES = [
  "Massagem Teste",
  "Massagem Domiciliar Teste",
];

export interface TestUsers {
  adminId: string;
  professionalId: string;
  professionalUserId: string;
  clientId: string;
  clientUserId: string;
  serviceId: string;
}

export interface AppointmentTestExtras {
  resourceId: string;
  serviceHomeCareId: string;
  availabilityId: string;
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
 * Cria fixtures adicionais necessárias para testes de appointments:
 * - Resource (para IN_PERSON)
 * - Serviço HOME_CARE
 * - Janela de disponibilidade do profissional (todos os dias, 08:00–20:00)
 * - Vínculo professional_services para ambos os serviços
 * - Endereço do cliente (para HOME_CARE)
 */
export async function seedAppointmentExtras(ids: TestUsers): Promise<AppointmentTestExtras> {
  // Resource para IN_PERSON
  const [resource] = await db
    .insert(resources)
    .values({ name: "Sala Teste Fase4", type: "MASSAGE_TABLE", status: "ACTIVE" })
    .returning({ id: resources.id });

  // Serviço exclusivo HOME_CARE
  const [svcHc] = await db
    .insert(services)
    .values({
      name: "Massagem Domiciliar Teste",
      durationMinutes: 60,
      price: "120.00",
      allowedModalities: "HOME_CARE",
      status: "ACTIVE",
    })
    .returning({ id: services.id });

  // Disponibilidade para todos os dias da semana (0–6), 08:00–20:00
  const [avail] = await db
    .insert(availability)
    .values({
      professionalId: ids.professionalId,
      weekday: new Date().getUTCDay(), // dia atual
      startTime: "08:00",
      endTime: "20:00",
      active: true,
    })
    .returning({ id: availability.id });

  // Garantir disponibilidade para todos os 7 dias (necessário nos testes)
  for (let w = 0; w <= 6; w++) {
    if (w === new Date().getUTCDay()) continue; // já inserido
    await db.insert(availability).values({
      professionalId: ids.professionalId,
      weekday: w,
      startTime: "08:00",
      endTime: "20:00",
      active: true,
    }).onConflictDoNothing();
  }

  // Vínculos professional_services
  await db
    .insert(professionalServices)
    .values({ professionalId: ids.professionalId, serviceId: ids.serviceId, active: true })
    .onConflictDoNothing();

  await db
    .insert(professionalServices)
    .values({ professionalId: ids.professionalId, serviceId: svcHc!.id, active: true })
    .onConflictDoNothing();

  // Endereço do cliente (HOME_CARE)
  await db.insert(addresses).values({
    clientId: ids.clientId,
    street: "Rua dos Testes",
    number: "123",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    postalCode: "01310-100",
    isDefault: true,
  }).onConflictDoNothing();

  return {
    resourceId: resource!.id,
    serviceHomeCareId: svcHc!.id,
    availabilityId: avail!.id,
  };
}

/**
 * Limpa dados de teste.
 * DISABLE/ENABLE TRIGGER usado exclusivamente aqui para remover dados append-only.
 * Os triggers são reativados imediatamente após o cleanup.
 * Mecanismo permitido somente em scripts de teste (conforme decisão da Fase 3).
 *
 * Fase 4: inclui cleanup de appointment_status_history e appointments.
 */
export async function cleanTestData(): Promise<void> {
  const pgClient = await pool.connect();
  try {
    await pgClient.query("BEGIN");

    // Desabilitar triggers append-only para limpeza de dados de teste
    await pgClient.query("ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_no_delete");
    await pgClient.query("ALTER TABLE appointment_status_history DISABLE TRIGGER trg_appt_history_no_delete");

    const testEmails = [
      ...Object.values(TEST_EMAILS),
      "criado-client@fluir.test",
      "outro-client@fluir.test",
      "prof-criado@fluir.test",
      "outro-prof-test@fluir.test",
      "outro-prof2-rbac@fluir.test",
      // P1: bootstrap admin test email
      "bootstrap-admin@fluir.test",
      // Fase 4: emails adicionais de testes de appointments
      "client2-appt@fluir.test",
      "prof2-appt@fluir.test",
    ];

    // Fase 4: limpar appointments e status_history vinculados a usuários de teste
    // (antes de deletar clients/professionals, pois FKs referenciam esses)
    for (const email of testEmails) {
      await pgClient.query(`
        DELETE FROM appointment_status_history
        WHERE appointment_id IN (
          SELECT a.id FROM appointments a
          WHERE a.client_id IN (
            SELECT c.id FROM clients c
            WHERE c.user_id = (SELECT id FROM users WHERE lower(email) = lower($1))
          )
          OR a.professional_id IN (
            SELECT p.id FROM professionals p
            WHERE p.user_id = (SELECT id FROM users WHERE lower(email) = lower($1))
          )
        )
      `, [email]);

      await pgClient.query(`
        DELETE FROM appointments
        WHERE client_id IN (
          SELECT c.id FROM clients c
          WHERE c.user_id = (SELECT id FROM users WHERE lower(email) = lower($1))
        )
        OR professional_id IN (
          SELECT p.id FROM professionals p
          WHERE p.user_id = (SELECT id FROM users WHERE lower(email) = lower($1))
        )
      `, [email]);
    }

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
    for (const name of TEST_SERVICE_NAMES) {
      await pgClient.query("DELETE FROM services WHERE name = $1", [name]);
    }
    await pgClient.query("DELETE FROM services WHERE name = 'Massagem Teste'");

    // Limpar resources de teste (Fase 4)
    await pgClient.query("DELETE FROM resources WHERE name = 'Sala Teste Fase4'");

    // Reativar triggers imediatamente após o cleanup
    await pgClient.query("ALTER TABLE appointment_status_history ENABLE TRIGGER trg_appt_history_no_delete");
    await pgClient.query("ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_no_delete");

    await pgClient.query("COMMIT");
  } catch (err) {
    await pgClient.query("ROLLBACK").catch(() => {});
    // Garantir reativação mesmo em caso de erro
    await pgClient.query("ALTER TABLE appointment_status_history ENABLE TRIGGER trg_appt_history_no_delete").catch(() => {});
    await pgClient.query("ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_no_delete").catch(() => {});
    throw err;
  } finally {
    pgClient.release();
  }
}
