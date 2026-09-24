import { supabase } from "@/lib/supabaseClient";
import type { MetodoPago } from "@/schemas/pagoSchemas";

export interface PagoReciente {
  id: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
}

export async function registrarPago(params: {
  clienteId: string;
  membresiaId: string;
  sedeId: string;
  monto: number;
  metodoPago: MetodoPago;
}) {
  // Cast puntual porque el insert falla en tipos (mismo patrón usado en
  // membresiasService/clientesService). "fecha" la pone el default de la
  // tabla (now()), no hace falta mandarla desde el cliente.
  const { error } = await (supabase.from("pagos") as any).insert({
    cliente_id: params.clienteId,
    membresia_id: params.membresiaId,
    sede_id: params.sedeId,
    monto: params.monto,
    metodo_pago: params.metodoPago,
  });

  if (error) throw error;
}

export async function obtenerPagosRecientesCliente(
  clienteId: string,
  limite = 3
): Promise<PagoReciente[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select("id, monto, metodo_pago, fecha")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false })
    .limit(limite)
    .returns<PagoReciente[]>();

  if (error) throw error;
  return data ?? [];
}
