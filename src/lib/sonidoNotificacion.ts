// Sonido de notificación generado con Web Audio (sin archivos de audio).
// Solo suena dentro del sistema: lo dispara el canal en tiempo real de
// useNotificaciones, que existe únicamente con la sesión iniciada.
//
// Los navegadores bloquean el audio hasta que la persona interactúa con la
// página, así que el AudioContext se "desbloquea" con el primer clic/tecla.

import type { TipoNotificacion } from "@/hooks/useNotificaciones";

const CLAVE = "gt-sonido-notificaciones";

let ctx: AudioContext | null = null;
let ultimo = 0;

function contexto(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

// Se llama una vez al iniciar sesión.
export function prepararSonido(): () => void {
  const desbloquear = () => {
    const c = contexto();
    if (c && c.state === "suspended") c.resume().catch(() => undefined);
  };
  window.addEventListener("pointerdown", desbloquear);
  window.addEventListener("keydown", desbloquear);
  return () => {
    window.removeEventListener("pointerdown", desbloquear);
    window.removeEventListener("keydown", desbloquear);
  };
}

export function sonidoActivado(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== "off";
  } catch {
    return true;
  }
}

export function guardarSonidoActivado(activo: boolean) {
  try {
    localStorage.setItem(CLAVE, activo ? "on" : "off");
  } catch {
    /* sin almacenamiento: vale solo mientras la pestaña esté abierta */
  }
}

// Notas (Hz) por tipo: ascendente para lo positivo, más insistente para alertas.
const MELODIA: Record<TipoNotificacion, number[]> = {
  info: [880, 1175],
  success: [784, 1047, 1319],
  warning: [988, 784, 988],
  danger: [659, 523],
};

export function reproducirSonido(tipo: TipoNotificacion, forzar = false) {
  if (!forzar && !sonidoActivado()) return;
  // Si llegan varias juntas, suena una sola vez.
  const ahora = Date.now();
  if (!forzar && ahora - ultimo < 1500) return;
  ultimo = ahora;

  const c = contexto();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => undefined);

  try {
    const inicio = c.currentTime + 0.02;
    MELODIA[tipo].forEach((freq, i) => {
      const t = inicio + i * 0.13;
      const osc = c.createOscillator();
      const vol = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(vol).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* audio no disponible: la notificación visual sigue funcionando */
  }
}
