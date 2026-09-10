import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  CheckCircle2,
  XCircle,
  ScanLine,
  PauseCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

import { useAuth } from "@/hooks/useAuth";

import { useRealtimeAsistencias } from "@/hooks/useRealtimeAsistencias";

import { QrScanner } from "@/components/qr/QrScanner";

import { AsyncState } from "@/components/ui/AsyncState";

import type { ValidacionAcceso } from "@/types";

async function obtenerSedesActivas() {
  const { data, error } = await supabase
    .from("sedes")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();

  if (error) throw error;

  return data;
}

async function validarAcceso(params: {
  qrCode: string;
  sedeId: string;
}) {
  const { data, error } = await (supabase.rpc as any)(
    "validar_acceso_qr",
    {
      p_qr_code: params.qrCode,
      p_sede_actual_id: params.sedeId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ValidacionAcceso;
}

export default function ControlAcceso() {
  const { sesion } = useAuth();

  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeSeleccionada, setSedeSeleccionada] =
    useState<string>(sesion?.sedeId ?? "");

  const [codigoManual, setCodigoManual] = useState("");

  const [escaneando, setEscaneando] = useState(true);

  const [resultado, setResultado] =
    useState<ValidacionAcceso | null>(null);

  const {
    data: sedes,
    isLoading: cargandoSedes,
    isError: errorSedes,
  } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const sedeActivaId = esSuperAdmin
    ? sedeSeleccionada
    : sesion?.sedeId ?? "";

  const historial = useRealtimeAsistencias(
    sedeActivaId || null
  );

  const mutacion = useMutation({
    mutationFn: validarAcceso,

    onSuccess: (data) => {
      setResultado(data);
      setEscaneando(false);

      setTimeout(() => {
        setResultado(null);
        setEscaneando(true);
      }, 3000);
    },

    onError: (err) => {
      console.error("Error validando acceso:", err);

      setResultado({
        autorizado: false,
        motivo:
          "Error de conexión al validar el acceso. Intenta de nuevo.",
        cliente: null,
        plan: null,
      });

      setEscaneando(false);

      setTimeout(() => {
        setResultado(null);
        setEscaneando(true);
      }, 3000);
    },
  });

  function handleScan(qrCode: string) {
    if (!sedeActivaId || mutacion.isPending) return;

    mutacion.mutate({
      qrCode,
      sedeId: sedeActivaId,
    });
  }

  function handleBuscarManual() {
    const codigo = codigoManual.trim();

    if (!codigo || !sedeActivaId || mutacion.isPending) {
      return;
    }

    mutacion.mutate({
      qrCode: codigo,
      sedeId: sedeActivaId,
    });

    setCodigoManual("");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-7">

      {/* =====================================================
          CABECERA
      ===================================================== */}
      <div>

        <div className="flex items-center gap-3">

          <div
            className="
              w-10
              h-10
              rounded-xl
              bg-[#f15a24]/10
              border
              border-[#f15a24]/15
              flex
              items-center
              justify-center
            "
          >
            <ScanLine className="w-5 h-5 text-[#f15a24]" />
          </div>

          <div>

            <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-white">
              Control de Acceso
            </h1>

            <p className="text-[#89939d] text-sm mt-1">
              Escanea el QR del cliente para validar su ingreso
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          SELECCIÓN DE SEDE
      ===================================================== */}
      {esSuperAdmin && (
        <AsyncState
          isLoading={cargandoSedes}
          isError={errorSedes}
          errorMessage="No se pudieron cargar las sedes."
        >

          <div
            className="
              bg-[#1a1e22]
              rounded-[14px]
              border
              border-[#30363d]
              p-5
            "
          >

            <label
              htmlFor="sede"
              className="
                block
                text-[12px]
                font-medium
                text-[#89939d]
                mb-2
              "
            >
              Sede actual
            </label>

            <select
              id="sede"
              value={sedeSeleccionada}
              onChange={(e) =>
                setSedeSeleccionada(e.target.value)
              }
              className="
                w-full
                h-[44px]
                rounded-lg
                bg-[#171b1f]
                border
                border-[#30363d]
                px-4
                text-sm
                text-white
                outline-none
                focus:border-[#f15a24]/70
                focus:ring-2
                focus:ring-[#f15a24]/10
                transition-all
              "
            >

              <option
                value=""
                disabled
                className="bg-[#171b1f]"
              >
                Selecciona una sede
              </option>

              {sedes?.map((sede) => (
                <option
                  key={sede.id}
                  value={sede.id}
                  className="bg-[#171b1f]"
                >
                  {sede.nombre}
                </option>
              ))}

            </select>

          </div>

        </AsyncState>
      )}

      {/* =====================================================
          SIN SEDE
      ===================================================== */}
      {!sedeActivaId ? (

        <div
          className="
            bg-[#1a1e22]
            rounded-[14px]
            p-10
            text-center
            text-[#89939d]
            text-sm
            border
            border-[#30363d]
          "
        >

          <div
            className="
              w-14
              h-14
              mx-auto
              mb-4
              rounded-2xl
              bg-[#f15a24]/10
              border
              border-[#f15a24]/15
              flex
              items-center
              justify-center
            "
          >
            <ScanLine className="w-6 h-6 text-[#f15a24]" />
          </div>

          <p className="text-white font-medium">
            Selecciona una sede
          </p>

          <p className="text-[#737d86] text-xs mt-1">
            La selección permitirá activar el escáner.
          </p>

        </div>

      ) : (

        <>
          {/* =================================================
              ESCÁNER / RESULTADO
          ================================================= */}
          <div
            className="
              bg-[#1a1e22]
              rounded-[16px]
              border
              border-[#30363d]
              p-4 md:p-6
              shadow-[0_10px_35px_rgba(0,0,0,0.18)]
            "
          >

            {resultado ? (

              <div
                className={`
                  rounded-[14px]
                  p-8 md:p-12
                  border
                  text-center
                  space-y-3
                  ${
                    resultado.autorizado
                      ? "bg-green-500/10 border-green-500/25"
                      : "bg-red-500/10 border-red-500/25"
                  }
                `}
              >

                {resultado.autorizado ? (

                  <CheckCircle2
                    className="
                      w-16
                      h-16
                      text-green-400
                      mx-auto
                      mb-2
                    "
                  />

                ) : (

                  <XCircle
                    className="
                      w-16
                      h-16
                      text-red-400
                      mx-auto
                      mb-2
                    "
                  />

                )}

                <p className="text-xl font-bold text-white">
                  {resultado.autorizado
                    ? "Acceso autorizado"
                    : "Acceso denegado"}
                </p>

                {resultado.cliente && (
                  <p className="text-white/80 text-base">
                    {resultado.cliente}
                  </p>
                )}

                {resultado.plan && (
                  <p className="text-[#89939d] text-sm">
                    Plan: {resultado.plan}
                  </p>
                )}

                {resultado.motivo && (
                  <div
                    className="
                      mt-4
                      inline-block
                      rounded-lg
                      bg-red-500/10
                      border
                      border-red-500/15
                      px-4
                      py-2
                    "
                  >
                    <p className="text-red-400 text-xs">
                      {resultado.motivo}
                    </p>
                  </div>
                )}

              </div>

            ) : (

              <div>

                {/* TITULO DEL ESCANER */}
                <div className="flex items-center justify-center gap-2 mb-5">

                  <span className="w-2 h-2 rounded-full bg-[#f15a24] animate-pulse" />

                  <p className="text-white text-sm font-medium">
                    Escáner activo
                  </p>

                </div>

                {/* QR SCANNER */}
                <div
                  className="
                    w-full
                    flex
                    justify-center
                    overflow-hidden
                    rounded-xl
                  "
                >
                  <QrScanner
                    onScan={handleScan}
                    activo={escaneando}
                  />
                </div>

                <p className="text-[#89939d] text-xs text-center mt-4">
                  Coloca el código QR del cliente dentro del área de escaneo
                </p>

              </div>

            )}

            {/* VALIDANDO */}
            {mutacion.isPending && (
              <div
                className="
                  mt-5
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-[#f15a24]/10
                  border
                  border-[#f15a24]/15
                  px-4
                  py-3
                "
              >

                <PauseCircle
                  className="
                    w-4
                    h-4
                    text-[#f15a24]
                    animate-pulse
                  "
                />

                <p className="text-[#f15a24] text-xs font-medium">
                  Validando acceso...
                </p>

              </div>
            )}

          </div>

          {/* =================================================
              BÚSQUEDA MANUAL
          ================================================= */}
          {!resultado && (

            <div
              className="
                bg-[#1a1e22]
                rounded-[14px]
                border
                border-[#30363d]
                p-5
              "
            >

              <div className="mb-3">

                <p className="text-white text-sm font-medium">
                  Entrada manual
                </p>

                <p className="text-[#89939d] text-xs mt-1">
                  ¿No se puede escanear? Pega el código del cliente.
                </p>

              </div>

              <div className="flex flex-col sm:flex-row gap-3">

                <div className="relative flex-1">

                  <ScanLine
                    className="
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      w-4
                      h-4
                      text-[#737d86]
                    "
                  />

                  <input
                    type="text"
                    value={codigoManual}
                    onChange={(e) =>
                      setCodigoManual(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleBuscarManual();
                      }
                    }}
                    placeholder="o pega el código del estudiante/cliente"
                    className="
                      w-full
                      h-[46px]
                      rounded-lg
                      bg-[#171b1f]
                      border
                      border-[#30363d]
                      pl-10
                      pr-4
                      text-sm
                      font-mono
                      text-white
                      placeholder:text-[#737d86]
                      outline-none
                      focus:border-[#f15a24]/70
                      focus:ring-2
                      focus:ring-[#f15a24]/10
                      transition-all
                    "
                  />

                </div>

                <button
                  onClick={handleBuscarManual}
                  disabled={
                    !codigoManual.trim() ||
                    mutacion.isPending
                  }
                  className="
                    h-[46px]
                    bg-[#f15a24]
                    text-white
                    font-semibold
                    rounded-lg
                    px-6
                    text-sm
                    shadow-[0_8px_25px_rgba(241,90,36,0.18)]
                    hover:bg-[#ff6930]
                    hover:shadow-[0_10px_30px_rgba(241,90,36,0.24)]
                    transition-all
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                  "
                >
                  Buscar
                </button>

              </div>

            </div>

          )}

        </>

      )}

      {/* =====================================================
          HISTORIAL
      ===================================================== */}
      <div
        className="
          bg-[#1a1e22]
          rounded-[14px]
          border
          border-[#30363d]
          overflow-hidden
          shadow-[0_8px_25px_rgba(0,0,0,0.12)]
        "
      >

        {/* CABECERA */}
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
              w-9
              h-9
              rounded-lg
              bg-[#f15a24]/10
              border
              border-[#f15a24]/15
              flex
              items-center
              justify-center
            "
          >

            <ScanLine className="w-4 h-4 text-[#f15a24]" />

          </div>

          <div>

            <h2 className="text-sm font-semibold text-white">
              Últimos accesos
            </h2>

            <p className="text-[#737d86] text-[11px] mt-0.5">
              Actividad reciente de la sede
            </p>

          </div>

        </div>

        {/* HISTORIAL VACIO */}
        {historial.length === 0 ? (

          <div className="px-5 py-8 text-center">

            <p className="text-[#89939d] text-xs">
              Aún no hay accesos registrados hoy.
            </p>

          </div>

        ) : (

          <ul className="divide-y divide-[#2a3036]">

            {historial.map((a) => (

              <li
                key={a.id}
                className="
                  px-5
                  py-3.5
                  flex
                  items-center
                  justify-between
                  gap-4
                  hover:bg-white/[0.02]
                  transition-colors
                "
              >

                <div className="flex items-center gap-3 min-w-0">

                  <div
                    className="
                      w-9
                      h-9
                      rounded-full
                      bg-[#f15a24]/10
                      border
                      border-[#f15a24]/10
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                  >

                    <span className="text-[#f15a24] text-xs font-semibold">
                      {a.clienteNombre
                        ?.split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </span>

                  </div>

                  <div className="min-w-0">

                    <p className="text-white text-sm truncate">
                      {a.clienteNombre}
                    </p>

                    <div className="flex items-center gap-2 mt-0.5">

                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />

                      <span className="text-[#737d86] text-[11px]">
                        Acceso registrado
                      </span>

                    </div>

                  </div>

                </div>

                <span className="text-[#89939d] text-xs shrink-0">

                  {new Date(
                    a.fechaHora
                  ).toLocaleTimeString(
                    "es-PE",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}

                </span>

              </li>

            ))}

          </ul>

        )}

      </div>

    </div>
  );
}