import { supabase } from "@/lib/supabaseClient";

export interface PlanOption {
  id: string;
  nombre: string;
  precio: number;
  duracion_dias: number;
  es_multisede: boolean;
}

export async function obtenerPlanesActivos(): Promise<PlanOption[]> {
  const { data, error } = await supabase
    .from("planes")
    .select("id, nombre, precio, duracion_dias, es_multisede")
    .eq("activo", true)
    .order("nombre")
    .returns<PlanOption[]>();

  if (error) throw error;
  return data;
}