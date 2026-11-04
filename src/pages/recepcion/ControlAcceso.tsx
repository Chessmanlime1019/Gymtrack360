import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, LogOut, XCircle, ScanLine, PauseCircle, TriangleAlert } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeAsistencias } from "@/hooks/useRealtimeAsistencias";
import { QrScanner } from "@/components/qr/QrScanner";
import { AsyncState } from "@/components/ui/AsyncState";
import { AforoCompacto } from "@/components/aforo/Aforo";
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

const horaLima = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

async function validarAcceso(params: { qrCode: string; sedeId: string }) {
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

  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>(sesion?.sedeId ?? "");
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

  // Recepción y Admin de Sede nunca eligen sede: la suya ya viene fija
  // desde su cuenta. Solo Super Admin elige, porque puede operar en
  // cualquiera de las tres.
  const sedeActivaId = esSuperAdmin ? sedeSeleccionada : (sesion?.sedeId ?? "");

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
    <div className="max-w-4xl mx-auto space-y-7">
      {/* ================= CABECERA ================= */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-ink">
              Control de Acceso
            </h1>
            <p className="text-muted text-sm mt-1">
              El primer escaneo registra la entrada; el siguiente, la salida
            </p>
          </div>
        </div>
      </div>

      {/* ================= SELECCIÓN DE SEDE (solo Super Admin) ================= */}
      {esSuperAdmin && (
        <AsyncState
          isLoading={cargandoSedes}
          isError={errorSedes}
          errorMessage="No se pudieron cargar las sedes."
        >
          <div className="bg-surface rounded-xl border border-line p-5">
            <label htmlFor="sede" className="block text-xs font-medium text-muted mb-2">
              Sede actual
            </label>
            <select
              id="sede"
              value={sedeSeleccionada}
              onChange={(e) => setSedeSeleccionada(e.target.value)}
              className="w-full h-11 rounded-lg bg-background border border-line px-4 text-sm text-ink outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
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

      {/* ================= SIN SEDE ================= */}
      {!sedeActivaId ? (
        <div className="bg-surface rounded-xl p-10 text-center text-muted text-sm border border-line">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            <ScanLine className="w-6 h-6 text-primary" />
          </div>
          {esSuperAdmin ? (
            <>
              <p className="text-ink font-medium">Selecciona una sede</p>
              <p className="text-muted text-xs mt-1">
                La selección permitirá activar el escáner.
              </p>
            </>
          ) : (
            <>
              <p className="text-ink font-medium">Tu cuenta no tiene una sede asignada</p>
              <p className="text-muted text-xs mt-1 max-w-sm mx-auto">
                Esto no se elige aquí: pídele a tu Admin de Sede o Super Admin que te
                asigne una sede desde el módulo de Usuarios.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <AforoCompacto sedeId={sedeActivaId} />

          {/* ================= ESCÁNER / RESULTADO ================= */}
          <div className="bg-surface rounded-2xl border border-line p-4 md:p-6">
            {resultado ? (
              <div
                className={`rounded-xl p-8 md:p-12 border text-center space-y-3 ${
                  !resultado.autorizado
                    ? "bg-danger/10 border-danger/25"
                    : resultado.tipo === "salida"
                      ? "bg-info/10 border-info/25"
                      : "bg-success/10 border-success/25"
                }`}
              >
                {resultado.autorizado && resultado.tipo === "salida" ? (
                  <LogOut className="w-16 h-16 text-info mx-auto mb-2" />
                ) : resultado.autorizado ? (
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-2" />
                ) : (
                  <XCircle className="w-16 h-16 text-danger mx-auto mb-2" />
                )}

                <p className="text-xl font-bold text-ink">
                  {!resultado.autorizado
                    ? "Acceso denegado"
                    : resultado.tipo === "salida"
                      ? "Salida registrada"
                      : "Acceso autorizado"}
                </p>

                {resultado.cliente && (
                  <p className="text-ink/80 text-base">{resultado.cliente}</p>
                )}

                {resultado.plan && (
                  <p className="text-muted text-sm">Plan: {resultado.plan}</p>
                )}

                {resultado.tipo === "salida" && resultado.minutos !== undefined && (
                  <p className="text-muted text-sm">Permaneció {resultado.minutos} min</p>
                )}

                {resultado.autorizado && resultado.tipo !== "salida" && resultado.aforo_maximo && (resultado.dentro ?? 0) >= resultado.aforo_maximo && (
                  <p className="inline-flex items-center gap-1.5 rounded-lg bg-warning/10 border border-warning/20 px-3 py-1.5 text-warning text-xs font-semibold">
                    <TriangleAlert className="w-3.5 h-3.5" />
                    Aforo máximo alcanzado: {resultado.dentro} de {resultado.aforo_maximo}
                  </p>
                )}

                {resultado.motivo && (
                  <div className="mt-4 inline-block rounded-lg bg-danger/10 border border-danger/15 px-4 py-2">
                    <p className="text-danger text-xs">{resultado.motivo}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-ink text-sm font-medium">Escáner activo</p>
                </div>

                <div className="w-full flex justify-center overflow-hidden rounded-xl">
                  <QrScanner onScan={handleScan} activo={escaneando} />
                </div>

                <p className="text-muted text-xs text-center mt-4">
                  Coloca el código QR del cliente dentro del área de escaneo
                </p>
              </div>
            )}

            {mutacion.isPending && (
              <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/15 px-4 py-3">
                <PauseCircle className="w-4 h-4 text-primary animate-pulse" />
                <p className="text-primary text-xs font-medium">Validando acceso...</p>
              </div>
            )}
          </div>

          {/* ================= ENTRADA MANUAL (respaldo si falla la cámara) ================= */}
          {!resultado && (
            <div className="bg-surface rounded-xl border border-line p-5">
              <div className="mb-3">
                <p className="text-ink text-sm font-medium">Entrada manual</p>
                <p className="text-muted text-xs mt-1">
                  ¿No se puede escanear? Pide al cliente su ID (el que aparece debajo de
                  su QR, formato GT360-...) y escríbelo aquí.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={codigoManual}
                    onChange={(e) => setCodigoManual(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBuscarManual();
                    }}
                    placeholder="GT360-89258411-34dc-4780-8683-..."
                    className="w-full h-11 rounded-lg bg-background border border-line pl-10 pr-4 text-sm font-mono text-ink placeholder:text-muted outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
                  />
                </div>

                <button
                  onClick={handleBuscarManual}
                  disabled={!codigoManual.trim() || mutacion.isPending}
                  className="h-11 bg-primary text-white font-semibold rounded-lg px-6 text-sm hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Validar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= HISTORIAL (tabla) ================= */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
            <ScanLine className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">Últimos accesos</h2>
            <p className="text-muted text-[11px] mt-0.5">Actividad reciente de la sede, en vivo</p>
          </div>
        </div>

        {historial.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-muted text-xs">Aún no hay accesos registrados.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background/70 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Cliente</th>
                <th className="text-right px-5 py-3 font-semibold">Entrada</th>
                <th className="text-right px-5 py-3 font-semibold">Salida</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((a) => (
                <tr key={a.id} className="border-t border-line hover:bg-ink/[0.03] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-semibold">
                          {a.clienteNombre
                            ?.split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                      </div>
                      <p className="text-ink truncate">{a.clienteNombre}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-muted text-xs">
                    {horaLima(a.fechaHora)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-muted text-xs">
                    {a.salidaAt ? horaLima(a.salidaAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}