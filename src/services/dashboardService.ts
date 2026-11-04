import { supabase } from "@/lib/supabaseClient";
import { diaLima, finDiaLima, hoyLima, inicioDiaLima, primerDiaMesLima, sumarDias } from "@/lib/fechas";
import { traerTodas } from "@/lib/paginar";

// Los indicadores se consultan directo sobre las tablas: las políticas RLS ya
// limitan a cada rol a su sede (super admin ve todas). "desde" y "hasta" son
// días YYYY-MM-DD en hora de Lima.
//
// Una membresía sigue en estado "activa" aunque su fecha de fin ya haya
// pasado (nada la cambia sola), así que vigente = activa y fecha_fin >= hoy.

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

// Filtra por sede solo si hay una seleccionada.
function deSede(query: any, columna: string, sedeId: string | null) {
  return sedeId ? query.eq(columna, sedeId) : query;
}

function sinError<T extends { error: unknown }>(...respuestas: T[]) {
  for (const r of respuestas) if (r.error) throw r.error;
}

async function contarMembresias(sedeId: string | null) {
  const hoy = hoyLima();
  const membresias = () => supabase.from("membresias").select("id", { count: "exact", head: true });
  const [vigentes, vencidasEstado, vencidasFecha, canceladas] = await Promise.all([
    deSede(membresias().eq("estado", "activa").gte("fecha_fin", hoy), "sede_origen_id", sedeId),
    deSede(membresias().eq("estado", "vencida"), "sede_origen_id", sedeId),
    deSede(membresias().eq("estado", "activa").lt("fecha_fin", hoy), "sede_origen_id", sedeId),
    deSede(membresias().eq("estado", "cancelada"), "sede_origen_id", sedeId),
  ]);
  sinError(vigentes, vencidasEstado, vencidasFecha, canceladas);
  return {
    vigentes: vigentes.count ?? 0,
    vencidas: (vencidasEstado.count ?? 0) + (vencidasFecha.count ?? 0),
    canceladas: canceladas.count ?? 0,
  };
}

export async function obtenerDashboardGlobal(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<DashboardKPIs> {
  const hoy = hoyLima();
  const d = desde ?? primerDiaMesLima();
  const h = hasta ?? hoy;

  const [clientes, clientesVigentes, porVencer, checkins, pagos, sedes, membresias] = await Promise.all([
    deSede(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "cliente"), "sede_id", sedeId),
    traerTodas<{ cliente_id: string }>(() =>
      deSede(
        supabase.from("membresias").select("cliente_id").eq("estado", "activa").gte("fecha_fin", hoy).order("id"),
        "sede_origen_id",
        sedeId
      )
    ),
    deSede(
      supabase
        .from("membresias")
        .select("id", { count: "exact", head: true })
        .eq("estado", "activa")
        .gte("fecha_fin", hoy)
        .lte("fecha_fin", sumarDias(hoy, 7)),
      "sede_origen_id",
      sedeId
    ),
    deSede(
      supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .gte("fecha_hora", inicioDiaLima(hoy))
        .lte("fecha_hora", finDiaLima(hoy)),
      "sede_id",
      sedeId
    ),
    traerTodas<{ monto: number }>(() =>
      deSede(
        supabase.from("pagos").select("monto").gte("fecha", inicioDiaLima(d)).lte("fecha", finDiaLima(h)).order("id"),
        "sede_id",
        sedeId
      )
    ),
    supabase.from("sedes").select("id, activa").returns<{ id: string; activa: boolean }[]>(),
    contarMembresias(sedeId),
  ]);
  sinError(clientes, porVencer, checkins, sedes);

  const sedesArr = sedes.data ?? [];
  const idsVigentes = new Set(clientesVigentes.map((m) => m.cliente_id));

  return {
    totalClientes: clientes.count ?? 0,
    clientesActivos: idsVigentes.size,
    checkinsHoy: checkins.count ?? 0,
    membresiasPorVencer: porVencer.count ?? 0,
    ingresosMes: pagos.reduce((suma, p) => suma + Number(p.monto ?? 0), 0),
    totalSedes: sedesArr.length,
    sedesActivas: sedesArr.filter((s) => s.activa).length,
    membresiasActivas: membresias.vigentes,
    membresiasVencidas: membresias.vencidas,
  };
}

export async function obtenerIngresosPorDia(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<IngresosPorDia[]> {
  const d = desde ?? primerDiaMesLima();
  const h = hasta ?? hoyLima();

  const data = await traerTodas<{ monto: number; fecha: string }>(() =>
    deSede(
      supabase.from("pagos").select("monto, fecha").gte("fecha", inicioDiaLima(d)).lte("fecha", finDiaLima(h)).order("id"),
      "sede_id",
      sedeId
    )
  );
  if (data.length === 0) return [];

  const mapa = new Map<string, number>();
  data.forEach((p) => {
    const dia = diaLima(p.fecha);
    mapa.set(dia, (mapa.get(dia) ?? 0) + Number(p.monto ?? 0));
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

  return Promise.all(
    sedes.map(async (s) => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "cliente")
        .eq("sede_id", s.id);
      return { sede: s.nombre, cantidad: count ?? 0 };
    })
  );
}

export async function obtenerMembresiasPorEstado(sedeId: string | null): Promise<MembresiasPorEstado[]> {
  const m = await contarMembresias(sedeId);
  return [
    { estado: "Vigentes", cantidad: m.vigentes },
    { estado: "Vencidas", cantidad: m.vencidas },
    { estado: "Canceladas", cantidad: m.canceladas },
  ].filter((e) => e.cantidad > 0);
}

export async function obtenerIngresosPorSede(desde?: string, hasta?: string): Promise<IngresosPorSede[]> {
  const d = desde ?? primerDiaMesLima();
  const h = hasta ?? hoyLima();

  const pagos = await traerTodas<{ sede_id: string; monto: number }>(() =>
    supabase.from("pagos").select("sede_id, monto").gte("fecha", inicioDiaLima(d)).lte("fecha", finDiaLima(h)).order("id")
  );
  if (pagos.length === 0) return [];

  const { data: sedes } = await supabase.from("sedes").select("id, nombre").returns<{ id: string; nombre: string }[]>();

  const mapaSedes = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const conteo = new Map<string, number>();
  pagos.forEach((p) => conteo.set(p.sede_id, (conteo.get(p.sede_id) ?? 0) + Number(p.monto ?? 0)));

  return Array.from(conteo.entries())
    .map(([sedeId, ingresos]) => ({ sede: mapaSedes.get(sedeId) ?? "Sede", ingresos }))
    .sort((a, b) => b.ingresos - a.ingresos);
}
