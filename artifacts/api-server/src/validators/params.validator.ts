/**
 * Schemas Zod para validação de path parameters UUID.
 * Usados com validateParams() nas rotas para garantir que UUIDs inválidos
 * retornem HTTP 400 em vez de HTTP 500 (pg error 22P02).
 */
import { z } from "zod";

const UUID = z.string().uuid("Deve ser um UUID válido.");

export const ParamsIdSchema = z.object({
  id: UUID,
});

export const ParamsProfIdSchema = z.object({
  profId: UUID,
});

export const ParamsProfIdAndIdSchema = z.object({
  profId: UUID,
  id: UUID,
});

export const ParamsProfIdAndServiceIdSchema = z.object({
  profId: UUID,
  serviceId: UUID,
});

export const ParamsClientIdSchema = z.object({
  clientId: UUID,
});

export type ParamsId = z.infer<typeof ParamsIdSchema>;
export type ParamsProfId = z.infer<typeof ParamsProfIdSchema>;
export type ParamsProfIdAndId = z.infer<typeof ParamsProfIdAndIdSchema>;
export type ParamsProfIdAndServiceId = z.infer<typeof ParamsProfIdAndServiceIdSchema>;
export type ParamsClientId = z.infer<typeof ParamsClientIdSchema>;
