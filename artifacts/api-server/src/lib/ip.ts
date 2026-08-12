import type { Request } from "express";

/**
 * Extrai o IP do cliente do request.
 *
 * Com `trust proxy: 1` configurado no Express (src/app.ts), req.ip
 * resolve automaticamente o primeiro hop do x-forwarded-for, que
 * corresponde ao IP real do cliente em ambientes com um único proxy
 * reverso (ex.: Replit).
 */
export function getClientIp(req: Request): string | null {
  return req.ip ?? null;
}
