import { supabase } from "@/lib/supabaseClient";

export type MotivoRecordatorio = "sin_venir" | "por_vencer";

// Devuelve "enviado" o "repetido" (ya se le envió uno en las últimas 24 h).
export async function recordarCliente(clienteId: string, motivo: MotivoRecordatorio): Promise<"enviado" | "repetido"> {
  const { data, error } = await (supabase.rpc as any)("prof_recordar_cliente", {
    p_cliente: clienteId,
    p_motivo: motivo,
  });
  if (error) throw error;
  return data === "repetido" ? "repetido" : "enviado";
}