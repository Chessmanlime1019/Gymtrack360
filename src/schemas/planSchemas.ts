import { z } from "zod";

export const planSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
  duracionDias: z.coerce.number().int().positive("La duración debe ser mayor a 0"),
  esMultisede: z.boolean(),
});

export type PlanFormValues = z.infer<typeof planSchema>;