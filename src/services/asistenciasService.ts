import { supabase } from "@/lib/supabaseClient";

export interface AsistenciaRegistro {
  id: string;
  cliente_id: string;
  sede_id: string;
  fecha_hora: string;
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

async function obtenerNombreCliente(clienteId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nombre, apellido")
    .eq("id", clienteId)
    .single<{ nombre: string; apellido: string }>();

  if (error || !data) return "Cliente";
  return `${data.nombre} ${data.apellido}`;
}

export async function obtenerAsistencias(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<AsistenciaConNombre[]> {
  let query = supabase
    .from("asistencias")
    .select("id, cliente_id, sede_id, fecha_hora")
    .order("fecha_hora", { ascending: false })
    .limit(100);

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }
  if (desde) {
    query = query.gte("fecha_hora", desde);
  }
  if (hasta) {
    const hastaDate = new Date(hasta);
    hastaDate.setHours(23, 59, 59, 999);
    query = query.lte("fecha_hora", hastaDate.toISOString());
  }

  const { data, error } = await query.returns<AsistenciaRegistro[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const clienteIds = [...new Set(data.map((a) => a.cliente_id))];
  const nombres = await Promise.all(clienteIds.map(obtenerNombreCliente));
  const mapa = new Map(clienteIds.map((id, i) => [id, nombres[i]]));

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
  if (desde) {
    query = query.gte("fecha_hora", desde);
  }
  if (hasta) {
    const hastaDate = new Date(hasta);
    hastaDate.setHours(23, 59, 59, 999);
    query = query.lte("fecha_hora", hastaDate.toISOString());
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function asistenciasAgrupadasPorDia(
  sedeId: string | null,
  desde?: string,
  hasta?: string
): Promise<AsistenciaPorDia[]> {
  let query = supabase
    .from("asistencias")
    .select("fecha_hora");

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }
  if (desde) {
    query = query.gte("fecha_hora", desde);
  }
  if (hasta) {
    const hastaDate = new Date(hasta);
    hastaDate.setHours(23, 59, 59, 999);
    query = query.lte("fecha_hora", hastaDate.toISOString());
  }

  const { data, error } = await query.returns<{ fecha_hora: string }[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const conteo = new Map<string, number>();
  data.forEach((a) => {
    const dia = a.fecha_hora.slice(0, 10);
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
  let query = supabase
    .from("asistencias")
    .select("sede_id");

  if (desde) {
    query = query.gte("fecha_hora", desde);
  }
  if (hasta) {
    const hastaDate = new Date(hasta);
    hastaDate.setHours(23, 59, 59, 999);
    query = query.lte("fecha_hora", hastaDate.toISOString());
  }

  const { data, error } = await query.returns<{ sede_id: string }[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

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
