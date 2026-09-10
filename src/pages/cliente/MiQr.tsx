import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import QRCode from "react-qr-code";

import {
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

import { useAuth } from "@/hooks/useAuth";

import { AsyncState } from "@/components/ui/AsyncState";

import type { Profile } from "@/types";

async function obtenerMiQr(
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("qr_code")
    .eq("id", userId)
    .single<Pick<Profile, "qr_code">>();

  if (error) throw error;

  return data?.qr_code ?? null;
}

async function generarYGuardarQr(
  userId: string
): Promise<string> {
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
      queryClient.invalidateQueries({
        queryKey: ["mi-qr", userId],
      });
    },
  });

  async function copiarCodigo() {
    if (!qrCode) return;

    try {
      await navigator.clipboard.writeText(qrCode);

      setCopiado(true);

      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador bloquea el clipboard (poco común),
      // el usuario igual puede seleccionar el texto a mano.
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-7">

      {/* =====================================================
          CABECERA
      ===================================================== */}
      <div>

        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-white">
          Mi QR
        </h1>

        <p className="text-[#89939d] text-sm mt-1">
          Muestra este código en recepción para registrar tu ingreso
        </p>

      </div>

      {/* =====================================================
          CONTENIDO
      ===================================================== */}
      <AsyncState
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar tu código QR. Intenta de nuevo."
      >
        {qrCode ? (

          <div
            className="
              bg-[#1a1e22]
              rounded-[16px]
              border
              border-[#30363d]
              overflow-hidden
              shadow-[0_10px_35px_rgba(0,0,0,0.18)]
            "
          >

            {/* CABECERA DE TARJETA */}
            <div
              className="
                px-5
                py-4
                border-b
                border-[#2a3036]
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-10
                  h-10
                  rounded-lg
                  bg-[#f15a24]/10
                  border
                  border-[#f15a24]/15
                  flex
                  items-center
                  justify-center
                "
              >

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="text-[#f15a24]"
                >
                  <rect
                    width="5"
                    height="5"
                    x="3"
                    y="3"
                    rx="1"
                  />
                  <rect
                    width="5"
                    height="5"
                    x="16"
                    y="3"
                    rx="1"
                  />
                  <rect
                    width="5"
                    height="5"
                    x="3"
                    y="16"
                    rx="1"
                  />
                  <path d="M16 16h2v2h-2zM20 20h1v1h-1zM16 20h2v1h-2zM20 16h1v2h-1z" />
                </svg>

              </div>

              <div>

                <p className="text-white text-sm font-semibold">
                  Código de acceso
                </p>

                <p className="text-[#89939d] text-xs mt-0.5">
                  Preséntalo en recepción
                </p>

              </div>

            </div>

            {/* QR */}
            <div className="p-6 md:p-8">

              <div
                className="
                  relative
                  bg-white
                  rounded-[16px]
                  p-6
                  md:p-8
                  flex
                  justify-center
                  shadow-[0_10px_30px_rgba(0,0,0,0.20)]
                "
              >

                <QRCode
                  value={qrCode}
                  size={220}
                />

              </div>

              {/* USUARIO */}
              <div className="text-center mt-6">

                <p className="text-white font-semibold text-base">
                  {sesion?.nombre} {sesion?.apellido}
                </p>

                <p className="text-[#89939d] text-xs mt-1">
                  {sesion?.email}
                </p>

              </div>

              {/* DIVISOR */}
              <div className="border-t border-[#2a3036] mt-6 pt-5">

                <p className="text-[#89939d] text-xs text-center mb-3">
                  ¿No se puede escanear?
                  Muestra o dicta este código
                </p>

                {/* CODIGO */}
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    bg-[#171b1f]
                    rounded-lg
                    border
                    border-[#30363d]
                    px-3
                    py-2.5
                    focus-within:border-[#f15a24]/70
                    transition-colors
                  "
                >

                  <span
                    className="
                      flex-1
                      font-mono
                      text-xs
                      text-[#f15a24]
                      truncate
                    "
                  >
                    {qrCode}
                  </span>

                  <button
                    onClick={copiarCodigo}
                    aria-label="Copiar código"
                    className="
                      shrink-0
                      p-2
                      rounded-lg
                      text-[#89939d]
                      hover:bg-[#f15a24]/10
                      hover:text-[#f15a24]
                      transition-colors
                    "
                  >
                    {copiado ? (
                      <Check className="w-4 h-4 text-[#f15a24]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                </div>

                {/* ESTADO COPIADO */}
                <div
                  className={`
                    h-5
                    mt-2
                    text-center
                    text-[11px]
                    text-[#f15a24]
                    transition-opacity
                    ${copiado ? "opacity-100" : "opacity-0"}
                  `}
                >
                  Código copiado
                </div>

              </div>

            </div>

          </div>

        ) : (

          <div
            className="
              bg-[#1a1e22]
              rounded-[16px]
              p-8
              border
              border-[#30363d]
              text-center
              shadow-[0_10px_35px_rgba(0,0,0,0.18)]
            "
          >

            {/* ICONO */}
            <div
              className="
                w-16
                h-16
                mx-auto
                rounded-2xl
                bg-[#f15a24]/10
                border
                border-[#f15a24]/15
                flex
                items-center
                justify-center
                mb-5
              "
            >

              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="text-[#f15a24]"
              >
                <rect
                  width="5"
                  height="5"
                  x="3"
                  y="3"
                  rx="1"
                />
                <rect
                  width="5"
                  height="5"
                  x="16"
                  y="3"
                  rx="1"
                />
                <rect
                  width="5"
                  height="5"
                  x="3"
                  y="16"
                  rx="1"
                />
                <path d="M16 16h2v2h-2zM20 20h1v1h-1zM16 20h2v1h-2zM20 16h1v2h-1z" />
              </svg>

            </div>

            <p className="text-white text-sm font-medium">
              Todavía no tienes un código QR generado.
            </p>

            <p className="text-[#89939d] text-xs mt-2 max-w-sm mx-auto">
              Genera tu código personal para utilizarlo
              al ingresar al gimnasio.
            </p>

            <button
              onClick={() => generarMutacion.mutate()}
              disabled={generarMutacion.isPending}
              className="
                mt-6
                bg-[#f15a24]
                text-white
                font-semibold
                rounded-lg
                px-5
                py-2.5
                text-sm
                inline-flex
                items-center
                gap-2
                shadow-[0_8px_25px_rgba(241,90,36,0.18)]
                hover:bg-[#ff6930]
                hover:shadow-[0_10px_30px_rgba(241,90,36,0.24)]
                transition-all
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >

              <RefreshCw
                className={`
                  w-4
                  h-4
                  ${
                    generarMutacion.isPending
                      ? "animate-spin"
                      : ""
                  }
                `}
              />

              {generarMutacion.isPending
                ? "Generando..."
                : "Generar mi QR"}

            </button>

            {generarMutacion.isError && (
              <p className="text-red-400 text-xs mt-4">
                No se pudo generar el código. Intenta de nuevo.
              </p>
            )}

          </div>

        )}

      </AsyncState>

    </div>
  );
}