import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  mapDbError,
} from "../../../src/lib/errors.js";

describe("Classes de erro de domínio", () => {
  it("NotFoundError tem statusCode 404", () => {
    const e = new NotFoundError();
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe("NOT_FOUND");
    expect(e instanceof AppError).toBe(true);
  });

  it("ConflictError tem statusCode 409", () => {
    const e = new ConflictError();
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe("CONFLICT");
  });

  it("ForbiddenError tem statusCode 403", () => {
    const e = new ForbiddenError();
    expect(e.statusCode).toBe(403);
    expect(e.code).toBe("FORBIDDEN");
  });

  it("UnauthorizedError tem statusCode 401", () => {
    const e = new UnauthorizedError();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe("UNAUTHORIZED");
  });

  it("ValidationError tem statusCode 400", () => {
    const e = new ValidationError("Campo inválido");
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.message).toBe("Campo inválido");
  });

  it("aceita mensagem customizada", () => {
    const e = new NotFoundError("Usuário não encontrado.");
    expect(e.message).toBe("Usuário não encontrado.");
  });
});

describe("mapDbError", () => {
  it("já é AppError — retorna o mesmo", () => {
    const e = new NotFoundError("test");
    expect(mapDbError(e)).toBe(e);
  });

  it("23505 → ConflictError", () => {
    const result = mapDbError({ code: "23505" });
    expect(result).toBeInstanceOf(ConflictError);
    expect(result.statusCode).toBe(409);
  });

  it("23503 → ConflictError", () => {
    const result = mapDbError({ code: "23503" });
    expect(result).toBeInstanceOf(ConflictError);
  });

  it("23514 → ValidationError", () => {
    const result = mapDbError({ code: "23514" });
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("23P01 → ConflictError HTTP 409", () => {
    const result = mapDbError({ code: "23P01" });
    expect(result).toBeInstanceOf(ConflictError);
    expect(result.statusCode).toBe(409);
  });

  it("P0001 append-only → ForbiddenError", () => {
    const result = mapDbError({ code: "P0001", message: "Table x is append-only and cannot be modified" });
    expect(result).toBeInstanceOf(ForbiddenError);
  });

  it("P0001 price_at_booking → ForbiddenError", () => {
    const result = mapDbError({ code: "P0001", message: "appointments.price_at_booking is immutable" });
    expect(result).toBeInstanceOf(ForbiddenError);
  });

  it("erro desconhecido → AppError 500", () => {
    const result = mapDbError(new Error("unexpected"));
    expect(result.statusCode).toBe(500);
    expect(result.code).toBe("SERVER_ERROR");
  });

  it("null → AppError 500", () => {
    const result = mapDbError(null);
    expect(result.statusCode).toBe(500);
  });
});
