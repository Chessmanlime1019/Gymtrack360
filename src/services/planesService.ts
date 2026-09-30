import { supabase } from "@/lib/supabaseClient";

interface PlanBase {
  id: string;
  nombre: string;
  precio: number;
  duracion_dias: number;
  es_multisede: boolean;
  sede_id: string | null;
}

export interface PlanOption extends PlanBase {}

export interface PlanCompleto extends PlanBase {
  activo: boolean;
  sedeNombre: string | null;
}

interface SedeMini {
  id: string;
  nombre: string;
}

// Usado por Membresías al asignar un plan a un cliente: para una sede dada,
// trae los planes GLOBALES (sede_id null) + los EXCLUSIVOS de esa sede.
// Nunca trae los exclusivos de otra sede.
export async function obtenerPlanesActivos(sedeId: string | null): Promise<PlanOption[]> {
  let query = supabase
    .from("planes")
    .select("id, nombre, precio, duracion_dias, es_multisede, sede_id")
    .eq("activo", true)
    .order("nombre");

  query = sedeId ? query.or(`sede_id.is.null,sede_id.eq.${sedeId}`) : query.is("sede_id", null);

  const { data, error } = await query.returns<PlanOption[]>();
  if (error) throw error;
  return data;
}

// Usado por la pantalla de administración de Planes. A diferencia de la
// función de arriba, aquí NO se mezcla: cada pestaña de sede muestra
// exactamente lo que le pertenece a ESA categoría, para que el Super
// Admin sepa sin ambigüedad qué está editando.
//   sedeId = null  -> solo los planes globales (para todas las sedes)
//   sedeId = "uuid" -> solo los planes exclusivos de esa sede
export async function obtenerTodosLosPlanes(sedeId: string | null): Promise<PlanCompleto[]> {
  let query = supabase
    .from("planes")
    .select("id, nombre, precio, duracion_dias, es_multisede, sede_id, activo")
    .order("nombre");

  query = sedeId ? query.eq("sede_id", sedeId) : query.is("sede_id", null);

  const { data, error } = await query.returns<Omit<PlanCompleto, "sedeNombre">[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  if (!sedeId) {
    // Todos son globales: no hace falta ir a buscar nombres de sede.
    return data.map((p) => ({ ...p, sedeNombre: null }));
  }

  const { data: sede, error: errSede } = await supabase
    .from("sedes")
    .select("id, nombre")
    .eq("id", sedeId)
    .single<SedeMini>();
  if (errSede) throw errSede;

  return data.map((p) => ({ ...p, sedeNombre: sede.nombre }));
}

export async function crearPlan(params: {
  nombre: string;
  precio: number;
  duracionDias: number;
  esMultisede: boolean;
  sedeId: string | null;
}) {
  const { error } = await (supabase.from("planes") as any).insert({
    nombre: params.nombre,
    precio: params.precio,
    duracion_dias: params.duracionDias,
    es_multisede: params.esMultisede,
    sede_id: params.sedeId,
    activo: true,
  });
  if (error) throw error;
}

export async function actualizarPlan(
  id: string,
  cambios: {
    nombre: string;
    precio: number;
    duracionDias: number;
    esMultisede: boolean;
    sedeId: string | null;
  }
) {
  const { error } = await (supabase.from("planes") as any)
    .update({
      nombre: cambios.nombre,
      precio: cambios.precio,
      duracion_dias: cambios.duracionDias,
      es_multisede: cambios.esMultisede,
      sede_id: cambios.sedeId,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function alternarActivoPlan(id: string, activo: boolean) {
  const { error } = await (supabase.from("planes") as any).update({ activo }).eq("id", id);
  if (error) throw error;
}