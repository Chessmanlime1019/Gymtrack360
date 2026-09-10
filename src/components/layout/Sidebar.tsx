import { NavLink } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

import {
  NAV_POR_ROL,
  ETIQUETA_ROL,
} from "@/lib/navConfig";

export function Sidebar() {
  const { sesion } = useAuth();
  const { role } = useRole();

  if (!sesion || !role) return null;

  const items = NAV_POR_ROL[role];

  return (
    <aside
      className="
        hidden
        md:flex
        md:flex-col
        md:w-64
        md:shrink-0
        min-h-screen
        sticky
        top-0
        overflow-hidden
        border-r
        border-[#252a2f]
        bg-[#0b0d0f]
      "
    >

      {/* =====================================================
          CABECERA
      ===================================================== */}
      <div
        className="
          relative
          px-6
          py-6
          border-b
          border-[#252a2f]
          bg-[#0b0d0f]
        "
      >

        <div className="flex items-center gap-2">

          {/* Marca */}
          <div
            className="
              w-7
              h-7
              rounded-md
              border-[3px]
              border-[#f15a24]
              border-r-transparent
              rotate-[-12deg]
              flex
              items-center
              justify-center
            "
          >
            <span className="text-[#f15a24] text-xs font-black italic rotate-[12deg]">
              G
            </span>
          </div>

          <p className="text-white font-extrabold text-[18px] tracking-tight italic">
            GYMTRACK{" "}
            <span className="text-[#f15a24]">360</span>
          </p>

        </div>

        <p className="text-[#8d969f] text-xs mt-2">
          {ETIQUETA_ROL[role]}
        </p>

      </div>

      {/* =====================================================
          NAVEGACIÓN
      ===================================================== */}
      <nav className="relative flex-1 px-3 py-5 space-y-1">

        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `
                group
                relative
                flex
                items-center
                gap-3
                rounded-lg
                px-3
                py-2.5
                text-sm
                transition-all
                duration-200
                ${
                  isActive
                    ? "bg-[#f15a24]/15 text-[#f15a24]"
                    : "text-[#969fa8] hover:bg-white/[0.04] hover:text-white"
                }
              `
            }
          >
            {({ isActive }) => (
              <>
                {/* Línea activa */}
                {isActive && (
                  <span
                    className="
                      absolute
                      left-0
                      top-1/2
                      -translate-y-1/2
                      w-[3px]
                      h-6
                      rounded-r-full
                      bg-[#f15a24]
                    "
                  />
                )}

                <item.icon
                  className={`
                    w-[18px]
                    h-[18px]
                    shrink-0
                    transition-colors
                    ${
                      isActive
                        ? "text-[#f15a24]"
                        : "text-[#89929b] group-hover:text-white"
                    }
                  `}
                />

                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

      </nav>

      {/* =====================================================
          DECORACIÓN INFERIOR
      ===================================================== */}
      <div className="absolute bottom-0 left-0 w-64 h-[430px] pointer-events-none overflow-hidden">

        <div
          className="
            absolute
            bottom-[75px]
            left-[-55px]
            w-[330px]
            h-px
            bg-[#f15a24]
            rotate-[-45deg]
            opacity-70
          "
        />

        <div
          className="
            absolute
            bottom-[115px]
            left-[-60px]
            w-[300px]
            h-px
            bg-[#f15a24]
            rotate-[-45deg]
            opacity-20
          "
        />

        <div
          className="
            absolute
            bottom-[25px]
            left-[-45px]
            w-[300px]
            h-px
            bg-[#f15a24]
            rotate-[-45deg]
            opacity-15
          "
        />

        <div
          className="
            absolute
            bottom-[100px]
            left-[-50px]
            w-[230px]
            h-20
            bg-[#f15a24]/5
            blur-3xl
          "
        />

      </div>

    </aside>
  );
}