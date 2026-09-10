import { useEffect, useRef, useState } from "react";

import { Bell } from "lucide-react";

export function NotificationsMenu() {
  const [abierto, setAbierto] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

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
      document.removeEventListener(
        "mousedown",
        onClickFuera
      );
  }, []);

  return (
    <div className="relative" ref={ref}>

      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
        className="
          p-2
          rounded-lg
          text-[#929ba4]
          hover:bg-white/[0.05]
          hover:text-white
          transition-colors
        "
      >
        <Bell className="w-5 h-5" />
      </button>

      {abierto && (
        <div
          className="
            absolute
            right-0
            mt-2
            w-72
            bg-[#1b2024]
            border
            border-[#30363d]
            rounded-xl
            shadow-2xl
            z-50
            overflow-hidden
          "
        >

          <p
            className="
              px-4
              pt-3
              pb-3
              text-sm
              font-semibold
              text-white
              border-b
              border-[#30363d]
            "
          >
            Notificaciones
          </p>

          <div
            className="
              px-4
              py-8
              text-center
              text-[#89929b]
              text-xs
            "
          >
            No tienes notificaciones nuevas.
          </div>

        </div>
      )}

    </div>
  );
}