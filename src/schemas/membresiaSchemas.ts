import { z } from "zod";

export const asignarMembresiaSchema = z.object({
  clienteId: z.string().min(1, "Selecciona un cliente"),
  planId: z.string().min(1, "Selecciona un plan"),
});

export type AsignarMembresiaValues = z.infer<typeof asignarMembresiaSchema>;