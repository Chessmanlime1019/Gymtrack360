import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

// La sede sale de la cuenta con la que se inició sesión: al entrar con otra
// cuenta cambia sola. El Super Admin no pertenece a una sede: las ve todas.
export function useSedeActual() {
  const { sesion } = useAuth();
  const sedeId = sesion?.sedeId ?? null;
  const global = sesion?.role === "super_admin";

  const { data, isLoading } = useQuery({
    queryKey: ["sede-actual", sedeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sedes")
        .select("nombre, direccion")
        .eq("id", sedeId as string)
        .single<{ nombre: string; direccion: string | null }>();
      if (error) throw error;
      return data;
    },
    enabled: !!sedeId && !global,
    staleTime: 5 * 60_000,
  });

  if (global) return { nombre: "Todas las sedes", detalle: "Vista general", global, cargando: false };
  if (!sedeId) return { nombre: "Sin sede asignada", detalle: null, global, cargando: false };
  return { nombre: data?.nombre ?? "", detalle: data?.direccion ?? null, global, cargando: isLoading };
}

// Tarjeta al pie del menú lateral.
export function SedeLateral() {
  const sede = useSedeActual();
  const Icono = sede.global ? Building2 : MapPin;

  return (
    <div className="relative z-10 bg-bar px-4 pb-5">
      <div className="pt-4 border-t border-line">
        <div className="flex items-center gap-3 rounded-xl bg-surface border border-line-strong px-3 py-3">
          <span className="w-9 h-9 rounded-lg bg-primary text-white grid place-items-center shrink-0 shadow-sm shadow-primary/30">
            <Icono className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Sede</p>
            {sede.cargando ? (
              <div className="h-3.5 w-28 rounded bg-ink/10 animate-pulse mt-1" />
            ) : (
              <p className="text-[13px] font-semibold leading-snug text-ink line-clamp-2" title={sede.nombre}>
                {sede.nombre}
              </p>
            )}
            {sede.detalle && (
              <p className="text-[11px] text-muted truncate mt-0.5" title={sede.detalle}>
                {sede.detalle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Franja en el celular, donde no hay menú lateral.
export function SedeMovil() {
  const sede = useSedeActual();
  const Icono = sede.global ? Building2 : MapPin;
  if (sede.cargando) return null;

  return (
    <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-line bg-bar text-xs">
      <Icono className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="font-semibold text-ink truncate">{sede.nombre}</span>
    </div>
  );
}
