import { z } from "zod";

export const planSchema = z
  .object({
    nombre: z.string().min(2, "El nombre es obligatorio"),
    precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
    duracionDias: z.coerce.number().int().positive("La duración debe ser mayor a 0"),
    esMultisede: z.boolean(),
    // Alcance: para quién existe este plan. "todas" = plan global
    // (sede_id null en la base de datos). "sede" = exclusivo de una sede,
    // en cuyo caso sedeId es obligatorio (ver el refine de abajo).
    alcance: z.enum(["todas", "sede"]),
    sedeId: z.string().optional(),
  })
  .refine((v) => v.alcance === "todas" || !!v.sedeId, {
    message: "Selecciona una sede",
    path: ["sedeId"],
  });

export type PlanFormValues = z.infer<typeof planSchema>;