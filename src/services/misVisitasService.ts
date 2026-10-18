import { supabase } from "@/lib/supabaseClient";

export interface Visita {
  id: string;
  sedeId: string;
  fechaHora: string;
}

// Visitas del propio cliente de los últimos 13 meses. La seguridad la pone
// la base de datos: un cliente solo puede leer sus propias asistencias.
export async function obtenerMisVisitas(clienteId: string): Promise<Visita[]> {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - 13);

  const { data, error } = await supabase
    .from("asistencias")
    .select("id, sede_id, fecha_hora")
    .eq("cliente_id", clienteId)
    .gte("fecha_hora", desde.toISOString())
    .order("fecha_hora", { ascending: false })
    .limit(1500)
    .returns<{ id: string; sede_id: string; fecha_hora: string }[]>();

  if (error) throw error;
  return (data ?? []).map((a) => ({ id: a.id, sedeId: a.sede_id, fechaHora: a.fecha_hora }));
}