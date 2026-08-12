/**
 * Validators Zod para o módulo de appointments.
 *
 * Modalidades aceitas pelo banco (chk_appt_modality):
 *   - IN_PERSON: resource_id NOT NULL, address_id NULL
 *   - HOME_CARE: resource_id NULL, address_id NOT NULL
 *
 * NÃO existe modalidade "REMOTE" — o valor no banco é "HOME_CARE".
 */
import { z } from "zod";

const UUID = z.string().uuid("Deve ser um UUID válido.");

// ─── POST /api/appointments ────────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  professionalId: UUID,
  serviceId: UUID,
  startDatetime: z.string().datetime({ message: "startDatetime inválido. Use ISO-8601 com timezone (ex: 2026-09-01T10:00:00Z)." }),
  modality: z.enum(["IN_PERSON", "HOME_CARE"], {
    errorMap: () => ({ message: "modality deve ser 'IN_PERSON' ou 'HOME_CARE'." }),
  }),
  resourceId: UUID.optional(),
  addressId: UUID.optional(),
  notes: z.string().max(2000, "notes não pode exceder 2000 caracteres.").optional(),
  /** Apenas para ADMIN — CLIENT usa o próprio perfil de cliente. */
  clientId: UUID.optional(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

// ─── PATCH /api/appointments/:id ──────────────────────────────────────────

/** Cancelamento: { status: "CANCELLED", reason?: string } */
const CancelSchema = z.object({
  status: z.literal("CANCELLED"),
  reason: z.string().max(2000).optional(),
});

/** Mudança de status (não cancelamento): { status: "IN_PROGRESS" | "COMPLETED" | "NO_SHOW" } */
const UpdateStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED", "NO_SHOW"]),
});

/** Remarcação: { reschedule: { startDatetime, resourceId?, addressId? } } */
const RescheduleSchema = z.object({
  reschedule: z.object({
    startDatetime: z.string().datetime({
      message: "startDatetime inválido. Use ISO-8601 com timezone.",
    }),
    resourceId: UUID.optional(),
    addressId: UUID.optional(),
  }),
});

export const PatchAppointmentSchema = z.union([
  CancelSchema,
  UpdateStatusSchema,
  RescheduleSchema,
]);

export type PatchAppointmentInput = z.infer<typeof PatchAppointmentSchema>;
export type RescheduleInput = z.infer<typeof RescheduleSchema>["reschedule"];

// ─── PATCH /api/appointments/:id — alteração in-place (F5.4) ─────────────
//
// Contrato: Doc 16 § 40 — PATCH /api/appointments/:id
//   { "startDatetime": "...", "professionalId": "...", "modality": "...", "addressId": "..." }
//
// Regras de validação estrutural:
//   - Todos os campos são opcionais individualmente.
//   - Pelo menos um campo deve estar presente (payload não-vazio).
//   - Campos desconhecidos são removidos (strip — padrão do projeto).
//   - Status NÃO é campo desta operação.
//   - resourceId NÃO é campo livre; é resolvido pelo backend.
//   - serviceId NÃO é campo desta operação.
//
// NOTA DE INTEGRAÇÃO: Este schema será adicionado ao PatchAppointmentSchema
// em F5.6, quando AppointmentsService.alter() e o branch do controller
// estiverem implementados. Adicioná-lo ao union agora quebraria o typecheck
// do controller (body.status ficaria string | undefined na branch else).

/** Alteração in-place de appointment — RN-055/RN-056 */
export const AlterAppointmentSchema = z
  .object({
    professionalId: UUID.optional(),
    modality: z
      .enum(["IN_PERSON", "HOME_CARE"], {
        errorMap: () => ({ message: "modality deve ser 'IN_PERSON' ou 'HOME_CARE'." }),
      })
      .optional(),
    addressId: UUID.optional(),
    startDatetime: z
      .string()
      .datetime({
        message: "startDatetime inválido. Use ISO-8601 com timezone (ex: 2026-09-01T10:00:00Z).",
      })
      .optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "Pelo menos um campo deve ser informado para alteração." },
  );

export type AlterAppointmentInput = z.infer<typeof AlterAppointmentSchema>;

// ─── GET /api/appointments (query params) ────────────────────────────────

export const ListAppointmentsQuerySchema = z.object({
  status: z
    .enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida. Use YYYY-MM-DD.")
    .optional(),
  clientId: UUID.optional(),
  professionalId: UUID.optional(),
});

export type ListAppointmentsQuery = z.infer<typeof ListAppointmentsQuerySchema>;
