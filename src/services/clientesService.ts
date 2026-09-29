import { supabase } from "@/lib/supabaseClient";
import type { MembresiaEstado } from "@/types";

export interface ClienteConMembresia {
  id: string;
  nombre: string;
  apellido: string;
  sede_id: string | null;
  sedeNombre: string | null;
  qr_code: string | null;
  created_at: string;
  membresiaEstado: MembresiaEstado | null;
  membresiaFechaFin: string | null;
}

interface ClienteRow {
  id: string;
  nombre: string;
  apellido: string;
  sede_id: string | null;
  qr_code: string | null;
  created_at: string;
}

interface MembresiaRow {
  cliente_id: string;
  estado: MembresiaEstado;
  fecha_fin: string;
}

interface SedeMini {
  id: string;
  nombre: string;
}

export async function obtenerClientes(
  sedeId: string | null
): Promise<ClienteConMembresia[]> {
  let query = supabase
    .from("profiles")
    .select("id, nombre, apellido, sede_id, qr_code, created_at")
    .eq("role", "cliente")
    .order("created_at", { ascending: false });

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  const { data, error } = await query.returns<ClienteRow[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Segunda consulta: la membresía más reciente de cada cliente.
  const ids = data.map((c) => c.id);
  const { data: membresias, error: errorMem } = await supabase
    .from("membresias")
    .select("cliente_id, estado, fecha_fin")
    .in("cliente_id", ids)
    .order("fecha_fin", { ascending: false })
    .returns<MembresiaRow[]>();

  if (errorMem) throw errorMem;

  const mapaMembresia = new Map<string, MembresiaRow>();
  (membresias ?? []).forEach((m) => {
    if (!mapaMembresia.has(m.cliente_id)) {
      mapaMembresia.set(m.cliente_id, m);
    }
  });

  // Tercera consulta: nombre de sede de cada cliente (para mostrarlo en
  // el panel de detalle, ya que ya no se abre en una ventana modal).
  const sedeIds = [...new Set(data.map((c) => c.sede_id).filter(Boolean))] as string[];
  let mapaSedes = new Map<string, string>();

  if (sedeIds.length > 0) {
    const { data: sedesData, error: errSedes } = await supabase
      .from("sedes")
      .select("id, nombre")
      .in("id", sedeIds)
      .returns<SedeMini[]>();
    if (errSedes) throw errSedes;
    mapaSedes = new Map((sedesData ?? []).map((s) => [s.id, s.nombre]));
  }

  return data.map((c) => {
    const mem = mapaMembresia.get(c.id);
    return {
      ...c,
      membresiaEstado: mem?.estado ?? null,
      membresiaFechaFin: mem?.fecha_fin ?? null,
      sedeNombre: c.sede_id ? mapaSedes.get(c.sede_id) ?? "Sede eliminada" : null,
    };
  });
}

export async function actualizarCliente(
  id: string,
  cambios: { nombre: string; apellido: string; sedeId: string }
) {
  const { error } = await (supabase.from("profiles") as any)
    .update({
      nombre: cambios.nombre,
      apellido: cambios.apellido,
      sede_id: cambios.sedeId,
    })
    .eq("id", id);

  if (error) throw error;
}

export interface ClienteMini {
  id: string;
  nombre: string;
  apellido: string;
}

export async function obtenerClientesSimple(
  sedeId: string | null
): Promise<ClienteMini[]> {
  let query = supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .eq("role", "cliente")
    .order("nombre");

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  const { data, error } = await query.returns<ClienteMini[]>();
  if (error) throw error;
  return data;
}