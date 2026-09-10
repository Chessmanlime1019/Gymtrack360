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

  if (!role) return null;

  const items = NAV_POR_ROL[role];

  return (
    <div className="relative" ref={ref}>

      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Acceso rápido"
        className="
          p-2
          rounded-lg
          text-[#929ba4]
          hover:bg-white/[0.05]
          hover:text-white
          transition-colors
        "
      >
        <LayoutGrid className="w-5 h-5" />
      </button>

      {abierto && (
        <div
          className="
            absolute
            right-0
            mt-2
            w-56
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
              px-3
              pt-3
              pb-2
              text-[10px]
              uppercase
              tracking-[0.12em]
              text-[#747e88]
            "
          >
            Acceso rápido
          </p>

          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setAbierto(false)}
              className="
                flex
                items-center
                gap-2
                px-3
                py-2.5
                text-sm
                text-[#a2aab2]
                hover:bg-white/[0.05]
                hover:text-[#f15a24]
                transition-colors
              "
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