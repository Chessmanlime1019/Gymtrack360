import { useEffect, useRef, useState } from "react";

import { ChevronDown, LogOut, Camera, Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { ETIQUETA_ROL } from "@/lib/navConfig";
import { subirAvatar } from "@/services/avatarService";

export function ProfileMenu() {
  const { sesion, logout, refrescarPerfil } = useAuth();
  const { role } = useRole();

  const [abierto, setAbierto] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setAbierto(false);
      }
    }

    document.addEventListener("mousedown", onClickFuera);

    return () =>
      document.removeEventListener("mousedown", onClickFuera);
  }, []);

  if (!sesion || !role) return null;

  async function handleArchivo(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setError(null);
    setSubiendo(true);

    try {
      // Solo corregimos el narrowing de TypeScript.
      await subirAvatar(sesion!.userId, file);

      await refrescarPerfil();
    } catch {
      setError(
        "No se pudo subir la foto. Intenta con otra imagen."
      );
    } finally {
      setSubiendo(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const nombreCompleto = `${sesion.nombre} ${sesion.apellido}`.trim() || ETIQUETA_ROL[role];
  const iniciales =
    `${sesion.nombre[0] ?? ""}${sesion.apellido[0] ?? ""}`.toUpperCase() || ETIQUETA_ROL[role][0];

  return (
    <div className="relative" ref={menuRef}>

      {/* NOMBRE, ROL Y FOTO */}
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Perfil"
        aria-expanded={abierto}
        className="flex items-center gap-2.5 rounded-xl p-1 sm:pl-2 sm:pr-1.5 hover:bg-ink/5 transition-colors"
      >
        <span className="hidden sm:block text-right min-w-0 max-w-[170px]">
          <span className="block text-[13px] font-semibold leading-tight text-ink truncate capitalize">
            {nombreCompleto}
          </span>
          {nombreCompleto !== ETIQUETA_ROL[role] && (
            <span className="block text-[11px] leading-tight text-muted mt-0.5">{ETIQUETA_ROL[role]}</span>
          )}
        </span>

        <span className="w-9 h-9 rounded-full overflow-hidden border border-line-strong shrink-0">
          {sesion.avatarUrl ? (
            <img src={sesion.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold">
              {iniciales}
            </span>
          )}
        </span>

        <ChevronDown className={`hidden sm:block w-4 h-4 text-muted transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {/* MENU */}
      {abierto && (
        <div
          className="
            absolute right-0 mt-2
            w-64
            bg-surface
            border border-line-strong
            rounded-xl
            shadow-2xl
            z-50
            overflow-hidden
          "
        >

          {/* DATOS DEL USUARIO */}
          <div
            className="
              p-4
              flex items-center gap-3
              border-b border-line
            "
          >
            <div
              className="
                relative
                w-12 h-12
                rounded-full
                overflow-hidden
                border border-line-strong
                shrink-0
                group
              "
            >
              {sesion.avatarUrl ? (
                <img
                  src={sesion.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="
                    w-full h-full
                    bg-primary/15
                    flex items-center justify-center
                    text-primary
                    text-sm font-semibold
                  "
                >
                  {iniciales}
                </div>
              )}

              <button
                onClick={() => inputRef.current?.click()}
                aria-label="Cambiar foto de perfil"
                className="
                  absolute inset-0
                  bg-black/70
                  opacity-0
                  group-hover:opacity-100
                  flex items-center justify-center
                  transition-opacity
                "
              >
                {subiendo ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </button>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleArchivo}
                className="hidden"
              />
            </div>

            <div className="min-w-0">
              <p className="text-ink text-sm font-medium truncate">
                {nombreCompleto}
              </p>

              <p className="text-muted text-xs">
                {ETIQUETA_ROL[role]}
              </p>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <p className="px-4 pt-2 text-red-400 text-xs">
              {error}
            </p>
          )}

          {/* CAMBIAR FOTO */}
          <button
            onClick={() => inputRef.current?.click()}
            className="
              w-full
              flex items-center gap-2
              px-4 py-2.5
              text-sm
              text-ink-2
              hover:bg-ink/5
              hover:text-ink
              transition-colors
            "
          >
            <Camera className="w-4 h-4" />
            Cambiar foto de perfil
          </button>

          {/* CERRAR SESIÓN */}
          <button
            onClick={logout}
            className="
              w-full
              flex items-center gap-2
              px-4 py-2.5
              text-sm
              text-ink-2
              hover:bg-red-500/10
              hover:text-red-400
              transition-colors
              border-t border-line
            "
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>

        </div>
      )}

    </div>
  );
}