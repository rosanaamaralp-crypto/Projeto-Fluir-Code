import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export function createDatabaseClient(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return {
    pool,
    db: drizzle(pool, { schema }),
  };
}

export function getDatabaseClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set before the database client is used.",
    );
  }

  return createDatabaseClient(databaseUrl);
}

export * from "./schema";
