import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MoreHorizontal, X } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { NAV_POR_ROL } from "@/lib/navConfig";

const MAX_VISIBLE = 4;

export function BottomNav() {
  const { role } = useRole();
  const location = useLocation();
  const [masAbierto, setMasAbierto] = useState(false);

  if (!role) return null;
  const items = NAV_POR_ROL[role];

  const necesitaOverflow = items.length > MAX_VISIBLE + 1;
  const visibles = necesitaOverflow ? items.slice(0, MAX_VISIBLE) : items;
  const ocultos = necesitaOverflow ? items.slice(MAX_VISIBLE) : [];
  const hayOcultoActivo = ocultos.some((i) => location.pathname.startsWith(i.path));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {visibles.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-[11px] ${
                  isActive ? "text-primary" : "text-muted"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
          {necesitaOverflow && (
            <button
              onClick={() => setMasAbierto(true)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-[11px] ${
                hayOcultoActivo ? "text-primary" : "text-muted"
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              Más
            </button>
          )}
        </div>
      </nav>

      {masAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMasAbierto(false)}
          />
          <div className="relative w-full bg-surface rounded-t-xl border-t border-line pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <p className="text-sm font-semibold">Más opciones</p>
              <button onClick={() => setMasAbierto(false)} aria-label="Cerrar">
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>
            {ocultos.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMasAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm ${
                    isActive ? "text-primary" : "text-ink"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </>
  );
}