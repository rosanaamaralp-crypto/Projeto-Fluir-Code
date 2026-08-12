import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { sessionMiddleware } from "./lib/session.js";
import { AppError, mapDbError } from "./lib/errors.js";

const app: Express = express();

// Trust proxy — 1 hop (Replit reverse proxy).
// Necessário para que req.ip e o rate limiter leiam o IP correto
// a partir do x-forwarded-for sem permitir spoofing de múltiplos hops.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Security headers — helmet sem CSP (API JSON pura, sem conteúdo HTML/scripts).
app.use(helmet({ contentSecurityPolicy: false }));

// CORS restritivo: usa CORS_ORIGIN env var em produção;
// em desenvolvimento (sem a variável), aceita qualquer subdomínio *.replit.dev.
const corsOrigin: cors.CorsOptions["origin"] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN
  : /\.replit\.dev$/;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

// Limite explícito de 50 kb para payloads JSON e urlencoded.
// Payloads legítimos da API ficam abaixo de 1 kb; 50 kb bloqueia ataques de DoS.
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// Session middleware — deve vir ANTES dos routers protegidos
app.use(sessionMiddleware);

app.use("/api", router);

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Endpoint não encontrado.",
    },
  });
});

// Error handler centralizado — converte AppError e erros de banco para respostas HTTP
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    // AppError já mapeado (lançado pelos controllers/services)
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
      return;
    }

    // Erros do body-parser (entity.too.large → 413, etc.)
    // Esses erros têm uma propriedade `type` definida pelo pacote body-parser.
    if (
      typeof err === "object" &&
      err !== null &&
      "type" in err &&
      "status" in err
    ) {
      const bpErr = err as { type: string; status: number };
      if (bpErr.type === "entity.too.large") {
        res.status(413).json({
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "O corpo da requisição excede o limite permitido (50 kb).",
          },
        });
        return;
      }
    }

    // Tentar mapear erros de banco (DrizzleQueryError, pg DatabaseError)
    const appErr = mapDbError(err);
    if (appErr.statusCode !== 500) {
      // Erro de banco conhecido (23505, 23P01, etc.) — não logar como erro interno
      res.status(appErr.statusCode).json({
        error: {
          code: appErr.code,
          message: appErr.message,
        },
      });
      return;
    }

    // Erro inesperado — logar sem vazar detalhes internos ao cliente
    logger.error({ err }, "Unhandled API error");
    res.status(500).json({
      error: {
        code: "SERVER_ERROR",
        message: "Ocorreu um erro interno.",
      },
    });
  },
);

export default app;
