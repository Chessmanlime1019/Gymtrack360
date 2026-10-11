import { z } from "zod";

// El cliente solo puede cambiar su nombre y apellido. El correo y la sede
// los maneja recepción o el admin, por eso no están aquí.
export const perfilSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  apellido: z.string().min(2, "El apellido es obligatorio"),
});

export type PerfilFormValues = z.infer<typeof perfilSchema>;

export const contrasenaSchema = z
  .object({
    nueva: z.string().min(8, "Mínimo 8 caracteres"),
    confirmar: z.string().min(1, "Repite la contraseña"),
  })
  .refine((v) => v.nueva === v.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });

export type ContrasenaFormValues = z.infer<typeof contrasenaSchema>;