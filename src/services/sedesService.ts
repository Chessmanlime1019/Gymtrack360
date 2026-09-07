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