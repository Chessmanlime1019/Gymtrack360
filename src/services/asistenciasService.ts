import { supabase } from "@/lib/supabaseClient";
import { diaLima, finDiaLima, inicioDiaLima } from "@/lib/fechas";
import { traerPorIds, traerTodas } from "@/lib/paginar";

// En este archivo "desde" y "hasta" son días YYYY-MM-DD en hora de Lima.

export interface AsistenciaRegistro {
  id: string;
  cliente_id: string;
  sede_id: string;
  fecha_hora: string;
  salida_at: string | null;
}

export interface AsistenciaConNombre extends AsistenciaRegistro {
  clienteNombre: string;
}

export interface AsistenciaPorDia {
  fecha: string;
  cantidad: number;
}

export interface AsistenciaPorSede {
  sede_id: string;
  sede_nombre: string;
  cantidad: number;
}

export async function obtenerAsistencias(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<AsistenciaConNombre[]> {
  const data = await traerTodas<AsistenciaRegistro>(() => {
    let query = (supabase.from("asistencias") as any)
      .select("id, cliente_id, sede_id, fecha_hora, salida_at")
      .order("fecha_hora", { ascending: false })
      .order("id");
    if (sedeId) query = query.eq("sede_id", sedeId);
    if (desde) query = query.gte("fecha_hora", inicioDiaLima(desde));
    if (hasta) query = query.lte("fecha_hora", finDiaLima(hasta));
    return query;
  });
  if (data.length === 0) return [];

  const clienteIds = [...new Set(data.map((a) => a.cliente_id))];
  const clientes = await traerPorIds<{ id: string; nombre: string; apellido: string }>(clienteIds, (lote) =>
    supabase.from("profiles").select("id, nombre, apellido").in("id", lote)
  );
  const mapa = new Map(clientes.map((c) => [c.id, `${c.nombre} ${c.apellido}`]));

  return data.map((a) => ({
    ...a,
    clienteNombre: mapa.get(a.cliente_id) ?? "Cliente",
  }));
}

export async function contarAsistencias(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<number> {
  let query = supabase
    .from("asistencias")
    .select("id", { count: "exact", head: true });

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }
  if (desde) query = query.gte("fecha_hora", inicioDiaLima(desde));
  if (hasta) query = query.lte("fecha_hora", finDiaLima(hasta));

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function asistenciasAgrupadasPorDia(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<AsistenciaPorDia[]> {
  const data = await traerTodas<{ fecha_hora: string }>(() => {
    let query = supabase.from("asistencias").select("fecha_hora").order("id");
    if (sedeId) query = query.eq("sede_id", sedeId);
    if (desde) query = query.gte("fecha_hora", inicioDiaLima(desde));
    if (hasta) query = query.lte("fecha_hora", finDiaLima(hasta));
    return query;
  });
  if (data.length === 0) return [];

  const conteo = new Map<string, number>();
  data.forEach((a) => {
    const dia = diaLima(a.fecha_hora);
    conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
  });

  return Array.from(conteo.entries())
    .map(([fecha, cantidad]) => ({ fecha, cantidad }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function asistenciasPorSede(
  desde?: string,
  hasta?: string
): Promise<AsistenciaPorSede[]> {
  const data = await traerTodas<{ sede_id: string }>(() => {
    let query = supabase.from("asistencias").select("sede_id").order("id");
    if (desde) query = query.gte("fecha_hora", inicioDiaLima(desde));
    if (hasta) query = query.lte("fecha_hora", finDiaLima(hasta));
    return query;
  });
  if (data.length === 0) return [];

  const { data: sedes } = await supabase
    .from("sedes")
    .select("id, nombre")
    .returns<{ id: string; nombre: string }[]>();

  const mapaSedes = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));

  const conteo = new Map<string, number>();
  data.forEach((a) => {
    conteo.set(a.sede_id, (conteo.get(a.sede_id) ?? 0) + 1);
  });

  return Array.from(conteo.entries())
    .map(([sede_id, cantidad]) => ({
      sede_id,
      sede_nombre: mapaSedes.get(sede_id) ?? "Sede",
      cantidad,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
}
