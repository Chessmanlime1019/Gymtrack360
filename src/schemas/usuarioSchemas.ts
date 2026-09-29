import { z } from "zod";

export const usuarioSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  apellido: z.string().min(2, "El apellido es obligatorio"),
  role: z.enum(["super_admin", "admin_sede", "recepcionista", "profesional", "cliente"]),
  sedeId: z.string(),
});

export type UsuarioFormValues = z.infer<typeof usuarioSchema>;

export const nuevoUsuarioSchema = usuarioSchema
  .extend({
    email: z.string().email("Ingresa un correo válido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((v) => v.role === "super_admin" || v.sedeId !== "", {
    message: "Selecciona una sede para este rol",
    path: ["sedeId"],
  });

export type NuevoUsuarioFormValues = z.infer<typeof nuevoUsuarioSchema>;