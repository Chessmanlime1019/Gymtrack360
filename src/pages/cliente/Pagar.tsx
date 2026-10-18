import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Banknote, CalendarDays, Check, Hourglass, Smartphone, Wallet, X } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerMiPerfil, obtenerMiSede } from "@/services/perfilService";
import { obtenerPlanesActivos, type PlanOption } from "@/services/planesService";
import { obtenerMembresiaVigenteCliente } from "@/services/membresiasService";
import {
  cancelarSolicitud,
  obtenerMiUltimaSolicitud,
  solicitarPago,
  type MetodoCliente,
  type SolicitudPago,
} from "@/services/pagoClienteService";

// Datos de demostración: no son cuentas reales.
const NUMERO_DEMO = "999 000 111";

const METODOS: { id: MetodoCliente; titulo: string; texto: string; icono: typeof Smartphone }[] = [
  { id: "Yape", titulo: "Yape", texto: "Paga desde tu celular", icono: Smartphone },
  { id: "Plin", titulo: "Plin", texto: "Paga desde tu celular", icono: Smartphone },
  { id: "Efectivo", titulo: "Efectivo", texto: "Pagas en recepción", icono: Banknote },
];

const money = (n: number) =>
  `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (f: string) =>
  new Date(`${f.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const fmtFechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });

function sumarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const haceMenosDe = (iso: string | null, horas: number) =>
  !!iso && Date.now() - new Date(iso).getTime() < horas * 3_600_000;

export default function Pagar() {
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<MetodoCliente | null>(null);
  const [operacion, setOperacion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
  const clienteId = perfil.data?.id;
  const sedeId = perfil.data?.sede_id ?? null;

  const sede = useQuery({
    queryKey: ["mi-sede", sedeId],
    queryFn: () => obtenerMiSede(sedeId as string),
    enabled: !!sedeId,
  });

  const planesQ = useQuery({
    queryKey: ["planes-cliente", sedeId],
    queryFn: () => obtenerPlanesActivos(sedeId),
    enabled: !!sedeId,
  });

  const vigente = useQuery({
    queryKey: ["mi-membresia-vigente", clienteId],
    queryFn: () => obtenerMembresiaVigenteCliente(clienteId!),
    enabled: !!clienteId,
  });

  const solicitud = useQuery({
    queryKey: ["mi-solicitud-pago", clienteId],
    queryFn: () => obtenerMiUltimaSolicitud(clienteId!),
    enabled: !!clienteId,
    // Mientras espera a recepción, se revisa sola cada 15 s.
    refetchInterval: (q) => (q.state.data?.estado === "pendiente" ? 15_000 : false),
  });

  // Cuando recepción confirma, se refrescan la membresía y los pagos.
  const estadoAnterior = useRef<string | undefined>(undefined);
  useEffect(() => {
    const estado = solicitud.data?.estado;
    if (estadoAnterior.current === "pendiente" && estado === "aprobada") {
      queryClient.invalidateQueries({ queryKey: ["mis-membresias"] });
      queryClient.invalidateQueries({ queryKey: ["mis-pagos"] });
      queryClient.invalidateQueries({ queryKey: ["mi-membresia-vigente"] });
    }
    estadoAnterior.current = estado;
  }, [solicitud.data?.estado, queryClient]);

  const planes = planesQ.data ?? [];
  const plan: PlanOption | null = planes.find((p) => p.id === planId) ?? null;

  // Vista previa: la vigencia definitiva se calcula al confirmar el pago.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const finActual = vigente.data ? new Date(`${vigente.data.fechaFin.slice(0, 10)}T00:00:00`) : null;
  const inicioPrev = finActual && finActual > hoy ? finActual : hoy;
  const finPrev = plan ? sumarDias(inicioPrev, plan.duracion_dias) : null;

  const necesitaOperacion = metodo === "Yape" || metodo === "Plin";
  const operacionValida = !necesitaOperacion || /^\d{6,10}$/.test(operacion.trim());
  const listo = !!plan && !!metodo && operacionValida;

  const enviar = useMutation({
    mutationFn: () =>
      solicitarPago({
        planId: plan!.id,
        metodo: metodo!,
        operacion: necesitaOperacion ? operacion.trim() : null,
      }),
    onSuccess: () => {
      setPlanId(null);
      setMetodo(null);
      setOperacion("");
      queryClient.invalidateQueries({ queryKey: ["mi-solicitud-pago"] });
    },
    onError: (e: Error) => setError(e.message || "No se pudo enviar el pago. Inténtalo de nuevo."),
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarSolicitud(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mi-solicitud-pago"] }),
    onError: (e: Error) => setError(e.message),
  });

  const ultima = solicitud.data ?? null;

  /* ---------------------------- PENDIENTE ---------------------------- */
  if (ultima?.estado === "pendiente") {
    return (
      <Pendiente
        solicitud={ultima}
        sedeNombre={sede.data?.nombre ?? null}
        cancelando={cancelar.isPending}
        error={error}
        onCancelar={() => {
          setError(null);
          cancelar.mutate(ultima.id);
        }}
      />
    );
  }

  /* ---------------------------- FLUJO DE PAGO ---------------------------- */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-ink">Pagar membresía</h1>
        <p className="text-muted text-sm mt-1">
          Elige tu plan y el método de pago. Tu membresía se activa cuando recepción confirma el pago.
        </p>
      </div>

      {ultima?.estado === "aprobada" && haceMenosDe(ultima.revisadoAt, 24) && (
        <div className="rounded-2xl border border-success/30 bg-success/10 text-success text-sm px-4 py-3 flex items-start gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>
            Recepción confirmó tu pago de {money(ultima.monto)} ({ultima.planNombre}). Tu membresía ya está activa.{" "}
            <Link to="/cliente/mi-membresia" className="underline font-semibold">
              Ver mi membresía y boleta
            </Link>
          </span>
        </div>
      )}
      {ultima?.estado === "rechazada" && haceMenosDe(ultima.revisadoAt, 72) && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 text-danger text-sm px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>
            Recepción no pudo confirmar tu pago de {money(ultima.monto)}
            {ultima.motivoRechazo ? `: ${ultima.motivoRechazo}` : "."} Revisa los datos y vuelve a enviarlo.
          </span>
        </div>
      )}

      <AsyncState
        isLoading={perfil.isLoading || planesQ.isLoading || solicitud.isLoading}
        isError={perfil.isError || planesQ.isError}
        isEmpty={planes.length === 0}
        emptyMessage="Tu sede aún no tiene planes disponibles."
        errorMessage="No se pudieron cargar los planes."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
          <div className="space-y-6">
            {/* 1. Plan */}
            <section>
              <h2 className="text-lg text-ink mb-3">1. Elige tu plan</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {planes.map((p) => {
                  const activo = planId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPlanId(p.id)}
                        className={`w-full text-left bg-surface border rounded-2xl p-4 min-h-[88px] transition-colors ${
                          activo ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-line-strong"
                        }`}
                      >
                        <p className="text-ink font-semibold">{p.nombre}</p>
                        <p className="text-primary text-2xl font-bold mt-1">{money(p.precio)}</p>
                        <p className="text-muted text-xs mt-1">
                          {p.duracion_dias} días · {p.es_multisede ? "Todas las sedes" : "Tu sede"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* 2. Método */}
            <section>
              <h2 className="text-lg text-ink mb-3">2. Método de pago</h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {METODOS.map((m) => {
                  const activo = metodo === m.id;
                  const Icono = m.icono;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setMetodo(m.id)}
                        className={`w-full text-left bg-surface border rounded-2xl p-4 min-h-[88px] transition-colors ${
                          activo ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-line-strong"
                        }`}
                      >
                        <Icono size={20} className="text-primary" />
                        <p className="text-ink font-semibold mt-2">{m.titulo}</p>
                        <p className="text-muted text-xs">{m.texto}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* 3. Instrucciones según método */}
            {metodo && (
              <section className="bg-surface border border-line rounded-2xl p-5">
                <h2 className="text-lg text-ink mb-3">3. Confirma tu pago</h2>
                {necesitaOperacion ? (
                  <div className="space-y-4 text-sm">
                    <ol className="list-decimal pl-5 space-y-1.5 text-ink-2">
                      <li>Abre tu app de {metodo}.</li>
                      <li>
                        Envía <strong className="text-ink">{plan ? money(plan.precio) : "el monto del plan"}</strong> al
                        número <strong className="text-ink">{NUMERO_DEMO}</strong> (Cascada Gym).
                      </li>
                      <li>Escribe aquí el número de operación que te muestra la app.</li>
                      <li>Recepción verifica que el pago llegó y activa tu membresía.</li>
                    </ol>
                    <div>
                      <label htmlFor="operacion" className="block text-ink-2 mb-1.5">N.° de operación</label>
                      <input
                        id="operacion"
                        inputMode="numeric"
                        value={operacion}
                        onChange={(e) => setOperacion(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="Ej. 12345678"
                        className="w-full h-11 rounded-lg bg-background border border-line px-4 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                      {operacion && !operacionValida && (
                        <p className="text-danger text-xs mt-1">Ingresa entre 6 y 10 dígitos.</p>
                      )}
                    </div>
                    <p className="text-muted text-xs">Es una demostración: no se realiza ningún cobro real.</p>
                  </div>
                ) : (
                  <p className="text-ink-2 text-sm">
                    Reservas tu plan ahora y lo pagas en la recepción {sede.data ? `de ${sede.data.nombre}` : "de tu sede"}.
                    Tu membresía se activa en cuanto recepción reciba el dinero.
                  </p>
                )}
              </section>
            )}
          </div>

          {/* Resumen */}
          <aside className="lg:sticky lg:top-6 bg-surface border border-line rounded-2xl overflow-hidden">
            <div className="bg-primary px-5 py-4">
              <p className="text-white/80 text-xs uppercase tracking-wide">Resumen</p>
              <h3 className="text-white text-lg mt-1">{plan ? plan.nombre : "Elige un plan"}</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Fila label="Sede" valor={sede.data?.nombre ?? "—"} />
              <Fila label="Método" valor={metodo ?? "—"} />
              <Fila label="Duración" valor={plan ? `${plan.duracion_dias} días` : "—"} />
              <div className="pt-3 border-t border-line flex items-start gap-2 text-ink-2 text-xs">
                <CalendarDays size={14} className="text-primary shrink-0 mt-0.5" />
                {finPrev ? (
                  <span>
                    Si se confirma hoy, quedará vigente del <strong className="text-ink">{fmtFecha(aISO(inicioPrev))}</strong> al{" "}
                    <strong className="text-ink">{fmtFecha(aISO(finPrev))}</strong>.
                    {finActual && finActual > hoy && " Se suma a partir de que termine tu membresía actual."}
                  </span>
                ) : (
                  <span>Elige un plan para ver tu nueva vigencia.</span>
                )}
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between">
                <span className="text-muted">Total</span>
                <span className="text-ink text-2xl font-bold">{plan ? money(plan.precio) : "S/ 0.00"}</span>
              </div>

              {error && <p className="text-danger text-xs bg-danger/10 rounded-lg p-3">{error}</p>}

              <button
                type="button"
                disabled={!listo || enviar.isPending}
                onClick={() => {
                  setError(null);
                  enviar.mutate();
                }}
                className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold disabled:opacity-40"
              >
                {enviar.isPending
                  ? "Enviando…"
                  : metodo === "Efectivo"
                    ? "Reservar y pagar en recepción"
                    : plan
                      ? `Enviar pago de ${money(plan.precio)}`
                      : "Enviar pago"}
              </button>
            </div>
          </aside>
        </div>
      </AsyncState>
    </div>
  );
}

function Pendiente({
  solicitud,
  sedeNombre,
  cancelando,
  error,
  onCancelar,
}: {
  solicitud: SolicitudPago;
  sedeNombre: string | null;
  cancelando: boolean;
  error: string | null;
  onCancelar: () => void;
}) {
  const efectivo = solicitud.metodo === "Efectivo";
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-warning/15 text-warning grid place-items-center mx-auto">
          <Hourglass size={26} />
        </div>
        <h1 className="text-2xl text-ink mt-3">
          {efectivo ? "Plan reservado" : "Pago enviado"}
        </h1>
        <p className="text-muted text-sm mt-1">
          {efectivo
            ? `Acércate a la recepción${sedeNombre ? ` de ${sedeNombre}` : ""} y paga ${money(solicitud.monto)}. Tu membresía se activa al pagar.`
            : "Recepción está verificando tu pago. Te avisaremos con una notificación en cuanto se confirme."}
        </p>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-3 text-sm">
        <Fila label="Plan" valor={solicitud.planNombre} />
        <Fila label="Monto" valor={money(solicitud.monto)} />
        <Fila label="Método" valor={solicitud.metodo} />
        {solicitud.numeroOperacion && <Fila label="N.° de operación" valor={solicitud.numeroOperacion} />}
        <Fila label="Enviado" valor={fmtFechaHora(solicitud.createdAt)} />
        <div className="pt-3 border-t border-line flex items-center gap-2 text-warning text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" /> Pendiente de confirmación
        </div>
      </div>

      {error && <p className="text-danger text-xs bg-danger/10 rounded-lg p-3">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/cliente/mi-membresia"
          className="min-h-[48px] rounded-xl border border-line-strong text-ink-2 hover:border-primary hover:text-primary font-semibold inline-flex items-center justify-center gap-2"
        >
          <Wallet size={16} /> Ver mi membresía
        </Link>
        <button
          type="button"
          onClick={onCancelar}
          disabled={cancelando}
          className="min-h-[48px] rounded-xl border border-danger/40 text-danger hover:bg-danger/10 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <X size={16} /> {cancelando ? "Cancelando…" : "Cancelar solicitud"}
        </button>
      </div>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-ink font-medium text-right">{valor}</span>
    </div>
  );
}
