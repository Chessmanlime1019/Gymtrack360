import { supabase } from "@/lib/supabaseClient";
import type { EstadoSolicitud, MetodoCliente } from "@/services/pagoClienteService";

export interface SolicitudStaff {
  id: string;
  clienteId: string;
  clienteNombre: string;
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
  cliente_id: string;
  plan_id: string;
  monto: number;
  metodo_pago: MetodoCliente;
  numero_operacion: string | null;
  estado: EstadoSolicitud;
  motivo_rechazo: string | null;
  created_at: string;
  revisado_at: string | null;
}

// "pendientes": por revisar, la más antigua primero (orden de llegada).
// "revisadas": las últimas 30 aprobadas/rechazadas/canceladas.
export async function obtenerSolicitudesSede(
  sedeId: string,
  vista: "pendientes" | "revisadas"
): Promise<SolicitudStaff[]> {
  let q = (supabase.from("solicitudes_pago") as any)
    .select("id, cliente_id, plan_id, monto, metodo_pago, numero_operacion, estado, motivo_rechazo, created_at, revisado_at")
    .eq("sede_id", sedeId);
  q =
    vista === "pendientes"
      ? q.eq("estado", "pendiente").order("created_at", { ascending: true }).limit(200)
      : q.neq("estado", "pendiente").order("revisado_at", { ascending: false }).limit(30);

  const { data, error } = await q;
  if (error) throw error;
  const filas = (data ?? []) as Fila[];
  if (filas.length === 0) return [];

  const clienteIds = [...new Set(filas.map((f) => f.cliente_id))];
  const planIds = [...new Set(filas.map((f) => f.plan_id))];
  const [clientes, planes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombre, apellido")
      .in("id", clienteIds)
      .returns<{ id: string; nombre: string; apellido: string }[]>(),
    supabase.from("planes").select("id, nombre").in("id", planIds).returns<{ id: string; nombre: string }[]>(),
  ]);
  if (clientes.error) throw clientes.error;
  if (planes.error) throw planes.error;

  const nombre = new Map((clientes.data ?? []).map((c) => [c.id, `${c.nombre} ${c.apellido}`]));
  const plan = new Map((planes.data ?? []).map((p) => [p.id, p.nombre]));

  return filas.map((f) => ({
    id: f.id,
    clienteId: f.cliente_id,
    clienteNombre: nombre.get(f.cliente_id) ?? "Cliente",
    planNombre: plan.get(f.plan_id) ?? "Plan",
    monto: Number(f.monto),
    metodo: f.metodo_pago,
    numeroOperacion: f.numero_operacion,
    estado: f.estado,
    motivoRechazo: f.motivo_rechazo,
    createdAt: f.created_at,
    revisadoAt: f.revisado_at,
  }));
}

// Aprobar crea la membresía y el pago (staff_vender_plan) en el servidor.
export async function revisarSolicitud(params: {
  id: string;
  aprobar: boolean;
  motivo?: string;
}): Promise<void> {
  const { error } = await (supabase.rpc as any)("staff_revisar_solicitud", {
    p_id: params.id,
    p_aprobar: params.aprobar,
    p_motivo: params.motivo ?? null,
  });
  if (error) throw new Error(error.message);
}
