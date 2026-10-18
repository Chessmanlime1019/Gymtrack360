import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Pin, X } from "lucide-react";

import { obtenerAvisosVigentes } from "@/services/avisosService";
import { ESTILO_AVISO } from "./estilosAviso";

const CLAVE = "gt360-avisos-cerrados";

function leerCerrados(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as string[];
  } catch {
    return [];
  }
}

// Muestra hasta 2 avisos arriba del inicio. Cada persona puede cerrarlos
// (se recuerda en este dispositivo); el aviso sigue en la pantalla de Avisos.
export function AvisosBanner({ rutaTodos }: { rutaTodos: string }) {
  const [cerrados, setCerrados] = useState<string[]>(leerCerrados);

  const q = useQuery({ queryKey: ["avisos-vigentes"], queryFn: obtenerAvisosVigentes });

  const visibles = (q.data ?? []).filter((a) => !cerrados.includes(a.id)).slice(0, 2);
  if (visibles.length === 0) return null;

  function cerrar(id: string) {
    const nuevos = [...cerrados, id].slice(-50);
    setCerrados(nuevos);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevos));
    } catch {
      /* sin almacenamiento: se oculta solo mientras la página está abierta */
    }
  }

  return (
    <div className="space-y-2">
      {visibles.map((a) => {
        const e = ESTILO_AVISO[a.tipo];
        return (
          <div
            key={a.id}
            className="relative bg-surface border border-line rounded-2xl pl-5 pr-12 py-3.5 overflow-hidden"
          >
            <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${e.barra}`} />
            <div className="flex items-center gap-2">
              {a.fijado ? (
                <Pin className={`w-3.5 h-3.5 ${e.texto}`} />
              ) : (
                <Megaphone className={`w-3.5 h-3.5 ${e.texto}`} />
              )}
              <p className="text-sm font-semibold text-ink truncate">{a.titulo}</p>
            </div>
            <p className="text-xs text-ink-2 mt-1 line-clamp-2">{a.mensaje}</p>
            <Link to={rutaTodos} className="text-xs text-primary font-medium hover:underline mt-1.5 inline-block">
              Ver todos los avisos
            </Link>
            <button
              onClick={() => cerrar(a.id)}
              aria-label="Cerrar aviso"
              className="absolute right-2 top-2 w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}