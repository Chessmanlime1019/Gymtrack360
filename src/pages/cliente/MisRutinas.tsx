import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Dumbbell, Target, UserRound } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { RutinaPlan } from "@/components/rutinas/RutinaPlan";
import { obtenerMiPerfil } from "@/services/perfilService";
import { obtenerRutinas } from "@/services/rutinasService";

export default function MisRutinas() {
  const [seleccionId, setSeleccionId] = useState<string | null>(null);

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
  const clienteId = perfil.data?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mis-rutinas", clienteId],
    queryFn: () => obtenerRutinas({ clienteId }),
    enabled: !!clienteId,
  });

  // Solo rutinas activas; la más reciente primero (ya viene ordenado).
  const rutinas = (data ?? []).filter((r) => r.activa);
  const seleccionada = rutinas.find((r) => r.id === seleccionId) ?? rutinas[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-ink">Mis rutinas</h1>
        <p className="text-muted text-sm mt-1">El plan de entrenamiento que armó tu profesional para ti.</p>
      </div>

      <AsyncState
        isLoading={perfil.isLoading || isLoading}
        isError={perfil.isError || isError}
        isEmpty={rutinas.length === 0}
        emptyMessage="Todavía no tienes una rutina asignada. Pídele a tu profesional que arme la tuya."
        errorMessage="No se pudieron cargar tus rutinas."
      >
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
          <ul className="space-y-3">
            {rutinas.map((r) => {
              const activa = seleccionada?.id === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSeleccionId(r.id)}
                    className={`w-full text-left bg-surface border rounded-2xl p-4 min-h-[56px] transition-colors ${
                      activa ? "border-primary" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <p className="text-ink font-semibold">{r.nombre}</p>
                    <p className="text-muted text-xs mt-1">
                      {r.totalDias} {r.totalDias === 1 ? "día" : "días"} · {r.ejercicios.length} ejercicios
                    </p>
                    {r.objetivo && (
                      <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        {r.objetivo}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {seleccionada && (
            <section className="bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="bg-primary px-5 py-5">
                <p className="text-white/80 text-xs uppercase tracking-wide">Tu rutina</p>
                <h2 className="text-white text-xl mt-1">{seleccionada.nombre}</h2>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-white/90 text-xs">
                  {seleccionada.objetivo && (
                    <span className="inline-flex items-center gap-1.5">
                      <Target size={14} /> {seleccionada.objetivo}
                    </span>
                  )}
                  {seleccionada.nivel && (
                    <span className="inline-flex items-center gap-1.5">
                      <Dumbbell size={14} /> {seleccionada.nivel}
                    </span>
                  )}
                  {seleccionada.semanas && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange size={14} /> {seleccionada.semanas} semanas
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={14} /> {seleccionada.profesionalNombre}
                  </span>
                </div>
              </div>

              <div className="p-5">
                {seleccionada.descripcion && (
                  <p className="text-ink-2 text-sm mb-5 bg-bar rounded-xl p-4">{seleccionada.descripcion}</p>
                )}
                <RutinaPlan rutina={seleccionada} seguimiento />
              </div>
            </section>
          )}
        </div>
      </AsyncState>
    </div>
  );
}