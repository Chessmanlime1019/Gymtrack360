import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/types";

export interface UsuarioCompleto {
  id: string;
  nombre: string;
  apellido: string;
  role: UserRole;
  sede_id: string | null;
  sedeNombre: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  nombre: string;
  apellido: string;
  role: UserRole;
  sede_id: string | null;
  created_at: string;
}

interface SedeMini {
  id: string;
  nombre: string;
}

export async function obtenerTodosLosUsuarios(): Promise<UsuarioCompleto[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, role, sede_id, created_at")
    .order("created_at", { ascending: false })
    .returns<ProfileRow[]>();

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const sedeIds = [...new Set(data.map((u) => u.sede_id).filter(Boolean))] as string[];
  let mapaSedes = new Map<string, string>();

  if (sedeIds.length > 0) {
    const { data: sedes, error: errSedes } = await supabase
      .from("sedes")
      .select("id, nombre")
      .in("id", sedeIds)
      .returns<SedeMini[]>();
    if (errSedes) throw errSedes;
    mapaSedes = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  }

  return data.map((u) => ({
    ...u,
    sedeNombre: u.sede_id ? mapaSedes.get(u.sede_id) ?? "Sede eliminada" : null,
  }));
}

export async function actualizarUsuario(
  id: string,
  cambios: { nombre: string; apellido: string; role: UserRole; sedeId: string | null }
) {
  const { error } = await (supabase.from("profiles") as any)
    .update({
      nombre: cambios.nombre,
      apellido: cambios.apellido,
      role: cambios.role,
      sede_id: cambios.sedeId,
    })
    .eq("id", id);

  if (error) throw error;
}