import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set before running migrations.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log("[migrate] Connected to database");

  try {
    // Create tracking table — idempotent, safe to run multiple times
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   varchar(255) PRIMARY KEY,
        applied_at timestamptz  NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, "../migrations");
    let allFiles: string[];
    try {
      allFiles = await fs.readdir(migrationsDir);
    } catch {
      console.log("[migrate] No migrations directory found — nothing to apply");
      return;
    }

    const sqlFiles = allFiles.filter((f) => f.endsWith(".sql")).sort();

    if (sqlFiles.length === 0) {
      console.log("[migrate] No SQL migration files found");
      return;
    }

    let applied = 0;
    let skipped = 0;

    for (const file of sqlFiles) {
      const { rows } = await client.query(
        "SELECT filename FROM schema_migrations WHERE filename = $1",
        [file],
      );

      if (rows.length > 0) {
        console.log(`[migrate] [skip]  ${file} — already applied`);
        skipped++;
        continue;
      }

      console.log(`[migrate] [apply] ${file} ...`);
      const sql = await fs.readFile(
        path.join(migrationsDir, file),
        "utf-8",
      );

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
        console.log(`[migrate] [done]  ${file}`);
        applied++;
      } catch (err) {
        await client.query("ROLLBACK");
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Migration ${file} failed (rolled back): ${msg}`);
      }
    }

    console.log(
      `[migrate] Finished — ${applied} applied, ${skipped} skipped`,
    );
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error("[migrate] FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
