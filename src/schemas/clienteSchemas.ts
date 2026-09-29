import { z } from "zod";

export const editarClienteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  apellido: z.string().min(2, "El apellido es obligatorio"),
  sedeId: z.string().min(1, "Selecciona una sede"),
});

export type EditarClienteValues = z.infer<typeof editarClienteSchema>;