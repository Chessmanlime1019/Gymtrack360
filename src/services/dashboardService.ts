import { supabase } from "@/lib/supabaseClient";
import { obtenerKPIs as obtenerKPIsPorSede } from "@/services/obtenerKpisService";

export interface DashboardKPIs {
  totalClientes: number;
  clientesActivos: number;
  checkinsHoy: number;
  membresiasPorVencer: number;
  ingresosMes: number;
  totalSedes: number;
  sedesActivas: number;
  membresiasActivas: number;
  membresiasVencidas: number;
}

export interface IngresosPorDia {
  fecha: string;
  ingresos: number;
}

export interface ClientesPorSede {
  sede: string;
  cantidad: number;
}

export interface MembresiasPorEstado {
  estado: string;
  cantidad: number;
}

export interface IngresosPorSede {
  sede: string;
  ingresos: number;
}

function primerDiaMes(): string {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function inicioDelDia(): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy.toISOString();
}

export async function obtenerDashboardGlobal(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<DashboardKPIs> {
  const desdeFecha = desde ?? primerDiaMes();
  const hastaFecha = hasta ?? hoyISO();
  const hastaFinal = new Date(hastaFecha);
  hastaFinal.setHours(23, 59, 59, 999);

  if (sedeId) {
    const [tcRes, kpisRes, membRes, memvRes, sedesARes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "cliente")
        .eq("sede_id", sedeId),
      obtenerKPIsPorSede(sedeId),
      supabase
        .from("membresias")
        .select("id", { count: "exact", head: true })
        .eq("estado", "activa"),
      supabase
        .from("membresias")
        .select("id", { count: "exact", head: true })
        .eq("estado", "vencida"),
      supabase
        .from("sedes")
        .select("id, activa"),
    ]);

    const sedesArr = sedesARes.data ?? [];
    return {
      totalClientes: tcRes.count ?? 0,
      clientesActivos: membRes.count ?? 0,
      checkinsHoy: kpisRes.checkinsHoy,
      membresiasPorVencer: kpisRes.membresiasPorVencer,
      ingresosMes: kpisRes.ingresosMes,
      totalSedes: sedesArr.length,
      sedesActivas: sedesArr.filter((s) => (s as any).activa).length,
      membresiasActivas: membRes.count ?? 0,
      membresiasVencidas: memvRes.count ?? 0,
    };
  }

  const [tcRes, checkRes, pvRes, ingRes, membRes, memvRes, sedesARes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "cliente"),
      supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .gte("fecha_hora", inicioDelDia()),
      supabase
        .from("membresias")
        .select("id", { count: "exact", head: true })
        .eq("estado", "activa")
        .gte("fecha_fin", hoyISO())
        .lte("fecha_fin", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)),
      supabase
        .from("pagos")
        .select("monto")
        .gte("fecha", desdeFecha)
        .lte("fecha", hastaFinal.toISOString()),
      supabase
        .from("membresias")
        .select("id", { count: "exact", head: true })
        .eq("estado", "activa"),
      supabase
        .from("membresias")
        .select("id", { count: "exact", head: true })
        .eq("estado", "vencida"),
      supabase
        .from("sedes")
        .select("id, activa"),
    ]);

  const sedesArr = sedesARes.data ?? [];

  return {
    totalClientes: tcRes.count ?? 0,
    clientesActivos: membRes.count ?? 0,
    checkinsHoy: checkRes.count ?? 0,
    membresiasPorVencer: pvRes.count ?? 0,
    ingresosMes: (ingRes.data ?? []).reduce(
      (sum, p) => sum + ((p as any).monto ?? 0),
      0
    ),
    totalSedes: sedesArr.length,
    sedesActivas: sedesArr.filter((s) => (s as any).activa).length,
    membresiasActivas: membRes.count ?? 0,
    membresiasVencidas: memvRes.count ?? 0,
  };
}

export async function obtenerIngresosPorDia(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<IngresosPorDia[]> {
  const desdeFecha = desde ?? primerDiaMes();
  const hastaFecha = hasta ?? hoyISO();
  const hastaFinal = new Date(hastaFecha);
  hastaFinal.setHours(23, 59, 59, 999);

  let query = supabase
    .from("pagos")
    .select("monto, fecha")
    .gte("fecha", desdeFecha)
    .lte("fecha", hastaFinal.toISOString());

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  const { data, error } = await query.returns<{ monto: number; fecha: string }[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const mapa = new Map<string, number>();
  data.forEach((p) => {
    const dia = p.fecha.slice(0, 10);
    mapa.set(dia, (mapa.get(dia) ?? 0) + (p.monto ?? 0));
  });

  return Array.from(mapa.entries())
    .map(([fecha, ingresos]) => ({ fecha, ingresos }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function obtenerClientesPorSede(): Promise<ClientesPorSede[]> {
  const { data: sedes } = await supabase
    .from("sedes")
    .select("id, nombre")
    .eq("activa", true)
    .returns<{ id: string; nombre: string }[]>();

  if (!sedes || sedes.length === 0) return [];

  const resultados = await Promise.all(
    sedes.map(async (s) => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "cliente")
        .eq("sede_id", s.id);
      return { sede: s.nombre, cantidad: count ?? 0 };
    })
  );

  return resultados;
}

export async function obtenerMembresiasPorEstado(): Promise<MembresiasPorEstado[]> {
  const [actRes, vencRes, cancRes] = await Promise.all([
    supabase
      .from("membresias")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activa"),
    supabase
      .from("membresias")
      .select("id", { count: "exact", head: true })
      .eq("estado", "vencida"),
    supabase
      .from("membresias")
      .select("id", { count: "exact", head: true })
      .eq("estado", "cancelada"),
  ]);

  const resultado = [
    { estado: "Activas", cantidad: actRes.count ?? 0 },
    { estado: "Vencidas", cantidad: vencRes.count ?? 0 },
    { estado: "Canceladas", cantidad: cancRes.count ?? 0 },
  ].filter((e) => e.cantidad > 0);

  return resultado;
}

export async function obtenerIngresosPorSede(
  desde?: string,
  hasta?: string
): Promise<IngresosPorSede[]> {
  const desdeFecha = desde ?? primerDiaMes();
  const hastaFecha = hasta ?? hoyISO();
  const hastaFinal = new Date(hastaFecha);
  hastaFinal.setHours(23, 59, 59, 999);

  const { data: pagos } = await supabase
    .from("pagos")
    .select("sede_id, monto")
    .gte("fecha", desdeFecha)
    .lte("fecha", hastaFinal.toISOString())
    .returns<{ sede_id: string; monto: number }[]>();

  if (!pagos || pagos.length === 0) return [];

  const { data: sedes } = await supabase
    .from("sedes")
    .select("id, nombre")
    .returns<{ id: string; nombre: string }[]>();

  const mapaSedes = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const conteo = new Map<string, number>();

  pagos.forEach((p) => {
    conteo.set(p.sede_id, (conteo.get(p.sede_id) ?? 0) + (p.monto ?? 0));
  });

  return Array.from(conteo.entries())
    .map(([sede_id, ingresos]) => ({
      sede: mapaSedes.get(sede_id) ?? "Sede",
      ingresos,
    }))
    .sort((a, b) => b.ingresos - a.ingresos);
}
