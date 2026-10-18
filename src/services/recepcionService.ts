import { supabase } from "@/lib/supabaseClient";

export const METODOS_STAFF = ["Efectivo", "Yape", "Plin", "Transferencia"] as const;
export type MetodoStaff = (typeof METODOS_STAFF)[number];

export interface ResultadoVenta {
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

// Vende o renueva un plan a un cliente de la sede. El servidor (función
// staff_vender_plan) valida sede, plan y método, calcula fechas y monto, y
// crea la membresía + el pago en un solo paso.
export async function venderPlan(params: {
  clienteId: string;
  planId: string;
  metodoPago: MetodoStaff;
}): Promise<ResultadoVenta> {
  const { data, error } = await (supabase.rpc as any)("staff_vender_plan", {
    p_cliente_id: params.clienteId,
    p_plan_id: params.planId,
    p_metodo: params.metodoPago,
  });
  if (error) throw new Error(error.message);

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

// El QR lo genera solo la base de datos al crear al cliente (formato GT360-<id>).
export async function obtenerQrCliente(clienteId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("qr_code")
    .eq("id", clienteId)
    .single<{ qr_code: string | null }>();
  if (error) return null;
  return data?.qr_code ?? null;
}

// Contraseña temporal legible (sin letras confusas como 0/O o 1/l/I).
export function generarClave(largo = 10): string {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(largo);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => letras[b % letras.length]).join("");
}

/* =====================================================================
   Asistencias y caja del día (hora de Lima, UTC-5 sin horario de verano)
   ===================================================================== */

export function hoyLima(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

export function horaLima(iso: string): number {
  const h = Number(
    new Date(iso).toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "America/Lima" })
  );
  return h % 24; // algunos navegadores devuelven 24 a medianoche
}

function rangoDia(fecha: string) {
  return { desde: `${fecha}T00:00:00-05:00`, hasta: `${fecha}T23:59:59.999-05:00` };
}

interface NombreRow {
  id: string;
  nombre: string;
  apellido: string;
}

async function nombresDe(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .in("id", ids)
    .returns<NombreRow[]>();
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));
}

export interface AsistenciaDia {
  id: string;
  clienteId: string;
  clienteNombre: string;
  fechaHora: string;
  planNombre: string | null;
}

export async function obtenerAsistenciasDelDia(
  sedeId: string,
  fecha: string
): Promise<AsistenciaDia[]> {
  const { desde, hasta } = rangoDia(fecha);

  const { data, error } = await supabase
    .from("asistencias")
    .select("id, cliente_id, fecha_hora")
    .eq("sede_id", sedeId)
    .gte("fecha_hora", desde)
    .lte("fecha_hora", hasta)
    .order("fecha_hora", { ascending: false })
    .limit(1000)
    .returns<{ id: string; cliente_id: string; fecha_hora: string }[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const clienteIds = [...new Set(data.map((a) => a.cliente_id))];
  const nombres = await nombresDe(clienteIds);

  // Plan que tenía cada cliente ese día.
  const { data: membs, error: errM } = await supabase
    .from("membresias")
    .select("cliente_id, plan_id, fecha_fin")
    .in("cliente_id", clienteIds)
    .neq("estado", "cancelada")
    .lte("fecha_inicio", fecha)
    .gte("fecha_fin", fecha)
    .order("fecha_fin", { ascending: false })
    .returns<{ cliente_id: string; plan_id: string; fecha_fin: string }[]>();
  if (errM) throw errM;

  const planPorCliente = new Map<string, string>();
  (membs ?? []).forEach((m) => {
    if (!planPorCliente.has(m.cliente_id)) planPorCliente.set(m.cliente_id, m.plan_id);
  });
  const planIds = [...new Set(planPorCliente.values())];
  let nombrePlan = new Map<string, string>();
  if (planIds.length > 0) {
    const { data: planes, error: errP } = await supabase
      .from("planes")
      .select("id, nombre")
      .in("id", planIds)
      .returns<{ id: string; nombre: string }[]>();
    if (errP) throw errP;
    nombrePlan = new Map((planes ?? []).map((p) => [p.id, p.nombre]));
  }

  return data.map((a) => ({
    id: a.id,
    clienteId: a.cliente_id,
    clienteNombre: nombres.get(a.cliente_id) ?? "Cliente",
    fechaHora: a.fecha_hora,
    planNombre: nombrePlan.get(planPorCliente.get(a.cliente_id) ?? "") ?? null,
  }));
}

export interface PagoDia {
  id: string;
  clienteNombre: string;
  planNombre: string | null;
  monto: number;
  metodo: string;
  fecha: string;
}

export async function obtenerPagosDelDia(sedeId: string, fecha: string): Promise<PagoDia[]> {
  const { desde, hasta } = rangoDia(fecha);

  const { data, error } = await supabase
    .from("pagos")
    .select("id, cliente_id, membresia_id, monto, metodo_pago, fecha")
    .eq("sede_id", sedeId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .limit(1000)
    .returns<
      {
        id: string;
        cliente_id: string;
        membresia_id: string | null;
        monto: number;
        metodo_pago: string;
        fecha: string;
      }[]
    >();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const nombres = await nombresDe([...new Set(data.map((p) => p.cliente_id))]);

  const membIds = [...new Set(data.map((p) => p.membresia_id).filter((x): x is string => !!x))];
  const planDeMemb = new Map<string, string>();
  if (membIds.length > 0) {
    const { data: membs, error: errM } = await supabase
      .from("membresias")
      .select("id, plan_id")
      .in("id", membIds)
      .returns<{ id: string; plan_id: string }[]>();
    if (errM) throw errM;
    const planIds = [...new Set((membs ?? []).map((m) => m.plan_id))];
    const { data: planes, error: errP } = await supabase
      .from("planes")
      .select("id, nombre")
      .in("id", planIds)
      .returns<{ id: string; nombre: string }[]>();
    if (errP) throw errP;
    const nombrePlan = new Map((planes ?? []).map((p) => [p.id, p.nombre]));
    (membs ?? []).forEach((m) => planDeMemb.set(m.id, nombrePlan.get(m.plan_id) ?? ""));
  }

  return data.map((p) => ({
    id: p.id,
    clienteNombre: nombres.get(p.cliente_id) ?? "Cliente",
    planNombre: p.membresia_id ? planDeMemb.get(p.membresia_id) || null : null,
    monto: Number(p.monto),
    metodo: p.metodo_pago,
    fecha: p.fecha,
  }));
}