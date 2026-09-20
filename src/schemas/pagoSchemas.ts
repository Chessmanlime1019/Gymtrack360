import { z } from "zod";

// Opciones fijas de método de pago (no texto libre), según lo definido
// en la organización del proyecto: el gym no integra pasarela real,
// solo registra confirmaciones de pagos hechos por fuera.
export const METODOS_PAGO = ["Efectivo", "Yape", "Plin", "Transferencia"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const registrarPagoSchema = z.object({
  monto: z.coerce
    .number({ invalid_type_error: "Ingresa un monto válido" })
    .positive("El monto debe ser mayor a 0"),
  metodoPago: z.enum(METODOS_PAGO, {
    errorMap: () => ({ message: "Selecciona un método de pago" }),
  }),
});

export type RegistrarPagoValues = z.infer<typeof registrarPagoSchema>;
