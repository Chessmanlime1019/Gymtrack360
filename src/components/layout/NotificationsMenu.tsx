import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export function NotificationsMenu() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
        className="p-2 rounded-lg text-muted hover:bg-black/5 hover:text-primary transition-colors"
      >
        <Bell className="w-5 h-5" />
      </button>
      {abierto && (
        <div className="absolute right-0 mt-2 w-72 bg-surface border border-line rounded-xl shadow-lg z-50 overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-sm font-semibold border-b border-line">
            Notificaciones
          </p>
          <div className="px-4 py-8 text-center text-muted text-xs">
            No tienes notificaciones nuevas.
          </div>
        </div>
      )}
    </div>
  );
}
