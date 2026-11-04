import { z } from "zod";

export const sedeSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  direccion: z.string().min(2, "La dirección es obligatoria"),
  aforoMaximo: z.string().regex(/^([1-9][0-9]{0,4})?$/, "Escribe un número mayor que 0 o déjalo vacío"),
});

export type SedeFormValues = z.infer<typeof sedeSchema>;