import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Clock, Dumbbell, Repeat, StickyNote, Weight } from "lucide-react";

import type { RutinaDetalle } from "@/services/rutinasService";

interface Props {
  rutina: RutinaDetalle;
  // Si se pasa, cada ejercicio muestra un check (vista del cliente).
  seguimiento?: boolean;
}

function fmtDescanso(seg: number) {
  if (seg < 60) return `${seg} s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

// Etiqueta del día a partir de los grupos musculares que trabaja.
function etiquetaDia(rutina: RutinaDetalle, dia: number) {
  const grupos = [
    ...new Set(
      rutina.ejercicios
        .filter((e) => e.dia === dia)
        .map((e) => e.grupoMuscular)
        .filter((g): g is string => !!g)
    ),
  ];
  return grupos.slice(0, 3).join(" · ");
}

// Plan completo de una rutina, separado por días. Reutilizado por el panel
// del profesional y por la pantalla del cliente.
export function RutinaPlan({ rutina, seguimiento = false }: Props) {
  const dias = useMemo(
    () => [...new Set(rutina.ejercicios.map((e) => e.dia))].sort((a, b) => a - b),
    [rutina]
  );
  const [diaActivo, setDiaActivo] = useState<number>(dias[0] ?? 1);

  // Hechos de hoy, guardados solo en este navegador (no hace falta en base de datos).
  const claveHoy = `gt-rutina-${rutina.id}-${new Date().toISOString().slice(0, 10)}`;
  const [hechos, setHechos] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDiaActivo(dias[0] ?? 1);
  }, [rutina.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seguimiento) return;
    try {
      const guardado = localStorage.getItem(claveHoy);
      setHechos(new Set(guardado ? (JSON.parse(guardado) as string[]) : []));
    } catch {
      setHechos(new Set());
    }
  }, [claveHoy, seguimiento]);

  function alternar(id: string) {
    setHechos((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id);
      else sig.add(id);
      try {
        localStorage.setItem(claveHoy, JSON.stringify([...sig]));
      } catch {
        /* sin almacenamiento: el check solo vive en pantalla */
      }
      return sig;
    });
  }

  if (dias.length === 0) {
    return <p className="text-muted text-sm">Esta rutina todavía no tiene ejercicios.</p>;
  }

  const ejerciciosDia = rutina.ejercicios.filter((e) => e.dia === diaActivo);
  const hechosDia = ejerciciosDia.filter((e) => hechos.has(e.id)).length;

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {dias.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDiaActivo(d)}
            className={`shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-semibold border transition-colors ${
              d === diaActivo
                ? "bg-primary border-primary text-white"
                : "bg-bar border-line text-ink-2 hover:border-line-strong"
            }`}
          >
            Día {d}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-muted text-xs">{etiquetaDia(rutina, diaActivo) || "Sesión de entrenamiento"}</p>
        {seguimiento && (
          <p className="text-xs text-muted">
            {hechosDia}/{ejerciciosDia.length} hechos hoy
          </p>
        )}
      </div>

      <ol className="mt-3 space-y-3">
        {ejerciciosDia.map((e, i) => {
          const hecho = hechos.has(e.id);
          return (
            <li
              key={e.id}
              className={`rounded-2xl border p-4 transition-colors ${
                hecho ? "border-success/40 bg-success/5" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/15 text-primary text-sm font-bold grid place-items-center">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-ink font-semibold ${hecho ? "line-through opacity-60" : ""}`}>
                    {e.ejercicioNombre}
                  </p>
                  <p className="text-muted text-xs mt-0.5">
                    {[e.grupoMuscular, e.equipo].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {seguimiento && (
                  <button
                    type="button"
                    onClick={() => alternar(e.id)}
                    aria-label={hecho ? "Marcar como pendiente" : "Marcar como hecho"}
                    className={`shrink-0 w-11 h-11 rounded-xl border grid place-items-center transition-colors ${
                      hecho
                        ? "bg-success border-success text-white"
                        : "border-line-strong text-muted hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Check size={18} />
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Dato icono={<Dumbbell size={14} />} label="Series" valor={String(e.series)} />
                <Dato icono={<Repeat size={14} />} label="Reps" valor={String(e.repeticiones)} />
                <Dato icono={<Clock size={14} />} label="Descanso" valor={fmtDescanso(e.descansoSeg)} />
              </div>

              {(e.pesoSugerido || e.notas) && (
                <div className="mt-3 space-y-1.5 text-xs text-ink-2">
                  {e.pesoSugerido && (
                    <p className="flex items-center gap-1.5">
                      <Weight size={13} className="text-primary shrink-0" /> Carga sugerida: {e.pesoSugerido}
                    </p>
                  )}
                  {e.notas && (
                    <p className="flex items-start gap-1.5">
                      <StickyNote size={13} className="text-primary shrink-0 mt-0.5" /> {e.notas}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Dato({ icono, label, valor }: { icono: ReactNode; label: string; valor: string }) {
  return (
    <div className="bg-bar rounded-xl py-2">
      <p className="text-muted text-[11px] flex items-center justify-center gap-1">
        {icono} {label}
      </p>
      <p className="text-ink font-semibold text-sm mt-0.5">{valor}</p>
    </div>
  );
}