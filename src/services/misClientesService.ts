import { supabase } from "@/lib/supabaseClient";
import {
  obtenerResumenProfesional,
  type ClienteResumen,
} from "@/services/dashboardProfesionalService";

export interface ClienteSede {
  id: string;
  nombre: string;
  apellido: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface MisClientesData {
  asignados: ClienteResumen[];
  disponibles: ClienteSede[]; // clientes de la sede que aún no atiende
}

interface PersonaRow {
  id: string;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  created_at: string;
}

export async function obtenerMisClientes(
  profesionalId: string,
  sedeId: string
): Promise<MisClientesData> {
  const [resumen, sede] = await Promise.all([
    obtenerResumenProfesional(profesionalId),
    supabase
      .from("profiles")
      .select("id, nombre, apellido, avatar_url, created_at")
      .eq("role", "cliente")
      .eq("sede_id", sedeId)
      .order("nombre")
      .returns<PersonaRow[]>(),
  ]);
  if (sede.error) throw sede.error;

  const asignadosIds = new Set(resumen.clientes.map((c) => c.id));
  const disponibles: ClienteSede[] = (sede.data ?? [])
    .filter((p) => !asignadosIds.has(p.id))
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
    }));

  return { asignados: resumen.clientes, disponibles };
}

export async function tomarACargo(params: { profesionalId: string; clienteId: string; sedeId: string }) {
  const { data, error } = await supabase
    .from("profesional_clientes")
    .select("id")
    .eq("profesional_id", params.profesionalId)
    .eq("cliente_id", params.clienteId)
    .limit(1)
    .returns<{ id: string }[]>();
  if (error) throw error;
  if (data && data.length > 0) return;

  const { error: errIns } = await (supabase.from("profesional_clientes") as any).insert({
    profesional_id: params.profesionalId,
    cliente_id: params.clienteId,
    sede_id: params.sedeId,
  });
  if (errIns) throw errIns;
}

export async function dejarDeAtender(params: { profesionalId: string; clienteId: string }) {
  const { error } = await (supabase.from("profesional_clientes") as any)
    .delete()
    .eq("profesional_id", params.profesionalId)
    .eq("cliente_id", params.clienteId);
  if (error) throw error;
}