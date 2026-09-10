import { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CameraOff, Camera } from "lucide-react";

interface QrScannerProps {
  onScan: (qrCode: string) => void;
  activo: boolean;
}

const SCANNER_ID = "qr-scanner-region";

export function QrScanner({ onScan, activo }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    if (!activo) return;

    let cancelado = false;
    const scanner = new Html5Qrcode(SCANNER_ID);
    setIniciando(true);
    setError(null);

    function limpiarScanner() {
      try {
        scanner.clear();
      } catch {
        /* noop: puede fallar si el DOM ya no existe, no es crítico */
      }
    }

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!cancelado) onScan(decodedText);
        },
        () => {
          // Errores de "no se detectó QR en este frame" son normales y
          // constantes mientras se busca el código; se ignoran a propósito.
        }
      )
      .then(() => {
        if (!cancelado) setIniciando(false);
      })
      .catch((err) => {
        if (!cancelado) {
          setIniciando(false);
          setError(
            "No se pudo acceder a la cámara. Revisa los permisos del navegador."
          );
          console.error(err);
        }
      });

    return () => {
      cancelado = true;
      if (scanner.isScanning) {
        scanner
          .stop()
          .then(limpiarScanner)
          .catch(limpiarScanner);
      } else {
        limpiarScanner();
      }
    };
  }, [activo, onScan]);

  if (!activo) {
    return (
      <div className="aspect-square w-full max-w-sm mx-auto rounded-xl bg-surface border border-line flex flex-col items-center justify-center gap-2 text-muted">
        <CameraOff className="w-8 h-8" />
        <p className="text-sm">Cámara en pausa</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <div
        id={SCANNER_ID}
        className="aspect-square w-full rounded-xl overflow-hidden border border-line bg-black"
      />
      {iniciando && (
        <p className="text-muted text-xs text-center flex items-center justify-center gap-2">
          <Camera className="w-4 h-4" /> Iniciando cámara...
        </p>
      )}
      {error && <p className="text-red-600 text-xs text-center">{error}</p>}
    </div>
  );
}
