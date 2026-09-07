import { z } from "zod";

export const editarClienteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  apellido: z.string().min(2, "El apellido es obligatorio"),
});

export type EditarClienteValues = z.infer<typeof editarClienteSchema>;