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
      // Si el navegador bloquea el clipboard (poco comÃºn), no rompemos nada,
      // el usuario igual puede seleccionar el texto a mano.
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Mi QR</h1>
        <p className="text-muted text-sm">
          Muestra este cÃ³digo en recepciÃ³n para registrar tu ingreso
        </p>
      </div>

      <AsyncState
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar tu cÃ³digo QR. Intenta de nuevo."
      >
        {qrCode ? (
          <div className="bg-surface rounded-xl p-6 border border-line space-y-4">
            <div className="bg-white rounded-xl p-6 flex justify-center">
              <QRCode value={qrCode} size={200} />
            </div>

            <div className="text-center">
              <p className="font-semibold">
                {sesion?.nombre} {sesion?.apellido}
              </p>
              <p className="text-muted text-xs">{sesion?.email}</p>
            </div>

            <div className="border-t border-line pt-4 space-y-2">
              <p className="text-muted text-xs text-center">
                Â¿No se puede escanear? Muestra o dicta este cÃ³digo
              </p>
              <div className="flex items-center gap-2 bg-background rounded-lg border border-line px-3 py-2">
                <span className="flex-1 font-mono text-xs text-primary truncate">
                  {qrCode}
                </span>
                <button
                  onClick={copiarCodigo}
                  aria-label="Copiar cÃ³digo"
                  className="shrink-0 p-1.5 rounded-md text-muted hover:bg-black/5 hover:text-ink transition-colors"
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
          <div className="bg-surface rounded-xl p-6 border border-line text-center space-y-4">
            <p className="text-muted text-sm">
              TodavÃ­a no tienes un cÃ³digo QR generado.
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
              <p className="text-red-600 text-xs">
                No se pudo generar el cÃ³digo. Intenta de nuevo.
              </p>
            )}
          </div>
        )}
      </AsyncState>
    </div>
  );
}
