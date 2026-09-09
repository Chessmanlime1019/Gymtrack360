import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/types";

export interface ResultadoBusqueda {
  id: string;
  titulo: string;
  subtitulo: string;
}

interface ClienteFila {
  id: string;
  nombre: string;
  apellido: string;
  sede_id: string | null;
}

export async function buscarGlobal(
  termino: string,
  role: UserRole,
  sedeId: string | null,
  userId: string
): Promise<ResultadoBusqueda[]> {
  const term = termino.trim();
  if (term.length < 2) return [];

  if (role === "super_admin" || role === "admin_sede" || role === "recepcionista") {
    let query = supabase
      .from("profiles")
      .select("id, nombre, apellido, sede_id")
      .eq("role", "cliente")
      .or("nombre.ilike.%" + term + "%,apellido.ilike.%" + term + "%")
      .limit(8);

    if (role !== "super_admin" && sedeId) {
      query = query.eq("sede_id", sedeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const filas = (data ?? []) as unknown as ClienteFila[];
    return filas.map(function (c) {
      return {
        id: c.id,
        titulo: c.nombre + " " + c.apellido,
        subtitulo: "Cliente",
      };
    });
  }

  if (role === "profesional") {
    const relResp = await supabase
      .from("profesional_clientes")
      .select("cliente_id")
      .eq("profesional_id", userId);
    if (relResp.error) throw relResp.error;

    const relaciones = (relResp.data ?? []) as unknown as { cliente_id: string }[];
    if (relaciones.length === 0) return [];

    const ids = relaciones.map(function (r) {
      return r.cliente_id;
    });

    const cliResp = await supabase
      .from("profiles")
      .select("id, nombre, apellido")
      .in("id", ids)
      .or("nombre.ilike.%" + term + "%,apellido.ilike.%" + term + "%");
    if (cliResp.error) throw cliResp.error;

    const clientes = (cliResp.data ?? []) as unknown as ClienteFila[];
    return clientes.map(function (c) {
      return {
        id: c.id,
        titulo: c.nombre + " " + c.apellido,
        subtitulo: "Mi cliente",
      };
    });
  }

  return [];
}
