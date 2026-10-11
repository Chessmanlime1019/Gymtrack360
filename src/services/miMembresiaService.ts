import { supabase } from "@/lib/supabaseClient";

export interface MiMembresiaItem {
  id: string;
  planNombre: string;
  precio: number | null;
  duracionDias: number | null;
  esMultisede: boolean;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface MiPago {
  id: string;
  membresiaId: string | null;
  monto: number;
  metodoPago: string;
  fecha: string;
}

interface MembresiaRow {
  id: string;
  plan_id: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
}
interface PlanRow {
  id: string;
  nombre: string;
  precio: number;
  duracion_dias: number;
  es_multisede: boolean;
}

interface PagoRow {
  id: string;
  membresia_id: string | null;
  monto: number;
  metodo_pago: string;
  fecha: string;
}

// Todas las membresías del cliente (la más reciente primero) con el nombre
// del plan y de la sede ya resueltos. El id sale de la sesión, no de un parámetro.
export async function obtenerMisMembresias(clienteId: string): Promise<MiMembresiaItem[]> {
  const { data, error } = await supabase
    .from("membresias")
    .select("id, plan_id, estado, fecha_inicio, fecha_fin")
    .eq("cliente_id", clienteId)
    .order("fecha_inicio", { ascending: false })
    .returns<MembresiaRow[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const planIds = [...new Set(data.map((m) => m.plan_id))];
  const { data: planes, error: errPlanes } = await supabase
    .from("planes")
    .select("id, nombre, precio, duracion_dias, es_multisede")
    .in("id", planIds)
    .returns<PlanRow[]>();
  if (errPlanes) throw errPlanes;

  return data.map((m) => {
    const plan = planes?.find((p) => p.id === m.plan_id);
    return {
      id: m.id,
      planNombre: plan?.nombre ?? "Plan",
      precio: plan?.precio ?? null,
      duracionDias: plan?.duracion_dias ?? null,
      esMultisede: plan?.es_multisede ?? false,
      estado: m.estado,
      fechaInicio: m.fecha_inicio,
      fechaFin: m.fecha_fin,
    };
  });
}

export async function obtenerMisPagos(clienteId: string): Promise<MiPago[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select("id, membresia_id, monto, metodo_pago, fecha")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false })
    .returns<PagoRow[]>();
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    membresiaId: p.membresia_id,
    monto: p.monto,
    metodoPago: p.metodo_pago,
    fecha: p.fecha,
  }));
}