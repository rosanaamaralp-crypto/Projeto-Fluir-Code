/**
 * F15 D5: UpdateClientSchemaSelf agora inclui name e phone.
 *
 * Autorização formal F15: CLIENT pode editar nome, telefone e data de nascimento.
 * name e phone pertencem à tabela `users`; o controller atualiza ambas as tabelas
 * (clients + users) na mesma transação.
 *
 * UpdateClientSchemaSelf: campos que o próprio CLIENT pode alterar.
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
 * Campos que o próprio CLIENT pode alterar.
 * name e phone existem em `users`; birthDate e notes em `clients`.
 * O controller atualiza ambas as tabelas na mesma transação (F15 D5).
 */
export const UpdateClientSchemaSelf = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).optional(),
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
