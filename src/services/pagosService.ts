import { supabase } from "@/lib/supabaseClient";
import type { MetodoPago } from "@/schemas/pagoSchemas";

export interface PagoReciente {
  id: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
}

export async function registrarPago(params: {
  pagoId?: string;
  clienteId: string;
  membresiaId?: string;
  sedeId?: string;
  monto: number;
  metodoPago: MetodoPago | string;
  comprobanteUrl?: string;
}) {
  const { error } = await (supabase.from("pagos") as any).insert({
    ...(params.pagoId ? { id: params.pagoId } : {}),
    cliente_id: params.clienteId,
    membresia_id: params.membresiaId,
    sede_id: params.sedeId,
    monto: params.monto,
    metodo_pago: params.metodoPago,
    comprobante_url: params.comprobanteUrl,
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

export async function obtenerPagos() {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data ?? [];
}