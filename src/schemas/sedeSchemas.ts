import { z } from "zod";

export const sedeSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  direccion: z.string().min(2, "La dirección es obligatoria"),
});

export type SedeFormValues = z.infer<typeof sedeSchema>;