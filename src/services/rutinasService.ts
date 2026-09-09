import { supabase } from "@/lib/supabaseClient";
import type { Rutina } from "@/types";

export async function obtenerRutinasDeCliente(clienteId: string): Promise<Rutina[]> {
  const { data, error } = await supabase
    .from("rutinas")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("activa", true)
    .order("created_at", { ascending: false })
    .returns<Rutina[]>();

  if (error) throw error;
  return data;
}

export async function crearRutina(params: {
  profesionalId: string;
  clienteId: string;
  nombre: string;
  descripcion?: string;
}) {
  const { error } = await (supabase.from("rutinas") as any).insert({
    profesional_id: params.profesionalId,
    cliente_id: params.clienteId,
    nombre: params.nombre,
    descripcion: params.descripcion ?? null,
  });
  if (error) throw error;
}