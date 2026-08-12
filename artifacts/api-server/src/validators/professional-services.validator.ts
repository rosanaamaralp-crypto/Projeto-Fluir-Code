import { z } from "zod";

export const AddProfessionalServiceSchema = z.object({
  serviceId: z.string().uuid("serviceId deve ser um UUID válido."),
});

export type AddProfessionalServiceInput = z.infer<typeof AddProfessionalServiceSchema>;
