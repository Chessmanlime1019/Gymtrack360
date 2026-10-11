// Registra el service worker solo en producción (en desarrollo estorbaría
// con el recargado automático de Vite).
export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sin service worker la app sigue funcionando normal, solo no es instalable offline */
    });
  });
}