import { getDatabaseClient } from "@workspace/db";

// Singleton: criado uma única vez na inicialização do servidor.
// Não criar múltiplos pools. Não criar conexão nova por request.
const { db, pool } = getDatabaseClient();

export { db, pool };
