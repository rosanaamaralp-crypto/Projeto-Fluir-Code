/**
 * F9 — Integridade do banco de dados.
 *
 * Valida diretamente no PostgreSQL:
 * - contagem de tabelas (16)
 * - contagem de triggers (14)
 * - nomes das EXCLUDE constraints (3)
 * - migrations registradas (1)
 * - nomes dos triggers append-only críticos
 *
 * Todos os testes são read-only — sem INSERT, UPDATE ou DELETE.
 * Não fecha o pool (singleton compartilhado com outros arquivos de teste).
 */
import { describe, it, expect } from "vitest";
import { getDatabaseClient } from "@workspace/db";

const { pool } = getDatabaseClient();

async function queryRows<T extends Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}

// ─── Tabelas ─────────────────────────────────────────────────────────────────

describe("DB Integrity — Tabelas", () => {
  it("schema public tem exatamente 16 tabelas", async () => {
    const rows = await queryRows<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'`,
    );
    expect(Number(rows[0]!.count)).toBe(16);
  });
});

// ─── Triggers ────────────────────────────────────────────────────────────────

describe("DB Integrity — Triggers", () => {
  it("schema public tem exatamente 14 triggers", async () => {
    const rows = await queryRows<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'`,
    );
    expect(Number(rows[0]!.count)).toBe(14);
  });

  it("trigger append-only de audit_logs (no_delete) existe", async () => {
    const rows = await queryRows<{ trigger_name: string }>(
      `SELECT trigger_name
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'
         AND trigger_name = 'trg_audit_logs_no_delete'`,
    );
    expect(rows.length).toBe(1);
  });

  it("trigger append-only de audit_logs (no_update) existe", async () => {
    const rows = await queryRows<{ trigger_name: string }>(
      `SELECT trigger_name
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'
         AND trigger_name = 'trg_audit_logs_no_update'`,
    );
    expect(rows.length).toBe(1);
  });

  it("trigger append-only de appointment_status_history (no_delete) existe", async () => {
    const rows = await queryRows<{ trigger_name: string }>(
      `SELECT trigger_name
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'
         AND trigger_name = 'trg_appt_history_no_delete'`,
    );
    expect(rows.length).toBe(1);
  });

  it("trigger append-only de appointment_status_history (no_update) existe", async () => {
    const rows = await queryRows<{ trigger_name: string }>(
      `SELECT trigger_name
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'
         AND trigger_name = 'trg_appt_history_no_update'`,
    );
    expect(rows.length).toBe(1);
  });

  it("trigger de imutabilidade de price (trg_appt_price_immutable) existe", async () => {
    const rows = await queryRows<{ trigger_name: string }>(
      `SELECT trigger_name
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'
         AND trigger_name = 'trg_appt_price_immutable'`,
    );
    expect(rows.length).toBe(1);
  });

  it("não existe trigger append-only de notifications (confirmado como ausente)", async () => {
    const rows = await queryRows<{ trigger_name: string }>(
      `SELECT trigger_name
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'
         AND event_object_table = 'notifications'`,
    );
    // Notificações não possuem trigger append-only — comportamento esperado
    expect(rows.length).toBe(0);
  });
});

// ─── EXCLUDE Constraints ──────────────────────────────────────────────────────

describe("DB Integrity — EXCLUDE Constraints", () => {
  it("excl_professional_no_overlap existe em pg_constraint", async () => {
    const rows = await queryRows<{ conname: string }>(
      `SELECT conname FROM pg_constraint
       WHERE contype = 'x' AND conname = 'excl_professional_no_overlap'`,
    );
    expect(rows.length).toBe(1);
  });

  it("excl_client_no_overlap existe em pg_constraint", async () => {
    const rows = await queryRows<{ conname: string }>(
      `SELECT conname FROM pg_constraint
       WHERE contype = 'x' AND conname = 'excl_client_no_overlap'`,
    );
    expect(rows.length).toBe(1);
  });

  it("excl_resource_no_overlap existe em pg_constraint", async () => {
    const rows = await queryRows<{ conname: string }>(
      `SELECT conname FROM pg_constraint
       WHERE contype = 'x' AND conname = 'excl_resource_no_overlap'`,
    );
    expect(rows.length).toBe(1);
  });

  it("existem exatamente 3 EXCLUDE constraints no banco", async () => {
    const rows = await queryRows<{ count: string }>(
      `SELECT count(*)::text AS count FROM pg_constraint WHERE contype = 'x'`,
    );
    expect(Number(rows[0]!.count)).toBe(3);
  });
});

// ─── Migrations ──────────────────────────────────────────────────────────────

describe("DB Integrity — Migrations", () => {
  it("schema_migrations tem exatamente 1 migration registrada", async () => {
    const rows = await queryRows<{ count: string }>(
      `SELECT count(*)::text AS count FROM schema_migrations`,
    );
    expect(Number(rows[0]!.count)).toBe(1);
  });
});
