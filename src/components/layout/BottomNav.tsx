import { NavLink } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { NAV_POR_ROL } from "@/lib/navConfig";

export function BottomNav() {
  const { role } = useRole();
  if (!role) return null;
  const items = NAV_POR_ROL[role];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((item) => (
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
      </div>
    </nav>
  );
}
