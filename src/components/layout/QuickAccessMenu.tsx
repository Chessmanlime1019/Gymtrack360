import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { NAV_POR_ROL } from "@/lib/navConfig";

export function QuickAccessMenu() {
  const { role } = useRole();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  if (!role) return null;
  const items = NAV_POR_ROL[role];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Acceso rÃ¡pido"
        className="p-2 rounded-lg text-muted hover:bg-black/5 hover:text-primary transition-colors"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
      {abierto && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-line rounded-xl shadow-lg z-50 overflow-hidden">
          <p className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wide text-muted">
            Acceso rÃ¡pido
          </p>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setAbierto(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-ink/80 hover:bg-black/5 hover:text-primary transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
