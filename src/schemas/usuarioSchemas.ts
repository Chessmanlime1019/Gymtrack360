import { z } from "zod";

export const usuarioSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  apellido: z.string().min(2, "El apellido es obligatorio"),
  // El enum incluye los 5 roles (igual que UserRole) para que el formulario
  // siga siendo válido si alguna vez se abre sobre un usuario ya existente
  // con rol super_admin. Quien de verdad impide crear/asignar super_admin
  // es la lista ROLES_ASIGNABLES que arma las opciones del <select> en
  // Usuarios.tsx: ese rol nunca aparece como opción elegible.
  role: z.enum(["super_admin", "admin_sede", "recepcionista", "profesional", "cliente"]),
  sedeId: z.string().min(1, "Selecciona una sede"),
});

export type UsuarioFormValues = z.infer<typeof usuarioSchema>;

export const nuevoUsuarioSchema = usuarioSchema.extend({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type NuevoUsuarioFormValues = z.infer<typeof nuevoUsuarioSchema>;