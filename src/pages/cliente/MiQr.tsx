import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { RefreshCw, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import type { Profile } from "@/types";

async function obtenerMiQr(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("qr_code")
    .eq("id", userId)
    .single<Pick<Profile, "qr_code">>();

  if (error) throw error;
  return data?.qr_code ?? null;
}

async function generarYGuardarQr(userId: string): Promise<string> {
  const nuevoCodigo = `GT360-${crypto.randomUUID()}`;

  const { error } = await (supabase.from("profiles") as any)
    .update({ qr_code: nuevoCodigo })
    .eq("id", userId);

  if (error) throw error;
  return nuevoCodigo;
}

export default function MiQr() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const userId = sesion?.userId;
  const [copiado, setCopiado] = useState(false);

  const {
    data: qrCode,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["mi-qr", userId],
    queryFn: () => obtenerMiQr(userId!),
    enabled: !!userId,
  });

  const generarMutacion = useMutation({
    mutationFn: () => generarYGuardarQr(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mi-qr", userId] });
    },
  });

  async function copiarCodigo() {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador bloquea el clipboard (poco común), no rompemos nada,
      // el usuario igual puede seleccionar el texto a mano.
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Mi QR</h1>
        <p className="text-muted text-sm">
          Muestra este código en recepción para registrar tu ingreso
        </p>
      </div>

      <AsyncState
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar tu código QR. Intenta de nuevo."
      >
        {qrCode ? (
          <div className="bg-surface rounded-xl p-6 border border-white/10 space-y-4">
            <div className="bg-white rounded-xl p-6 flex justify-center">
              <QRCode value={qrCode} size={200} />
            </div>

            <div className="text-center">
              <p className="font-semibold">
                {sesion?.nombre} {sesion?.apellido}
              </p>
              <p className="text-muted text-xs">{sesion?.email}</p>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2">
              <p className="text-muted text-xs text-center">
                ¿No se puede escanear? Muestra o dicta este código
              </p>
              <div className="flex items-center gap-2 bg-background rounded-lg border border-white/10 px-3 py-2">
                <span className="flex-1 font-mono text-xs text-primary truncate">
                  {qrCode}
                </span>
                <button
                  onClick={copiarCodigo}
                  aria-label="Copiar código"
                  className="shrink-0 p-1.5 rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                >
                  {copiado ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-6 border border-white/10 text-center space-y-4">
            <p className="text-muted text-sm">
              Todavía no tienes un código QR generado.
            </p>
            <button
              onClick={() => generarMutacion.mutate()}
              disabled={generarMutacion.isPending}
              className="bg-primary text-background font-semibold rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${generarMutacion.isPending ? "animate-spin" : ""}`}
              />
              {generarMutacion.isPending ? "Generando..." : "Generar mi QR"}
            </button>
            {generarMutacion.isError && (
              <p className="text-red-400 text-xs">
                No se pudo generar el código. Intenta de nuevo.
              </p>
            )}
          </div>
        )}
      </AsyncState>
    </div>
  );
}