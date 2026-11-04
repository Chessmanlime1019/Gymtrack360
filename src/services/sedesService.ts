import { supabase } from "@/lib/supabaseClient";

export interface SedeOption {
  id: string;
  nombre: string;
}

export async function obtenerSedesActivas(): Promise<SedeOption[]> {
  const { data, error } = await supabase
    .from("sedes")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre")
    .returns<SedeOption[]>();

  if (error) throw error;
  return data;
}
export interface SedeCompleta {
  id: string;
  nombre: string;
  direccion: string | null;
  activa: boolean;
  aforo_maximo: number | null;
  created_at: string;
}

export async function obtenerTodasLasSedes(): Promise<SedeCompleta[]> {
  const { data, error } = await supabase
    .from("sedes")
    .select("id, nombre, direccion, activa, aforo_maximo, created_at")
    .order("nombre")
    .returns<SedeCompleta[]>();

  if (error) throw error;
  return data;
}

export async function crearSede(params: { nombre: string; direccion: string; aforo_maximo: number | null }) {
  const { error } = await (supabase.from("sedes") as any).insert({
    nombre: params.nombre,
    direccion: params.direccion,
    aforo_maximo: params.aforo_maximo,
    activa: true,
  });
  if (error) throw error;
}

export async function actualizarSede(
  id: string,
  cambios: { nombre: string; direccion: string; aforo_maximo: number | null }
) {
  const { error } = await (supabase.from("sedes") as any)
    .update(cambios)
    .eq("id", id);
  if (error) throw error;
}

export async function alternarActivaSede(id: string, activa: boolean) {
  const { error } = await (supabase.from("sedes") as any)
    .update({ activa })
    .eq("id", id);
  if (error) throw error;
}