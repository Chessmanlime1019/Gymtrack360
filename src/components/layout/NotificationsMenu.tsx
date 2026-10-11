import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, BellOff, BellRing, CheckCheck, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { useNotificaciones, type Notificacion, type TipoNotificacion } from "@/hooks/useNotificaciones";

const ESTILO: Record<TipoNotificacion, { icono: typeof Info; clase: string }> = {
  info: { icono: Info, clase: "bg-info/10 text-info" },
  success: { icono: CheckCircle2, clase: "bg-success/10 text-success" },
  warning: { icono: AlertTriangle, clase: "bg-warning/10 text-warning" },
  danger: { icono: XCircle, clase: "bg-danger/10 text-danger" },
};

function hace(iso?: string): string {
  if (!iso) return "";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} ${d === 1 ? "día" : "días"}`;
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

export function NotificationsMenu() {
  const [abierto, setAbierto] = useState(false);
  const [permiso, setPermiso] = useState<NotificationPermission | "no-soportado">(() =>
    typeof Notification === "undefined" ? "no-soportado" : Notification.permission
  );
  const contenedor = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notificaciones, noLeidas, cargando, error, marcarLeida, marcarTodas, refrescar, nueva, descartarNueva } =
    useNotificaciones();

  // Cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent | TouchEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  function abrir(n: Notificacion) {
    marcarLeida(n);
    if (n.ruta) {
      setAbierto(false);
      descartarNueva();
      navigate(n.ruta);
    }
  }

  async function activarAvisos() {
    try {
      setPermiso(await Notification.requestPermission());
    } catch {
      /* el navegador no permite pedirlo */
    }
  }

  const NuevaIcono = nueva ? ESTILO[nueva.tipo].icono : Info;

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          if (!abierto) refrescar();
        }}
        aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
        aria-expanded={abierto}
        className="relative w-11 h-11 rounded-xl grid place-items-center text-ink-2 hover:bg-surface hover:text-ink transition-colors"
      >
        <Bell size={20} />
        {noLeidas > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold grid place-items-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {/* Aviso emergente de una notificación recién llegada */}
      {nueva && !abierto && (
        <div
          role="status"
          className="fixed right-3 left-3 sm:left-auto sm:w-[360px] top-[70px] z-50 bg-surface border border-primary/50 rounded-2xl shadow-2xl p-3 flex items-start gap-3"
        >
          <button type="button" onClick={() => abrir(nueva)} className="flex items-start gap-3 text-left flex-1 min-w-0">
            <span className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${ESTILO[nueva.tipo].clase}`}>
              <NuevaIcono size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-ink text-sm font-semibold">{nueva.titulo}</span>
              <span className="block text-muted text-xs mt-0.5 line-clamp-2">{nueva.texto}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={descartarNueva}
            aria-label="Cerrar aviso"
            className="shrink-0 w-8 h-8 grid place-items-center text-muted hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {abierto && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="fixed inset-x-3 top-[66px] md:absolute md:inset-x-auto md:right-0 md:top-[52px] md:w-[380px] z-50 bg-surface border border-line-strong rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="text-ink font-semibold">Notificaciones</p>
            <button
              type="button"
              onClick={marcarTodas}
              disabled={noLeidas === 0}
              className="min-h-[36px] px-2 text-xs font-semibold text-primary hover:text-primary-dark disabled:text-muted disabled:cursor-default inline-flex items-center gap-1.5"
            >
              <CheckCheck size={14} /> Marcar todas como leídas
            </button>
          </div>

          {permiso === "default" && (
            <button
              type="button"
              onClick={activarAvisos}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-ink-2 bg-bar border-b border-line hover:text-primary text-left"
            >
              <BellRing size={14} className="text-primary shrink-0" />
              Activar avisos del dispositivo cuando la app esté en segundo plano
            </button>
          )}

          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {cargando ? (
              <p className="px-4 py-8 text-center text-muted text-sm">Cargando…</p>
            ) : error ? (
              <p className="px-4 py-8 text-center text-danger text-sm">No se pudieron cargar las notificaciones.</p>
            ) : notificaciones.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <BellOff className="mx-auto text-muted" size={28} />
                <p className="text-ink text-sm font-medium mt-3">Todo al día</p>
                <p className="text-muted text-xs mt-1">No tienes notificaciones por ahora.</p>
              </div>
            ) : (
              <ul>
                {notificaciones.map((n) => {
                  const { icono: Icono, clase } = ESTILO[n.tipo];
                  return (
                    <li key={`${n.origen}-${n.id}`} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => abrir(n)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3.5 min-h-[64px] hover:bg-bar transition-colors ${
                          n.leida ? "opacity-60" : ""
                        }`}
                      >
                        <span className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${clase}`}>
                          <Icono size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-ink text-sm font-semibold">{n.titulo}</span>
                          <span className="block text-muted text-xs mt-0.5">{n.texto}</span>
                          {n.fecha && <span className="block text-muted/80 text-[11px] mt-1">{hace(n.fecha)}</span>}
                        </span>
                        {!n.leida && <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}