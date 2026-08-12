import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { sessionMiddleware } from "./lib/session.js";
import { AppError, mapDbError } from "./lib/errors.js";

const app: Express = express();

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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
