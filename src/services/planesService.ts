import { supabase } from "@/lib/supabaseClient";

export interface PlanOption {
  id: string;
  nombre: string;
  precio: number;
  duracion_dias: number;
  es_multisede: boolean;
}

export interface PlanCompleto extends PlanOption {
  activo: boolean;
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

export async function obtenerTodosLosPlanes(): Promise<PlanCompleto[]> {
  const { data, error } = await supabase
    .from("planes")
    .select("id, nombre, precio, duracion_dias, es_multisede, activo")
    .order("nombre")
    .returns<PlanCompleto[]>();

  if (error) throw error;
  return data;
}

export async function crearPlan(params: {
  nombre: string;
  precio: number;
  duracionDias: number;
  esMultisede: boolean;
}) {
  const { error } = await (supabase.from("planes") as any).insert({
    nombre: params.nombre,
    precio: params.precio,
    duracion_dias: params.duracionDias,
    es_multisede: params.esMultisede,
    activo: true,
  });
  if (error) throw error;
}

export async function actualizarPlan(
  id: string,
  cambios: { nombre: string; precio: number; duracionDias: number; esMultisede: boolean }
) {
  const { error } = await (supabase.from("planes") as any)
    .update({
      nombre: cambios.nombre,
      precio: cambios.precio,
      duracion_dias: cambios.duracionDias,
      es_multisede: cambios.esMultisede,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function alternarActivoPlan(id: string, activo: boolean) {
  const { error } = await (supabase.from("planes") as any)
    .update({ activo })
    .eq("id", id);
  if (error) throw error;
}