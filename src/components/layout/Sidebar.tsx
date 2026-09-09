import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { NAV_POR_ROL, ETIQUETA_ROL } from "@/lib/navConfig";

export function Sidebar() {
  const { sesion } = useAuth();
  const { role } = useRole();

  if (!sesion || !role) return null;
  const items = NAV_POR_ROL[role];

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 border-r border-white/10 bg-surface min-h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-white/10">
        <p className="text-primary font-bold text-lg leading-tight">GYMTRACK 360</p>
        <p className="text-muted text-xs mt-1">{ETIQUETA_ROL[role]}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}