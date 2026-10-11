import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Maximize2, MapPin, ShieldAlert, Sun, X } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerMiPerfil, obtenerMiSede } from "@/services/perfilService";
import { obtenerMembresiaVigenteCliente } from "@/services/membresiasService";

function diasHasta(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin.slice(0, 10)}T00:00:00`);
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}

export default function MiQr() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
  const sede = useQuery({
    queryKey: ["mi-sede", perfil.data?.sede_id],
    queryFn: () => obtenerMiSede(perfil.data!.sede_id!),
    enabled: !!perfil.data?.sede_id,
  });
  const membresia = useQuery({
    queryKey: ["mi-membresia-vigente", perfil.data?.id],
    queryFn: () => obtenerMembresiaVigenteCliente(perfil.data!.id),
    enabled: !!perfil.data,
  });

  const codigo = perfil.data?.qr_code ?? null;
  const dias = membresia.data ? diasHasta(membresia.data.fechaFin) : null;
  const vigente = dias !== null && dias >= 0;

  let estado: { texto: string; clase: string };
  if (membresia.isLoading) estado = { texto: "Verificando…", clase: "bg-muted/15 text-muted" };
  else if (!vigente) estado = { texto: "Sin membresía activa", clase: "bg-danger/10 text-danger" };
  else if (dias === 0) estado = { texto: "Vence hoy", clase: "bg-danger/10 text-danger" };
  else if ((dias ?? 99) <= 7) estado = { texto: `Vence en ${dias} días`, clase: "bg-warning/10 text-warning" };
  else estado = { texto: "Membresía activa", clase: "bg-success/10 text-success" };

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin permiso de portapapeles: el código sigue visible en pantalla */
    }
  }

  function descargar() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const enlace = document.createElement("a");
    enlace.href = canvas.toDataURL("image/png");
    enlace.download = "mi-qr-gymtrack360.png";
    enlace.click();
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <h1 className="text-2xl text-ink">Mi QR</h1>
        <p className="text-muted text-sm mt-1">Muéstralo en recepción para entrar al gimnasio.</p>
      </div>

      <AsyncState
        isLoading={perfil.isLoading}
        isError={perfil.isError}
        errorMessage="No se pudo cargar tu código."
      >
        {perfil.data && (
          <div className="bg-surface border border-line rounded-3xl overflow-hidden">
            <div className="bg-primary px-5 py-4 text-center">
              <p className="text-white text-lg font-semibold">
                {perfil.data.nombre} {perfil.data.apellido}
              </p>
              <p className="text-white/85 text-xs mt-1 inline-flex items-center gap-1.5">
                <MapPin size={13} /> {sede.data?.nombre ?? "Sin sede asignada"}
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex justify-center">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${estado.clase}`}>{estado.texto}</span>
              </div>

              {codigo ? (
                <>
                  {/* El QR siempre va sobre blanco puro para que el lector lo detecte. */}
                  <div ref={canvasRef} className="mx-auto w-fit bg-white p-4 rounded-2xl">
                    <QRCodeCanvas value={codigo} size={232} level="M" bgColor="#ffffff" fgColor="#000000" />
                  </div>

                  <div className="text-center">
                    <p className="text-muted text-[11px] uppercase tracking-wide">Tu código</p>
                    <p className="text-ink text-xs font-mono break-all mt-1">{codigo}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPantallaCompleta(true)}
                      className="min-h-[48px] rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold inline-flex flex-col items-center justify-center gap-0.5"
                    >
                      <Maximize2 size={16} /> Ampliar
                    </button>
                    <button
                      type="button"
                      onClick={descargar}
                      className="min-h-[48px] rounded-xl border border-line-strong text-ink-2 hover:border-primary hover:text-primary text-xs font-semibold inline-flex flex-col items-center justify-center gap-0.5"
                    >
                      <Download size={16} /> Descargar
                    </button>
                    <button
                      type="button"
                      onClick={copiar}
                      className="min-h-[48px] rounded-xl border border-line-strong text-ink-2 hover:border-primary hover:text-primary text-xs font-semibold inline-flex flex-col items-center justify-center gap-0.5"
                    >
                      <Copy size={16} /> {copiado ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>

                  <p className="text-muted text-xs flex items-start gap-2 bg-bar rounded-xl p-3">
                    <Sun size={14} className="text-primary shrink-0 mt-0.5" />
                    Sube el brillo de tu pantalla al máximo para que el lector lo escanee más rápido. Si no tienes
                    celular, dicta tu código a recepción.
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-2 bg-bar rounded-xl p-4 text-center">
                  Tu código QR todavía no fue generado. Pídelo en recepción.
                </p>
              )}

              {!membresia.isLoading && !vigente && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm">
                  <p className="text-danger font-semibold inline-flex items-center gap-2">
                    <ShieldAlert size={16} /> Tu acceso será rechazado
                  </p>
                  <p className="text-ink-2 text-xs mt-1">Necesitas una membresía vigente para entrar.</p>
                  <Link
                    to="/cliente/pagar"
                    className="mt-3 flex items-center justify-center min-h-[44px] rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold"
                  >
                    Pagar mi membresía
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </AsyncState>

      {/* Pantalla completa: QR grande sobre blanco, fácil de escanear */}
      {pantallaCompleta && codigo && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6">
          <button
            type="button"
            onClick={() => setPantallaCompleta(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-black/5 text-black grid place-items-center"
          >
            <X size={22} />
          </button>
          <QRCodeCanvas
            value={codigo}
            size={Math.min(typeof window !== "undefined" ? window.innerWidth - 64 : 300, 420)}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
          <p className="text-black text-lg font-semibold mt-6">
            {perfil.data?.nombre} {perfil.data?.apellido}
          </p>
          <p className="text-black/60 text-xs font-mono mt-1 break-all text-center max-w-xs">{codigo}</p>
        </div>
      )}
    </div>
  );
}