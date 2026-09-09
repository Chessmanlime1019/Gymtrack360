import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { buscarGlobal, type ResultadoBusqueda } from "@/services/searchService";
import type { UserRole } from "@/types";

const RUTA_RESULTADO: Partial<Record<UserRole, string>> = {
  super_admin: "/admin/clientes",
  admin_sede: "/admin/clientes",
  recepcionista: "/recepcion/control-acceso",
  profesional: "/profesional/mis-clientes",
};

export function GlobalSearch() {
  const { sesion } = useAuth();
  const navigate = useNavigate();
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const soportado = !!sesion && sesion.role !== "cliente";

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  useEffect(() => {
    if (!sesion || !soportado) return;
    const term = termino.trim();
    if (term.length < 2) {
      setResultados([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setCargando(true);
      try {
        const r = await buscarGlobal(term, sesion.role, sesion.sedeId, sesion.userId);
        setResultados(r);
        setAbierto(true);
      } catch {
        setResultados([]);
      } finally {
        setCargando(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [termino, sesion, soportado]);

  if (!sesion) return null;

  return (
    <div className="relative flex-1 max-w-md" ref={ref}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="text"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        onFocus={() => resultados.length > 0 && setAbierto(true)}
        disabled={!soportado}
        placeholder={soportado ? "Buscar clientes..." : "Búsqueda no disponible para tu rol"}
        className="w-full rounded-lg bg-background border border-white/10 pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
      />
      {cargando && (
        <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
      )}

      {abierto && soportado && termino.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 bg-surface border border-white/10 rounded-xl shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
          {resultados.length === 0 && !cargando ? (
            <p className="px-4 py-6 text-center text-muted text-sm">
              Sin resultados para "{termino}"
            </p>
          ) : (
            resultados.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setAbierto(false);
                  setTermino("");
                  navigate(RUTA_RESULTADO[sesion.role] ?? "/");
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <p className="text-sm">{r.titulo}</p>
                <p className="text-muted text-xs">{r.subtitulo}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}