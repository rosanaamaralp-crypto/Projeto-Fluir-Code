import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";

const PgSession = connectPgSimple(session);

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set before starting the server.");
}

const isProduction = process.env["NODE_ENV"] === "production";

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    createTableIfMissing: true,
    // Limpa sessões expiradas a cada 60 segundos
    pruneSessionInterval: 60,
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Renova maxAge a cada request autenticado
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8 horas em ms
  },
});

// Extensão de tipo para req.session
declare module "express-session" {
  interface SessionData {
    user?: {
      userId: string;
      roleId: number;
      name: string;
      email: string;
    };
  }
}
