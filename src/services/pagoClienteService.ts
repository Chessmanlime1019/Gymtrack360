import { supabase } from "@/lib/supabaseClient";

export const METODOS_CLIENTE = ["Yape", "Plin", "Efectivo"] as const;
export type MetodoCliente = (typeof METODOS_CLIENTE)[number];

export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada" | "cancelada";

export interface SolicitudPago {
  id: string;
  planId: string;
  planNombre: string;
  monto: number;
  metodo: MetodoCliente;
  numeroOperacion: string | null;
  estado: EstadoSolicitud;
  motivoRechazo: string | null;
  createdAt: string;
  revisadoAt: string | null;
}

interface Fila {
  id: string;
  plan_id: string;
  monto: number;
  metodo_pago: MetodoCliente;
  numero_operacion: string | null;
  estado: EstadoSolicitud;
  motivo_rechazo: string | null;
  created_at: string;
  revisado_at: string | null;
}

// El servidor valida plan, sede, método y N.° de operación, y avisa a recepción.
// La membresía NO se activa aquí: se activa cuando recepción confirma el pago.
export async function solicitarPago(params: {
  planId: string;
  metodo: MetodoCliente;
  operacion: string | null;
}): Promise<{ id: string }> {
  const { data, error } = await (supabase.rpc as any)("cliente_solicitar_pago", {
    p_plan_id: params.planId,
    p_metodo: params.metodo,
    p_operacion: params.operacion,
  });
  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id };
}

export async function cancelarSolicitud(id: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("cliente_cancelar_solicitud", { p_id: id });
  if (error) throw new Error(error.message);
}

// Última solicitud del cliente (pendiente o la más reciente ya revisada).
export async function obtenerMiUltimaSolicitud(clienteId: string): Promise<SolicitudPago | null> {
  const { data, error } = await (supabase.from("solicitudes_pago") as any)
    .select("id, plan_id, monto, metodo_pago, numero_operacion, estado, motivo_rechazo, created_at, revisado_at")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const fila = (data as Fila[] | null)?.[0];
  if (!fila) return null;

  const { data: plan } = await supabase
    .from("planes")
    .select("nombre")
    .eq("id", fila.plan_id)
    .maybeSingle<{ nombre: string }>();

  return {
    id: fila.id,
    planId: fila.plan_id,
    planNombre: plan?.nombre ?? "Plan",
    monto: Number(fila.monto),
    metodo: fila.metodo_pago,
    numeroOperacion: fila.numero_operacion,
    estado: fila.estado,
    motivoRechazo: fila.motivo_rechazo,
    createdAt: fila.created_at,
    revisadoAt: fila.revisado_at,
  };
}
