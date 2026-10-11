import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Evento no estándar que Chrome/Edge/Android lanzan cuando la app es instalable.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CLAVE = "gt-instalar-descartado";

function yaInstalada() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function esIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Banner discreto para instalar la app. En iPhone no existe el botón nativo,
// así que se muestran los pasos manuales.
export function InstalarApp() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    let descartado = false;
    try {
      descartado = localStorage.getItem(CLAVE) === "1";
    } catch {
      /* sin almacenamiento: se muestra igual */
    }
    if (descartado || yaInstalada()) return;

    function alInstalable(e: Event) {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", alInstalable);

    if (esIos()) {
      setIos(true);
      setVisible(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", alInstalable);
  }, []);

  function cerrar() {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {
      /* ignorar */
    }
  }

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setVisible(false);
    setEvento(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed left-3 right-3 bottom-[88px] md:left-auto md:right-6 md:bottom-6 md:w-[360px] z-40 bg-surface border border-line-strong rounded-2xl p-4 shadow-xl">
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar"
        className="absolute top-2 right-2 w-9 h-9 grid place-items-center text-muted hover:text-ink"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
        <div className="min-w-0">
          <p className="text-ink font-semibold text-sm">Instala GYMTRACK 360</p>
          {ios ? (
            <p className="text-muted text-xs mt-1">
              Toca el botón Compartir de Safari y elige “Agregar a pantalla de inicio”.
            </p>
          ) : (
            <p className="text-muted text-xs mt-1">Ábrela como una app, sin barra del navegador y con acceso directo.</p>
          )}
        </div>
      </div>
      {!ios && evento && (
        <button
          type="button"
          onClick={instalar}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <Download size={16} /> Instalar app
        </button>
      )}
    </div>
  );
}