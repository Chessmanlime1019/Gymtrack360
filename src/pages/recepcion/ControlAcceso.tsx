import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ScanLine, PauseCircle } from "lucide-react";
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

async function validarAcceso(params: { qrCode: string; sedeId: string }) {
  // Cast puntual solo en la llamada, SIN separar el método de "supabase"
  // (separarlo pierde el "this" interno de la librería y rompe en runtime,
  // no solo en tipos — ese fue el bug real).
  const { data, error } = await (supabase.rpc as any)("validar_acceso_qr", {
    p_qr_code: params.qrCode,
    p_sede_actual_id: params.sedeId,
  });

  if (error) throw new Error(error.message);
  return data as unknown as ValidacionAcceso;
}

export default function ControlAcceso() {
  const { sesion } = useAuth();
  const esSuperAdmin = sesion?.role === "super_admin";

  // super_admin no tiene sede propia, así que elige con cuál sede
  // está operando el control de acceso en este momento.
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>(
    sesion?.sedeId ?? ""
  );

  const [codigoManual, setCodigoManual] = useState("");
  const [escaneando, setEscaneando] = useState(true);
  const [resultado, setResultado] = useState<ValidacionAcceso | null>(null);

  const {
    data: sedes,
    isLoading: cargandoSedes,
    isError: errorSedes,
  } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const sedeActivaId = esSuperAdmin ? sedeSeleccionada : sesion?.sedeId ?? "";

  const historial = useRealtimeAsistencias(sedeActivaId || null);

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
        motivo: "Error de conexión al validar el acceso. Intenta de nuevo.",
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
    mutacion.mutate({ qrCode, sedeId: sedeActivaId });
  }

  function handleBuscarManual() {
    const codigo = codigoManual.trim();
    if (!codigo || !sedeActivaId || mutacion.isPending) return;
    mutacion.mutate({ qrCode: codigo, sedeId: sedeActivaId });
    setCodigoManual("");
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Control de Acceso</h1>
        <p className="text-muted text-sm">
          Escanea el QR del cliente para validar su ingreso
        </p>
      </div>

      {esSuperAdmin && (
        <AsyncState
          isLoading={cargandoSedes}
          isError={errorSedes}
          errorMessage="No se pudieron cargar las sedes."
        >
          <div>
            <label htmlFor="sede" className="block text-sm mb-1">
              Sede actual (modo super admin)
            </label>
            <select
              id="sede"
              value={sedeSeleccionada}
              onChange={(e) => setSedeSeleccionada(e.target.value)}
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Selecciona una sede
              </option>
              {sedes?.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
        </AsyncState>
      )}

      {!sedeActivaId ? (
        <div className="bg-surface rounded-xl p-6 text-center text-muted text-sm border border-white/10">
          Selecciona una sede para activar el escáner.
        </div>
      ) : (
        <>
          {resultado ? (
            <div
              className={`rounded-xl p-6 border text-center space-y-2 ${resultado.autorizado
                  ? "bg-primary/10 border-primary/30"
                  : "bg-red-500/10 border-red-500/30"
                }`}
            >
              {resultado.autorizado ? (
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              )}
              <p className="text-lg font-semibold">
                {resultado.autorizado ? "Acceso autorizado" : "Acceso denegado"}
              </p>
              {resultado.cliente && <p className="text-sm">{resultado.cliente}</p>}
              {resultado.plan && (
                <p className="text-muted text-xs">Plan: {resultado.plan}</p>
              )}
              {resultado.motivo && (
                <p className="text-red-400 text-xs">{resultado.motivo}</p>
              )}
            </div>
          ) : (
            <QrScanner onScan={handleScan} activo={escaneando} />
          )}

          {mutacion.isPending && (
            <p className="text-muted text-xs text-center flex items-center justify-center gap-2">
              <PauseCircle className="w-4 h-4" /> Validando...
            </p>
          )}

          {!resultado && (
            <div className="space-y-2">
              <p className="text-muted text-xs text-center">
                ¿No se puede escanear? Pega el código del cliente
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codigoManual}
                  onChange={(e) => setCodigoManual(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBuscarManual();
                  }}
                  placeholder="o pega el código del estudiante/cliente"
                  className="flex-1 rounded-lg bg-background border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleBuscarManual}
                  disabled={!codigoManual.trim() || mutacion.isPending}
                  className="bg-primary text-background font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buscar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted mb-2 flex items-center gap-2">
          <ScanLine className="w-4 h-4" /> Últimos accesos
        </h2>
        {historial.length === 0 ? (
          <p className="text-muted text-xs">Aún no hay accesos registrados hoy.</p>
        ) : (
          <ul className="space-y-2">
            {historial.map((a) => (
              <li
                key={a.id}
                className="bg-surface rounded-lg px-3 py-2 border border-white/10 flex items-center justify-between text-sm"
              >
                <span>{a.clienteNombre}</span>
                <span className="text-muted text-xs">
                  {new Date(a.fechaHora).toLocaleTimeString("es-PE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}