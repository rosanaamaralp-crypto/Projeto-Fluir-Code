/**
 * OBS-3 corrigido: UpdateClientSchemaSelf não contém mais `name` nem `phone`.
 *
 * Razão: a tabela `clients` não possui colunas name/phone — elas existem em `users`.
 * Aceitar name/phone no schema e não aplicá-los seria um contrato enganoso.
 *
 * Se no futuro um CLIENT precisar atualizar name/phone, isso deve ser feito por
 * um endpoint dedicado que atualiza a tabela `users`.
 *
 * UpdateClientSchemaSelf: campos que o próprio CLIENT pode alterar (birthDate, notes).
 * UpdateClientSchemaAdmin: todos os campos, inclusive status.
 */
import { z } from "zod";

const PasswordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres.")
  .max(128);

export const CreateClientSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().max(255),
  password: PasswordSchema,
  phone: z.string().max(20).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Campos que o próprio CLIENT pode alterar — sem status, sem name, sem phone.
 * Somente campos que existem na tabela `clients`.
 */
export const UpdateClientSchemaSelf = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});

/** Campos que ADMIN pode alterar — inclui status. */
export const UpdateClientSchemaAdmin = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

/** @deprecated Use UpdateClientSchemaSelf or UpdateClientSchemaAdmin */
export const UpdateClientSchema = UpdateClientSchemaAdmin;

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientSelfInput = z.infer<typeof UpdateClientSchemaSelf>;
export type UpdateClientAdminInput = z.infer<typeof UpdateClientSchemaAdmin>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchemaAdmin>;
