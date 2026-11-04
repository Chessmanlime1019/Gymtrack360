import { supabase } from "@/lib/supabaseClient";

export interface AforoSede {
  sedeId: string;
  nombre: string;
  dentro: number;
  aforoMaximo: number | null;
}

export interface PersonaDentro {
  asistenciaId: string;
  clienteId: string;
  cliente: string;
  avatarUrl: string | null;
  fechaHora: string;
}

export async function obtenerAforoSedes(): Promise<AforoSede[]> {
  const { data, error } = await (supabase.rpc as any)("aforo_sedes");
  if (error) throw error;
  return ((data ?? []) as { sede_id: string; nombre: string; dentro: number; aforo_maximo: number | null }[]).map((f) => ({
    sedeId: f.sede_id,
    nombre: f.nombre,
    dentro: f.dentro,
    aforoMaximo: f.aforo_maximo,
  }));
}

export async function obtenerPersonasDentro(sedeId: string): Promise<PersonaDentro[]> {
  const { data, error } = await (supabase.rpc as any)("personas_dentro", { p_sede: sedeId });
  if (error) throw error;
  return (
    (data ?? []) as { asistencia_id: string; cliente_id: string; cliente: string; avatar_url: string | null; fecha_hora: string }[]
  ).map((f) => ({
    asistenciaId: f.asistencia_id,
    clienteId: f.cliente_id,
    cliente: f.cliente,
    avatarUrl: f.avatar_url,
    fechaHora: f.fecha_hora,
  }));
}

export async function registrarSalida(asistenciaId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("registrar_salida", { p_asistencia: asistenciaId });
  if (error) throw new Error(error.message);
}
