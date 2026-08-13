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

export interface ConcurrencyExtras {
  prof2Id: string;
  prof2UserId: string;
  client2Id: string;
  client2UserId: string;
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
 * Cria segundo profissional e segundo cliente para testes de concorrência (OBS-C).
 * Cases A, B, C precisam de dois profissionais e/ou dois clientes distintos.
 */
export async function seedConcurrencyExtras(ids: TestUsers): Promise<ConcurrencyExtras> {
  const prof2Hash = await bcrypt.hash(TEST_PASSWORDS.professional, SALT_ROUNDS);
  const client2Hash = await bcrypt.hash(TEST_PASSWORDS.client2, SALT_ROUNDS);

  const [prof2User] = await db
    .insert(users)
    .values({
      roleId: 2,
      name: "Profissional 2 Concurrent",
      email: "prof2-appt@fluir.test",
      passwordHash: prof2Hash,
    })
    .returning({ id: users.id });

  const [prof2] = await db
    .insert(professionals)
    .values({ userId: prof2User!.id, specialty: "Massoterapeuta 2", bio: "Bio prof2" })
    .returning({ id: professionals.id });

  const [client2User] = await db
    .insert(users)
    .values({
      roleId: 3,
      name: "Cliente 2 Concurrent",
      email: "client2-appt@fluir.test",
      passwordHash: client2Hash,
    })
    .returning({ id: users.id });

  const [client2] = await db
    .insert(clients)
    .values({ userId: client2User!.id, birthDate: "1992-05-20" })
    .returning({ id: clients.id });

  // Vínculo prof2 → serviceId
  await db
    .insert(professionalServices)
    .values({ professionalId: prof2!.id, serviceId: ids.serviceId, active: true })
    .onConflictDoNothing();

  // Disponibilidade para prof2 (todos os 7 dias, 08:00–20:00)
  for (let w = 0; w <= 6; w++) {
    await db.insert(availability).values({
      professionalId: prof2!.id,
      weekday: w,
      startTime: "08:00",
      endTime: "20:00",
      active: true,
    });
  }

  return {
    prof2Id: prof2!.id,
    prof2UserId: prof2User!.id,
    client2Id: client2!.id,
    client2UserId: client2User!.id,
  };
}

export interface SixConcurrencyExtras {
  /** IDs dos 4 profissionais adicionais (prof3..prof6) */
  extraProfIds: string[];
  /** Emails dos 4 clientes adicionais (client3..client6) */
  extraClientEmails: string[];
  /** IDs dos 4 resources adicionais (macas 2..5) */
  extraResourceIds: string[];
}

/** Emails usados exclusivamente pelo teste F16 de 6 concorrências */
export const QA16_EMAILS = {
  profs: [3, 4, 5, 6].map((n) => `qa16-prof${n}@fluir.test`),
  clients: [3, 4, 5, 6].map((n) => `qa16-client${n}@fluir.test`),
};

/**
 * F16 — Fixtures para o teste literal do Doc 17 §46 (6 simultâneas → 5 + 1×409).
 * Cria 4 profissionais e 4 clientes adicionais (somam 6 com os já existentes)
 * e 4 macas adicionais (somam 5 com "Sala Teste Fase4").
 * Aditivo — não altera nenhum fixture existente.
 */
export async function seedSixConcurrencyExtras(ids: TestUsers): Promise<SixConcurrencyExtras> {
  const profHash = await bcrypt.hash(TEST_PASSWORDS.professional, SALT_ROUNDS);
  const clientHash = await bcrypt.hash(TEST_PASSWORDS.client, SALT_ROUNDS);

  const extraProfIds: string[] = [];
  for (const email of QA16_EMAILS.profs) {
    const [pUser] = await db
      .insert(users)
      .values({ roleId: 2, name: `Prof QA16 ${email}`, email, passwordHash: profHash })
      .returning({ id: users.id });
    const [prof] = await db
      .insert(professionals)
      .values({ userId: pUser!.id, specialty: "Massoterapeuta QA16", bio: "F16" })
      .returning({ id: professionals.id });
    await db
      .insert(professionalServices)
      .values({ professionalId: prof!.id, serviceId: ids.serviceId, active: true })
      .onConflictDoNothing();
    for (let w = 0; w <= 6; w++) {
      await db.insert(availability).values({
        professionalId: prof!.id,
        weekday: w,
        startTime: "08:00",
        endTime: "20:00",
        active: true,
      });
    }
    extraProfIds.push(prof!.id);
  }

  const extraClientEmails: string[] = [];
  for (const email of QA16_EMAILS.clients) {
    const [cUser] = await db
      .insert(users)
      .values({ roleId: 3, name: `Cliente QA16 ${email}`, email, passwordHash: clientHash })
      .returning({ id: users.id });
    await db.insert(clients).values({ userId: cUser!.id, birthDate: "1991-03-15" });
    extraClientEmails.push(email);
  }

  const extraResourceIds: string[] = [];
  for (let n = 2; n <= 5; n++) {
    const [res] = await db
      .insert(resources)
      .values({ name: `Maca QA16 ${n}`, type: "MASSAGE_TABLE", status: "ACTIVE" })
      .returning({ id: resources.id });
    extraResourceIds.push(res!.id);
  }

  return { extraProfIds, extraClientEmails, extraResourceIds };
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
      // F16: emails do teste de 6 concorrências (Doc 17 §46)
      ...QA16_EMAILS.profs,
      ...QA16_EMAILS.clients,
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

      // F8: deletar notificações vinculadas a appointments antes de deletar appointments (FK)
      await pgClient.query(`
        DELETE FROM notifications
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

      // F8: deletar notificações do usuário antes de deletar o usuário (FK notifications.user_id)
      await pgClient.query("DELETE FROM notifications WHERE user_id = $1", [u.id]);

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
    // F16: macas adicionais do teste de 6 concorrências
    await pgClient.query("DELETE FROM resources WHERE name LIKE 'Maca QA16 %'");

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
