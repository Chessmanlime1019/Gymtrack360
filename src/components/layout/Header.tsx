import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { ETIQUETA_ROL } from "@/lib/navConfig";

export function Header() {
  const { sesion, logout } = useAuth();
  const { role } = useRole();

  if (!sesion || !role) return null;

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-surface/95 backdrop-blur px-4 py-3">
      <div>
        <p className="text-primary font-bold text-sm leading-tight">GYMTRACK 360</p>
        <p className="text-muted text-[11px]">{ETIQUETA_ROL[role]}</p>
      </div>
      <button
        onClick={logout}
        aria-label="Cerrar sesión"
        className="p-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-red-400 transition-colors"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}