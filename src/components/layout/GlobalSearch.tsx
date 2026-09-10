import { useEffect, useRef, useState } from "react";

import { Search, Loader2 } from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

import {
  buscarGlobal,
  type ResultadoBusqueda,
} from "@/services/searchService";

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
      if (
        ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        setAbierto(false);
      }
    }

    document.addEventListener("mousedown", onClickFuera);

    return () =>
      document.removeEventListener("mousedown", onClickFuera);
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
        const r = await buscarGlobal(
          term,
          sesion.role,
          sesion.sedeId,
          sesion.userId
        );

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
    <div
      className="relative flex-1 max-w-md"
      ref={ref}
    >

      <Search
        className="
          w-4
          h-4
          absolute
          left-3.5
          top-1/2
          -translate-y-1/2
          text-[#858e97]
        "
      />

      <input
        type="text"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        onFocus={() =>
          resultados.length > 0 && setAbierto(true)
        }
        disabled={!soportado}
        placeholder={
          soportado
            ? "Buscar clientes..."
            : "Búsqueda no disponible para tu rol"
        }
        className="
          w-full
          h-[40px]
          rounded-lg
          bg-[#191d21]
          border
          border-[#30363d]
          pl-10
          pr-8
          py-2
          text-sm
          text-white
          placeholder:text-[#858e97]
          outline-none
          transition-all
          focus:border-[#f15a24]/70
          focus:ring-2
          focus:ring-[#f15a24]/10
          hover:border-[#3a424a]
          disabled:opacity-40
          disabled:cursor-not-allowed
        "
      />

      {cargando && (
        <Loader2
          className="
            w-4
            h-4
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-[#f15a24]
            animate-spin
          "
        />
      )}

      {abierto &&
        soportado &&
        termino.trim().length >= 2 && (
          <div
            className="
              absolute
              left-0
              right-0
              mt-2
              bg-[#1b2024]
              border
              border-[#30363d]
              rounded-xl
              shadow-2xl
              z-50
              overflow-hidden
              max-h-72
              overflow-y-auto
            "
          >

            {resultados.length === 0 && !cargando ? (
              <p className="px-4 py-6 text-center text-[#89929b] text-sm">
                Sin resultados para "{termino}"
              </p>
            ) : (
              resultados.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setAbierto(false);
                    setTermino("");

                    navigate(
                      RUTA_RESULTADO[sesion.role] ?? "/"
                    );
                  }}
                  className="
                    w-full
                    text-left
                    px-4
                    py-2.5
                    hover:bg-white/[0.04]
                    transition-colors
                    border-b
                    border-[#2a3036]
                    last:border-0
                  "
                >
                  <p className="text-white text-sm">
                    {r.titulo}
                  </p>

                  <p className="text-[#89929b] text-xs mt-0.5">
                    {r.subtitulo}
                  </p>
                </button>
              ))
            )}

          </div>
        )}

    </div>
  );
}