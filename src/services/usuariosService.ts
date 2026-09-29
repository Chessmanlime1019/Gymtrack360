import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/types";

export interface UsuarioCompleto {
  id: string;
  nombre: string;
  apellido: string;
  role: UserRole;
  sede_id: string | null;
  sedeNombre: string | null;
  activo: boolean;
  created_at: string;
}

interface ProfileRow {
  id: string;
  nombre: string;
  apellido: string;
  role: UserRole;
  sede_id: string | null;
  activo: boolean;
  created_at: string;
}

interface SedeMini {
  id: string;
  nombre: string;
}

export async function obtenerTodosLosUsuarios(): Promise<UsuarioCompleto[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, role, sede_id, activo, created_at")
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

// No existe un "eliminarUsuario" real a propósito: borrar de Auth requiere
// la service_role key, que nunca debe usarse desde el navegador. En su
// lugar, se desactiva (mismo patrón que alternarActivaSede).
export async function alternarActivoUsuario(id: string, activo: boolean) {
  const { error } = await (supabase.from("profiles") as any)
    .update({ activo })
    .eq("id", id);

  if (error) throw error;
}

export interface NuevoUsuarioInput {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  role: UserRole;
  sedeId: string | null;
}

// Crea el usuario en Auth + su fila en profiles. Corre en el servidor
// (Edge Function admin-crear-usuario) porque necesita la service_role key.
export async function crearUsuario(datos: NuevoUsuarioInput) {
  const { data, error } = await supabase.functions.invoke("admin-crear-usuario", {
    body: datos,
  });

  if (error) {
    // supabase-js no siempre expone el mensaje del backend en `error.message`
    // cuando la función responde con un status distinto de 2xx; por eso se
    // intenta leer el cuerpo de la respuesta si está disponible.
    const mensaje =
      (error as { context?: { body?: { error?: string } } }).context?.body?.error ??
      error.message ??
      "No se pudo crear el usuario.";
    throw new Error(mensaje);
  }

  return data as { id: string };
}