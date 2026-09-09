import { supabase } from "@/lib/supabaseClient";
import type { ClienteMini } from "./clientesService";

export async function obtenerMisClientes(profesionalId: string): Promise<ClienteMini[]> {
  const { data: relaciones, error: errRel } = await supabase
    .from("profesional_clientes")
    .select("cliente_id")
    .eq("profesional_id", profesionalId)
    .returns<{ cliente_id: string }[]>();

  if (errRel) throw errRel;
  if (!relaciones || relaciones.length === 0) return [];

  const ids = relaciones.map((r) => r.cliente_id);
  const { data: clientes, error: errCli } = await supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .in("id", ids)
    .returns<ClienteMini[]>();

  if (errCli) throw errCli;
  return clientes;
}

export async function asignarClienteAProfesional(params: {
  profesionalId: string;
  clienteId: string;
  sedeId: string;
}) {
  const { error } = await (supabase.from("profesional_clientes") as any).insert({
    profesional_id: params.profesionalId,
    cliente_id: params.clienteId,
    sede_id: params.sedeId,
  });
  if (error) throw error;
}