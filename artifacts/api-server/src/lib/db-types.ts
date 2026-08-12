/**
 * Tipo aceito por todos os repositories: database normal ou contexto de transação.
 *
 * Usar `DrizzleDB` em vez de `NodePgDatabase<typeof schema>` permite passar `db`
 * ou `tx` como argumento sem nenhum cast inseguro (`tx as typeof db`).
 *
 * Por que union e não interseção?
 * `NodePgDatabase & { $client: Pool }` (tipo real de `db`) NÃO é assignable a
 * `PgTransaction`, e vice-versa. A union aceita ambos nos call sites.
 */
import type { NodePgDatabase, NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type * as schema from "@workspace/db/schema";

export type DrizzleDB =
  | NodePgDatabase<typeof schema>
  | PgTransaction<
      NodePgQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;
