import { z } from "zod";

export const usuarioSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  apellido: z.string().min(2, "El apellido es obligatorio"),
  role: z.enum(["super_admin", "admin_sede", "recepcionista", "profesional", "cliente"]),
  sedeId: z.string(),
});

export type UsuarioFormValues = z.infer<typeof usuarioSchema>;