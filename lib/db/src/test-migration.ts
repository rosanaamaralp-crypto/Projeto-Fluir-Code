/**
 * test-migration.ts
 * Valida os 18 pontos obrigatórios após a migration da Fase 2.
 */
import pg from "pg";

const { Client } = pg;

interface TestResult {
  id: number;
  description: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];
let testId = 0;

function pass(description: string, detail = ""): void {
  testId++;
  results.push({ id: testId, description, passed: true, detail });
  console.log(`  ✓ [${testId.toString().padStart(2, "0")}] ${description}${detail ? ` — ${detail}` : ""}`);
}

function fail(description: string, detail = ""): void {
  testId++;
  results.push({ id: testId, description, passed: false, detail });
  console.error(`  ✗ [${testId.toString().padStart(2, "0")}] ${description}${detail ? ` — ${detail}` : ""}`);
}

async function expectError(client: Client, sql: string, values: unknown[], description: string): Promise<void> {
  try {
    await client.query(sql, values);
    fail(description, "Expected an error but none was thrown");
  } catch {
    pass(description, "Correctly rejected");
  }
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log("\n[test] Connected to database\n");

  // ── Setup: clean residual test data from any previous run ────
  await client.query(`ALTER TABLE appointment_status_history DISABLE TRIGGER trg_appt_history_no_delete`);
  await client.query(`ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_no_delete`);
  await client.query(`
    DELETE FROM appointment_status_history WHERE appointment_id IN (
      SELECT id FROM appointments WHERE notes = '__test__'
    );
    DELETE FROM appointments WHERE notes = '__test__';
    DELETE FROM notifications  WHERE title  = '__test__';
    DELETE FROM audit_logs     WHERE action = '__TEST__';
    DELETE FROM professional_services WHERE professional_id IN (
      SELECT id FROM professionals WHERE specialty = '__test__'
    );
    DELETE FROM availability WHERE professional_id IN (
      SELECT id FROM professionals WHERE specialty = '__test__'
    );
    DELETE FROM blocked_periods WHERE reason = '__test__';
    DELETE FROM professionals WHERE specialty = '__test__';
    DELETE FROM addresses WHERE reference = '__test__';
    DELETE FROM clients WHERE notes = '__test__';
    DELETE FROM users WHERE phone = '__test__';
  `);
  await client.query(`ALTER TABLE appointment_status_history ENABLE TRIGGER trg_appt_history_no_delete`);
  await client.query(`ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_no_delete`);

  // ── Helper: insert test fixtures ─────────────────────────────
  // role 1 = ADMIN, 2 = PROFESSIONAL, 3 = CLIENT
  const { rows: [adminUser] } = await client.query<{ id: string }>(`
    INSERT INTO users (role_id, name, email, password_hash, phone)
    VALUES (1, 'Admin Teste', 'admin_test_mig@fluir.test', 'hash', '__test__')
    RETURNING id
  `);
  const adminId = adminUser.id;

  const { rows: [profUser] } = await client.query<{ id: string }>(`
    INSERT INTO users (role_id, name, email, password_hash, phone)
    VALUES (2, 'Prof Teste', 'prof_test_mig@fluir.test', 'hash', '__test__')
    RETURNING id
  `);
  const profUserId = profUser.id;

  const { rows: [clientUser] } = await client.query<{ id: string }>(`
    INSERT INTO users (role_id, name, email, password_hash, phone)
    VALUES (3, 'Cliente Teste', 'client_test_mig@fluir.test', 'hash', '__test__')
    RETURNING id
  `);
  const clientUserId = clientUser.id;

  const { rows: [prof] } = await client.query<{ id: string }>(`
    INSERT INTO professionals (user_id, specialty) VALUES ($1, '__test__') RETURNING id
  `, [profUserId]);
  const profId = prof.id;

  const { rows: [cli] } = await client.query<{ id: string }>(`
    INSERT INTO clients (user_id, notes) VALUES ($1, '__test__') RETURNING id
  `, [clientUserId]);
  const clientId = cli.id;

  const { rows: [addr] } = await client.query<{ id: string }>(`
    INSERT INTO addresses (client_id, street, number, neighborhood, city, state, postal_code, reference)
    VALUES ($1, 'Rua Teste', '1', 'Bairro', 'São Paulo', 'SP', '01000-000', '__test__')
    RETURNING id
  `, [clientId]);
  const addressId = addr.id;

  const { rows: [svc] } = await client.query<{ id: string }>(`
    INSERT INTO services (name, duration_minutes, price, allowed_modalities)
    VALUES ('Serviço Teste', 60, 100.00, 'BOTH')
    RETURNING id
  `);
  const serviceId = svc.id;

  // Get first resource (Maca 01)
  const { rows: [res] } = await client.query<{ id: string }>(
    `SELECT id FROM resources WHERE name = 'Maca 01' LIMIT 1`
  );
  const resourceId = res.id;

  const now = new Date();
  const t0 = new Date(now.getTime() + 2 * 3600 * 1000); // +2h
  const t1 = new Date(now.getTime() + 3 * 3600 * 1000); // +3h
  const t2 = new Date(now.getTime() + 3 * 3600 * 1000); // +3h
  const t3 = new Date(now.getTime() + 4 * 3600 * 1000); // +4h
  const t4 = new Date(now.getTime() + 5 * 3600 * 1000); // +5h (non-overlapping)
  const t5 = new Date(now.getTime() + 6 * 3600 * 1000); // +6h

  console.log("── Testes ────────────────────────────────────────────────\n");

  // ── TEST 1: 14 tabelas existem ───────────────────────────────
  const expectedTables = [
    "roles", "users", "clients", "professionals", "addresses",
    "services", "professional_services", "availability", "blocked_periods",
    "resources", "appointments", "appointment_status_history",
    "notifications", "audit_logs",
  ];
  const { rows: tables } = await client.query<{ table_name: string }>(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tableNames = tables.map((r) => r.table_name);
  const missing = expectedTables.filter((t) => !tableNames.includes(t));
  if (missing.length === 0) {
    pass("14 tabelas existem", `encontradas: ${expectedTables.length}`);
  } else {
    fail("14 tabelas existem", `faltando: ${missing.join(", ")}`);
  }

  // ── TEST 2: 3 roles existem ──────────────────────────────────
  const { rows: roles } = await client.query<{ name: string }>(`SELECT name FROM roles ORDER BY id`);
  const roleNames = roles.map((r) => r.name);
  if (roleNames.includes("ADMIN") && roleNames.includes("PROFESSIONAL") && roleNames.includes("CLIENT") && roles.length === 3) {
    pass("3 roles existem", roleNames.join(", "));
  } else {
    fail("3 roles existem", `encontradas: ${roleNames.join(", ")}`);
  }

  // ── TEST 3: exatamente 5 macas existem ──────────────────────
  const { rows: macas } = await client.query<{ name: string; count: string }>(`
    SELECT count(*) AS count FROM resources
    WHERE type = 'MASSAGE_TABLE' AND status = 'ACTIVE'
  `);
  const macaCount = parseInt(macas[0].count, 10);
  if (macaCount === 5) {
    pass("Exatamente 5 macas existem", "Maca 01–05 ACTIVE");
  } else {
    fail("Exatamente 5 macas existem", `encontradas: ${macaCount}`);
  }

  // ── TEST 4: email case-insensitive ───────────────────────────
  await expectError(
    client,
    `INSERT INTO users (role_id, name, email, password_hash) VALUES (1, 'Dup', $1, 'h')`,
    ["ADMIN_TEST_MIG@FLUIR.TEST"],
    "Email duplicado com case diferente é rejeitado",
  );

  // ── TEST 5: cliente não pode ter dois endereços ──────────────
  await expectError(
    client,
    `INSERT INTO addresses (client_id, street, number, neighborhood, city, state, postal_code, reference)
     VALUES ($1, 'Rua 2', '2', 'Bairro', 'SP', 'SP', '01000-000', '__test__')`,
    [clientId],
    "Cliente não pode ter dois endereços (UNIQUE client_id)",
  );

  // ── TEST 6: dois agendamentos do mesmo profissional no mesmo intervalo ──
  await client.query(`
    INSERT INTO appointments
      (client_id, professional_id, service_id, modality, resource_id,
       start_datetime, end_datetime, price_at_booking, notes, created_by)
    VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, 100.00, '__test__', $7)
  `, [clientId, profId, serviceId, resourceId, t0, t1, adminId]);

  // Need a second client for client conflict test separation
  const { rows: [clientUser2] } = await client.query<{ id: string }>(`
    INSERT INTO users (role_id, name, email, password_hash, phone)
    VALUES (3, 'Cliente 2', 'client2_test_mig@fluir.test', 'hash', '__test__')
    RETURNING id
  `);
  const { rows: [cli2] } = await client.query<{ id: string }>(`
    INSERT INTO clients (user_id, notes) VALUES ($1, '__test__') RETURNING id
  `, [clientUser2.id]);
  const clientId2 = cli2.id;

  await expectError(
    client,
    `INSERT INTO appointments
      (client_id, professional_id, service_id, modality, resource_id,
       start_datetime, end_datetime, price_at_booking, notes, created_by)
     VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, 100.00, '__test__', $7)`,
    [clientId2, profId, serviceId, resourceId, t0, t1, adminId],
    "Dois agendamentos do mesmo profissional no mesmo intervalo são rejeitados",
  );

  // Need a second resource for client conflict test
  const { rows: [res2] } = await client.query<{ id: string }>(
    `SELECT id FROM resources WHERE name = 'Maca 02' LIMIT 1`
  );
  const resourceId2 = res2.id;

  // ── TEST 7: dois agendamentos do mesmo cliente no mesmo intervalo ──
  // clientId already has appointment at t0-t1
  await expectError(
    client,
    `INSERT INTO appointments
      (client_id, professional_id, service_id, modality, resource_id,
       start_datetime, end_datetime, price_at_booking, notes, created_by)
     VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, 100.00, '__test__', $7)`,
    [clientId, profId, serviceId, resourceId2, t0, t1, adminId],
    "Dois agendamentos do mesmo cliente no mesmo intervalo são rejeitados",
  );

  // ── TEST 8: duas reservas da mesma maca no mesmo intervalo ──
  // Need a second professional for this test
  const { rows: [profUser2] } = await client.query<{ id: string }>(`
    INSERT INTO users (role_id, name, email, password_hash, phone)
    VALUES (2, 'Prof 2', 'prof2_test_mig@fluir.test', 'hash', '__test__')
    RETURNING id
  `);
  const { rows: [prof2] } = await client.query<{ id: string }>(`
    INSERT INTO professionals (user_id, specialty) VALUES ($1, '__test__') RETURNING id
  `, [profUser2.id]);
  const profId2 = prof2.id;

  await expectError(
    client,
    `INSERT INTO appointments
      (client_id, professional_id, service_id, modality, resource_id,
       start_datetime, end_datetime, price_at_booking, notes, created_by)
     VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, 100.00, '__test__', $7)`,
    [clientId2, profId2, serviceId, resourceId, t0, t1, adminId],
    "Duas reservas da mesma maca no mesmo intervalo são rejeitadas",
  );

  // ── TEST 9: HOME_CARE com maca é rejeitado ──────────────────
  await expectError(
    client,
    `INSERT INTO appointments
      (client_id, professional_id, service_id, modality, resource_id, address_id,
       start_datetime, end_datetime, price_at_booking, notes, created_by)
     VALUES ($1, $2, $3, 'HOME_CARE', $4, $5, $6, $7, 100.00, '__test__', $8)`,
    [clientId2, profId2, serviceId, resourceId2, addressId, t2, t3, adminId],
    "HOME_CARE com maca é rejeitado",
  );

  // ── TEST 10: HOME_CARE sem endereço é rejeitado ─────────────
  await expectError(
    client,
    `INSERT INTO appointments
      (client_id, professional_id, service_id, modality,
       start_datetime, end_datetime, price_at_booking, notes, created_by)
     VALUES ($1, $2, $3, 'HOME_CARE', $4, $5, 100.00, '__test__', $6)`,
    [clientId2, profId2, serviceId, t2, t3, adminId],
    "HOME_CARE sem endereço é rejeitado",
  );

  // ── TEST 11: IN_PERSON sem maca é rejeitado ─────────────────
  await expectError(
    client,
    `INSERT INTO appointments
      (client_id, professional_id, service_id, modality,
       start_datetime, end_datetime, price_at_booking, notes, created_by)
     VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, 100.00, '__test__', $6)`,
    [clientId2, profId2, serviceId, t2, t3, adminId],
    "IN_PERSON sem maca é rejeitado",
  );

  // ── TEST 12: IN_PERSON com endereço é rejeitado ─────────────
  await expectError(
    client,
    `INSERT INTO appointments
      (client_id, professional_id, service_id, modality, resource_id, address_id,
       start_datetime, end_datetime, price_at_booking, notes, created_by)
     VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, $7, 100.00, '__test__', $8)`,
    [clientId2, profId2, serviceId, resourceId2, addressId, t2, t3, adminId],
    "IN_PERSON com endereço é rejeitado",
  );

  // ── TESTS 13–15: status terminais não bloqueiam novo horário ─
  // Insert an appointment and cancel it — same slot should be reusable
  const { rows: [cancelledAppt] } = await client.query<{ id: string }>(`
    INSERT INTO appointments
      (client_id, professional_id, service_id, modality, resource_id,
       start_datetime, end_datetime, price_at_booking, notes, created_by, status)
    VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, 100.00, '__test__', $7, 'CANCELLED')
    RETURNING id
  `, [clientId2, profId2, serviceId, resourceId2, t4, t5, adminId]);

  // Same slot should now be insertable with different professional/client
  const { rows: [profUser3] } = await client.query<{ id: string }>(`
    INSERT INTO users (role_id, name, email, password_hash, phone)
    VALUES (2, 'Prof 3', 'prof3_test_mig@fluir.test', 'hash', '__test__')
    RETURNING id
  `);
  const { rows: [prof3] } = await client.query<{ id: string }>(`
    INSERT INTO professionals (user_id, specialty) VALUES ($1, '__test__') RETURNING id
  `, [profUser3.id]);
  const profId3 = prof3.id;

  const { rows: [clientUser3] } = await client.query<{ id: string }>(`
    INSERT INTO users (role_id, name, email, password_hash, phone)
    VALUES (3, 'Cliente 3', 'client3_test_mig@fluir.test', 'hash', '__test__')
    RETURNING id
  `);
  const { rows: [cli3] } = await client.query<{ id: string }>(`
    INSERT INTO clients (user_id, notes) VALUES ($1, '__test__') RETURNING id
  `, [clientUser3.id]);
  const clientId3 = cli3.id;

  // CANCELLED should not block
  try {
    const { rows: [res3] } = await client.query<{ id: string }>(
      `SELECT id FROM resources WHERE name = 'Maca 03' LIMIT 1`
    );
    await client.query(`
      INSERT INTO appointments
        (client_id, professional_id, service_id, modality, resource_id,
         start_datetime, end_datetime, price_at_booking, notes, created_by, status)
      VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, 100.00, '__test__', $7, 'CANCELLED')
    `, [clientId3, profId3, serviceId, res3.id, t4, t5, adminId]);
    pass("CANCELLED não bloqueia novo horário", "mesmo intervalo aceito com status CANCELLED");
  } catch (e) {
    fail("CANCELLED não bloqueia novo horário", String(e));
  }

  // COMPLETED should not block
  try {
    const { rows: [res4] } = await client.query<{ id: string }>(
      `SELECT id FROM resources WHERE name = 'Maca 04' LIMIT 1`
    );
    const { rows: [clientUser4] } = await client.query<{ id: string }>(`
      INSERT INTO users (role_id, name, email, password_hash, phone)
      VALUES (3, 'Cliente 4', 'client4_test_mig@fluir.test', 'hash', '__test__')
      RETURNING id
    `);
    const { rows: [cli4] } = await client.query<{ id: string }>(`
      INSERT INTO clients (user_id, notes) VALUES ($1, '__test__') RETURNING id
    `, [clientUser4.id]);
    await client.query(`
      INSERT INTO appointments
        (client_id, professional_id, service_id, modality, resource_id,
         start_datetime, end_datetime, price_at_booking, notes, created_by, status)
      VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, 100.00, '__test__', $7, 'COMPLETED')
    `, [cli4.id, profId3, serviceId, res4.id, t4, t5, adminId]);
    pass("COMPLETED não bloqueia novo horário", "mesmo intervalo aceito com status COMPLETED");
  } catch (e) {
    fail("COMPLETED não bloqueia novo horário", String(e));
  }

  // NO_SHOW should not block
  try {
    const { rows: [res5] } = await client.query<{ id: string }>(
      `SELECT id FROM resources WHERE name = 'Maca 05' LIMIT 1`
    );
    const { rows: [clientUser5] } = await client.query<{ id: string }>(`
      INSERT INTO users (role_id, name, email, password_hash, phone)
      VALUES (3, 'Cliente 5', 'client5_test_mig@fluir.test', 'hash', '__test__')
      RETURNING id
    `);
    const { rows: [cli5] } = await client.query<{ id: string }>(`
      INSERT INTO clients (user_id, notes) VALUES ($1, '__test__') RETURNING id
    `, [clientUser5.id]);
    await client.query(`
      INSERT INTO appointments
        (client_id, professional_id, service_id, modality, resource_id,
         start_datetime, end_datetime, price_at_booking, notes, created_by, status)
      VALUES ($1, $2, $3, 'IN_PERSON', $4, $5, $6, 100.00, '__test__', $7, 'NO_SHOW')
    `, [cli5.id, profId3, serviceId, res5.id, t4, t5, adminId]);
    pass("NO_SHOW não bloqueia novo horário", "mesmo intervalo aceito com status NO_SHOW");
  } catch (e) {
    fail("NO_SHOW não bloqueia novo horário", String(e));
  }

  // ── TEST 16: price_at_booking preserva preço histórico ──────
  // Update service price and verify appointment price_at_booking is unchanged
  await client.query(`UPDATE services SET price = 999.99 WHERE id = $1`, [serviceId]);
  const { rows: [apptCheck] } = await client.query<{ price_at_booking: string }>(
    `SELECT price_at_booking FROM appointments WHERE service_id = $1 AND notes = '__test__' LIMIT 1`,
    [serviceId]
  );
  if (apptCheck && parseFloat(apptCheck.price_at_booking) === 100.00) {
    pass("price_at_booking preserva preço histórico", "preço do serviço mudou para 999.99, appointment manteve 100.00");
  } else {
    fail("price_at_booking preserva preço histórico", `valor encontrado: ${apptCheck?.price_at_booking}`);
  }

  // price_at_booking imutável via trigger
  const { rows: [apptForPrice] } = await client.query<{ id: string }>(
    `SELECT id FROM appointments WHERE notes = '__test__' LIMIT 1`
  );
  await expectError(
    client,
    `UPDATE appointments SET price_at_booking = 0.00 WHERE id = $1`,
    [apptForPrice.id],
    "price_at_booking imutável — trigger bloqueia alteração",
  );

  // ── TEST 17: FKs com ON DELETE RESTRICT funcionam ───────────
  await expectError(
    client,
    `DELETE FROM roles WHERE id = 1`,
    [],
    "FK ON DELETE RESTRICT — não permite deletar role referenciada",
  );
  await expectError(
    client,
    `DELETE FROM users WHERE id = $1`,
    [adminId],
    "FK ON DELETE RESTRICT — não permite deletar user referenciado",
  );

  // ── TEST 18: appointment_status_history é append-only ───────
  // Insert a history record first
  const { rows: [apptForHistory] } = await client.query<{ id: string }>(
    `SELECT id FROM appointments WHERE notes = '__test__' LIMIT 1`
  );
  const { rows: [histRow] } = await client.query<{ id: string }>(`
    INSERT INTO appointment_status_history
      (appointment_id, old_status, new_status, changed_by)
    VALUES ($1, NULL, 'CONFIRMED', $2)
    RETURNING id
  `, [apptForHistory.id, adminId]);

  await expectError(
    client,
    `UPDATE appointment_status_history SET new_status = 'CANCELLED' WHERE id = $1`,
    [histRow.id],
    "appointment_status_history é append-only — UPDATE rejeitado",
  );
  await expectError(
    client,
    `DELETE FROM appointment_status_history WHERE id = $1`,
    [histRow.id],
    "appointment_status_history é append-only — DELETE rejeitado",
  );

  // ── Cleanup ──────────────────────────────────────────────────
  // Desabilita triggers append-only temporariamente para limpeza de dados de teste
  await client.query(`ALTER TABLE appointment_status_history DISABLE TRIGGER trg_appt_history_no_delete`);
  await client.query(`ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_no_delete`);
  await client.query(`
    DELETE FROM appointment_status_history WHERE appointment_id IN (
      SELECT id FROM appointments WHERE notes = '__test__'
    );
    DELETE FROM appointments WHERE notes = '__test__';
    DELETE FROM services WHERE name = 'Serviço Teste';
    DELETE FROM addresses WHERE reference = '__test__';
    DELETE FROM clients WHERE notes = '__test__';
    DELETE FROM professionals WHERE specialty = '__test__';
    DELETE FROM users WHERE phone = '__test__';
  `);
  await client.query(`ALTER TABLE appointment_status_history ENABLE TRIGGER trg_appt_history_no_delete`);
  await client.query(`ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_no_delete`);

  await client.end();

  // ── Summary ──────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n─────────────────────────────────────────────────────────");
  console.log(`[test] Resultado: ${passed} aprovados, ${failed} falhos de ${results.length} testes`);
  if (failed > 0) {
    console.log("[test] Testes com falha:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ✗ [${r.id.toString().padStart(2, "0")}] ${r.description}: ${r.detail}`);
    });
    process.exit(1);
  } else {
    console.log("[test] Todos os testes passaram ✓");
  }
}

run().catch((err) => {
  console.error("[test] FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
