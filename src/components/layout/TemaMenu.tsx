import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { useTema, type Tema } from "@/context/TemaContext";

const OPCIONES: { valor: Tema; texto: string; icono: typeof Sun }[] = [
  { valor: "light", texto: "Claro", icono: Sun },
  { valor: "dark", texto: "Oscuro", icono: Moon },
  { valor: "system", texto: "Sistema", icono: Monitor },
];

export function TemaMenu() {
  const { tema, resuelto, setTema } = useTema();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const IconoActual = resuelto === "dark" ? Moon : Sun;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Cambiar apariencia"
        aria-expanded={abierto}
        className={`w-11 h-11 rounded-xl grid place-items-center transition-colors ${
          abierto ? "bg-primary/10 text-primary" : "text-ink-2 hover:bg-ink/5 hover:text-ink"
        }`}
      >
        <IconoActual size={19} />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Apariencia"
          className="absolute right-0 top-[52px] z-50 w-48 bg-surface border border-line-strong rounded-xl shadow-2xl p-1.5"
        >
          <p className="px-2.5 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Apariencia</p>
          {OPCIONES.map(({ valor, texto, icono: Icono }) => {
            const activo = tema === valor;
            return (
              <button
                key={valor}
                type="button"
                role="menuitemradio"
                aria-checked={activo}
                onClick={() => {
                  setTema(valor);
                  setAbierto(false);
                }}
                className={`w-full min-h-[40px] px-2.5 rounded-lg flex items-center gap-2.5 text-sm transition-colors ${
                  activo ? "text-primary font-medium" : "text-ink-2 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <Icono size={16} />
                <span className="flex-1 text-left">{texto}</span>
                {activo && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
