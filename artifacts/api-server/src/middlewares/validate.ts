import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../lib/errors.js";

/**
 * Valida req.body contra o schema Zod fornecido.
 * Em caso de erro, passa um ValidationError para o error handler.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError(formatZodError(result.error), result.error.issues));
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Valida req.query contra o schema Zod fornecido.
 * Usa Object.defineProperty para compatibilidade com router@2.x (Express 5)
 * onde req.query é um getter readonly no protótipo.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ValidationError(formatZodError(result.error), result.error.issues));
      return;
    }
    // router@2.x define req.query como getter no protótipo — usar defineProperty
    // para criar propriedade própria que sombra o getter
    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

/**
 * Valida req.params contra o schema Zod fornecido.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new ValidationError(formatZodError(result.error), result.error.issues));
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.params = result.data as any;
    next();
  };
}

function formatZodError(error: ZodError): string {
  const messages = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  return `Dados inválidos: ${messages.join("; ")}`;
}
