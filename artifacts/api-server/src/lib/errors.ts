// ---------------------------------------------------------------------------
// Domain error classes
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito: recurso já existe ou está em uso.") {
    super(409, "CONFLICT", message);
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso não autorizado a este recurso.") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação necessária.") {
    super(401, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Dados de entrada inválidos.",
    public readonly details?: unknown,
  ) {
    super(400, "VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL error code mapping
// ---------------------------------------------------------------------------

interface PgError {
  code?: string;
  message?: string;
  constraint?: string;
  detail?: string;
}

function isPgError(err: unknown): err is PgError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as PgError).code === "string"
  );
}

/**
 * Extrai o erro pg real de um DrizzleQueryError ou de qualquer wrapper.
 * Drizzle envolve erros pg em um objeto com propriedade `cause`.
 */
function extractPgError(err: unknown): unknown {
  if (isPgError(err)) return err;

  // DrizzleQueryError (e outros wrappers) expõem o pg error em .cause
  const wrapped = err as { cause?: unknown };
  if (wrapped?.cause && isPgError(wrapped.cause)) return wrapped.cause;

  return err;
}

export function mapDbError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const pgErr = extractPgError(err);

  if (isPgError(pgErr)) {
    switch (pgErr.code) {
      // Unique violation
      case "23505":
        return new ConflictError("Registro duplicado: já existe um registro com esses dados.");

      // Foreign key violation
      case "23503":
        return new ConflictError(
          "Operação inválida: referência a um registro que não existe ou está em uso.",
        );

      // Check constraint violation
      case "23514":
        return new ValidationError(
          "Dados inválidos: valor fora do intervalo permitido pela regra de negócio.",
        );

      // Exclusion constraint violation (EXCLUDE USING gist — agendamentos sobrepostos)
      case "23P01":
        return new ConflictError(
          "Conflito de horário: já existe um agendamento neste intervalo.",
        );

      // Raised exception from trigger (RAISE EXCEPTION — triggers append-only, price imutável)
      case "P0001":
        return mapTriggerException(pgErr.message ?? "");

      // Invalid UUID syntax — pg recebe UUID malformado (defesa adicional após validateParams)
      case "22P02":
        return new ValidationError(
          "Identificador inválido: o valor fornecido não é um UUID válido.",
        );

      default:
        break;
    }
  }

  // Unknown error — não vazar detalhes internos
  return new AppError(500, "SERVER_ERROR", "Ocorreu um erro interno.");
}

function mapTriggerException(message: string): AppError {
  if (message.includes("append-only")) {
    return new ForbiddenError(
      "Esta operação não é permitida: registro é imutável.",
    );
  }
  if (message.includes("price_at_booking")) {
    return new ForbiddenError(
      "O valor do agendamento não pode ser alterado após a criação.",
    );
  }
  return new ValidationError("Operação rejeitada pela regra de negócio.");
}
