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
      <nav
        className="
          md:hidden
          fixed
          bottom-0
          left-0
          right-0
          z-40
          min-h-[64px]
          border-t
          border-line
          bg-surface/95
          backdrop-blur
          pb-[max(env(safe-area-inset-bottom),8px)]
        "
      >
        <div className="flex">
          {visibles.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[11px] font-medium"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`
                      flex
                      items-center
                      justify-center
                      w-9
                      h-7
                      rounded-full
                      transition-colors
                      ${isActive ? "bg-primary" : ""}
                    `}
                  >
                    <item.icon
                      className={`w-5 h-5 ${isActive ? "text-ink" : "text-muted"}`}
                    />
                  </span>
                  <span className={isActive ? "text-primary font-semibold" : "text-muted"}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {necesitaOverflow && (
            <button
              onClick={() => setMasAbierto(true)}
              aria-label="Más opciones de navegación"
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[11px] font-medium"
            >
              <span
                className={`
                  flex
                  items-center
                  justify-center
                  w-9
                  h-7
                  rounded-full
                  transition-colors
                  ${hayOcultoActivo ? "bg-primary" : ""}
                `}
              >
                <MoreHorizontal
                  className={`w-5 h-5 ${hayOcultoActivo ? "text-ink" : "text-muted"}`}
                />
              </span>
              <span className={hayOcultoActivo ? "text-primary font-semibold" : "text-muted"}>
                Más
              </span>
            </button>
          )}
        </div>
      </nav>

      {masAbierto && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label="Más opciones de navegación"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMasAbierto(false)}
          />

          <div className="relative w-full max-h-[70dvh] overflow-y-auto bg-surface rounded-t-2xl border-t border-line pb-[max(env(safe-area-inset-bottom),12px)]">
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-line bg-surface">
              <p className="text-sm font-semibold text-ink">Más opciones</p>
              <button
                onClick={() => setMasAbierto(false)}
                aria-label="Cerrar"
                className="p-1.5 -m-1.5 rounded-md hover:bg-white/5"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            {ocultos.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMasAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 min-h-[52px] text-sm ${
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