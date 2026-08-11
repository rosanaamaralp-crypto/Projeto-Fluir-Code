import pg from "pg";

const { Client } = pg;

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set before running seed.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log("[seed] Connected to database");

  try {
    await client.query("BEGIN");

    // ── roles ──────────────────────────────────────────────────
    const rolesResult = await client.query<{ name: string }>(`
      INSERT INTO roles (id, name) VALUES
        (1, 'ADMIN'),
        (2, 'PROFESSIONAL'),
        (3, 'CLIENT')
      ON CONFLICT (id) DO NOTHING
      RETURNING name
    `);
    const rolesInserted = rolesResult.rowCount ?? 0;
    console.log(
      `[seed] roles: ${rolesInserted} inserted, ${3 - rolesInserted} already existed`,
    );

    // ── resources (5 macas) ────────────────────────────────────
    const resourcesResult = await client.query<{ name: string }>(`
      INSERT INTO resources (name, type, status) VALUES
        ('Maca 01', 'MASSAGE_TABLE', 'ACTIVE'),
        ('Maca 02', 'MASSAGE_TABLE', 'ACTIVE'),
        ('Maca 03', 'MASSAGE_TABLE', 'ACTIVE'),
        ('Maca 04', 'MASSAGE_TABLE', 'ACTIVE'),
        ('Maca 05', 'MASSAGE_TABLE', 'ACTIVE')
      ON CONFLICT (name) DO NOTHING
      RETURNING name
    `);
    const resourcesInserted = resourcesResult.rowCount ?? 0;
    console.log(
      `[seed] resources: ${resourcesInserted} inserted, ${5 - resourcesInserted} already existed`,
    );

    await client.query("COMMIT");
    console.log("[seed] Seed completed successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error("[seed] FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
