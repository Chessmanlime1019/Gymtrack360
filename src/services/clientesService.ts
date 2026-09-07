import { supabase } from "@/lib/supabaseClient";
import type { MembresiaEstado } from "@/types";

export interface ClienteConMembresia {
  id: string;
  nombre: string;
  apellido: string;
  sede_id: string | null;
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
  // (RLS ya filtra esto por sede automáticamente si el usuario es
  // admin_sede/recepcionista; para super_admin trae todo lo pedido.)
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

  return data.map((c) => {
    const mem = mapaMembresia.get(c.id);
    return {
      ...c,
      membresiaEstado: mem?.estado ?? null,
      membresiaFechaFin: mem?.fecha_fin ?? null,
    };
  });
}

export async function actualizarCliente(
  id: string,
  cambios: { nombre: string; apellido: string }
) {
  const { error } = await (supabase.from("profiles") as any)
    .update(cambios)
    .eq("id", id);

  if (error) throw error;
}