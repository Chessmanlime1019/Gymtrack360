import { supabase } from "@/lib/supabaseClient";

export const METODOS_CLIENTE = ["Yape", "Plin", "Efectivo"] as const;
export type MetodoCliente = (typeof METODOS_CLIENTE)[number];

export interface ResultadoPago {
  pagoId: string;
  membresiaId: string;
  monto: number;
  fecha: string;
  fechaInicio: string;
  fechaFin: string;
}

interface RespuestaRpc {
  pago_id: string;
  membresia_id: string;
  monto: number;
  fecha: string;
  fecha_inicio: string;
  fecha_fin: string;
}

// El servidor valida plan, sede, método y calcula fechas y monto.
export async function pagarPlan(params: {
  planId: string;
  metodo: MetodoCliente;
}): Promise<ResultadoPago> {
  const { data, error } = await (supabase.rpc as any)("cliente_pagar_plan", {
    p_plan_id: params.planId,
    p_metodo: params.metodo,
  });
  if (error) throw error;

  const r = data as RespuestaRpc;
  return {
    pagoId: r.pago_id,
    membresiaId: r.membresia_id,
    monto: Number(r.monto),
    fecha: r.fecha,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
  };
}