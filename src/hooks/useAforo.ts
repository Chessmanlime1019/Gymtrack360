import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { obtenerAforoSedes } from "@/services/aforoService";

// Consultas que cambian cada vez que alguien entra o sale.
const AL_CAMBIAR = [
  "aforo-sedes",
  "personas-dentro",
  "recepcion-dashboard-kpis",
  "recepcion-dashboard-accesos",
  "dashboard-kpis",
];

// Aforo de todas las sedes. Con tiempoReal se actualiza al instante con cada
// escaneo (el staff recibe los eventos de su sede); el refresco cada minuto
// cubre las entradas que dejan de contar a las 3 horas, que no generan evento.
// El cliente no recibe eventos de otras personas: solo usa el refresco.
export function useAforo(tiempoReal = true) {
  const queryClient = useQueryClient();
  const idCanal = useId();

  const consulta = useQuery({
    queryKey: ["aforo-sedes"],
    queryFn: obtenerAforoSedes,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!tiempoReal) return;
    const canal = supabase
      .channel(`aforo-${idCanal}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "asistencias" }, () => {
        AL_CAMBIAR.forEach((clave) => queryClient.invalidateQueries({ queryKey: [clave] }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [tiempoReal, idCanal, queryClient]);

  return consulta;
}
