import { getDatabaseClient } from "@workspace/db";

const { db, pool } = getDatabaseClient();

export { db, pool };
