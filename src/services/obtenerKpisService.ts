import { supabase } from "@/lib/supabaseClient";

export interface KPIsSede {
  clientesActivos: number;
  checkinsHoy: number;
  membresiasPorVencer: number;
  ingresosMes: number;
}

export async function obtenerKPIs(sedeId: string): Promise<KPIsSede> {
  const { data, error } = await supabase.rpc(
    "obtener_kpis_sede" as any,
    { p_sede_id: sedeId } as any
  );

  if (error) {
    console.error("Error obteniendo KPIs:", error);
    return { clientesActivos: 0, checkinsHoy: 0, membresiasPorVencer: 0, ingresosMes: 0 };
  }

  const raw = data as any;
  return {
    clientesActivos: raw?.clientesActivos ?? 0,
    checkinsHoy: raw?.checkinsHoy ?? 0,
    membresiasPorVencer: raw?.membresiasPorVencer ?? 0,
    ingresosMes: raw?.ingresosMes ?? 0,
  };
}
