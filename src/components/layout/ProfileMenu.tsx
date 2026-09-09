import { useEffect, useRef, useState } from "react";
import { LogOut, Camera, Loader2 } from "lucide-react";
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  if (!sesion || !role) return null;

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSubiendo(true);
    try {
      await subirAvatar(sesion!.userId, file);
      await refrescarPerfil();
    } catch {
      setError("No se pudo subir la foto. Intenta con otra imagen.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const iniciales = `${sesion.nombre[0] ?? ""}${sesion.apellido[0] ?? ""}`.toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Perfil"
        className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0"
      >
        {sesion.avatarUrl ? (
          <img src={sesion.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
            {iniciales}
          </div>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-white/10 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-4 flex items-center gap-3 border-b border-white/10">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 group">
              {sesion.avatarUrl ? (
                <img src={sesion.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                  {iniciales}
                </div>
              )}
              <button
                onClick={() => inputRef.current?.click()}
                aria-label="Cambiar foto de perfil"
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
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
              <p className="text-sm font-medium truncate">
                {sesion.nombre} {sesion.apellido}
              </p>
              <p className="text-muted text-xs">{ETIQUETA_ROL[role]}</p>
            </div>
          </div>

          {error && <p className="px-4 pt-2 text-red-400 text-xs">{error}</p>}

          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Cambiar foto de perfil
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-red-400 transition-colors border-t border-white/10"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}