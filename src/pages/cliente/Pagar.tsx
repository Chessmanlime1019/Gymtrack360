import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CalendarDays, Check, Download, Receipt, Smartphone, Wallet } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerMiPerfil, obtenerMiSede } from "@/services/perfilService";
import { obtenerPlanesActivos, type PlanOption } from "@/services/planesService";
import { obtenerMembresiaVigenteCliente } from "@/services/membresiasService";
import { pagarPlan, type MetodoCliente, type ResultadoPago } from "@/services/pagoClienteService";

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

function sumarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface Recibo extends ResultadoPago {
  planNombre: string;
  metodo: MetodoCliente;
  operacion: string;
}

export default function Pagar() {
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<MetodoCliente | null>(null);
  const [operacion, setOperacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<Recibo | null>(null);

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
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
    queryKey: ["mi-membresia-vigente", perfil.data?.id],
    queryFn: () => obtenerMembresiaVigenteCliente(perfil.data!.id),
    enabled: !!perfil.data,
  });

  const planes = planesQ.data ?? [];
  const plan: PlanOption | null = planes.find((p) => p.id === planId) ?? null;

  // Vista previa de la vigencia (el servidor calcula la definitiva con la misma regla).
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const finActual = vigente.data ? new Date(`${vigente.data.fechaFin.slice(0, 10)}T00:00:00`) : null;
  const inicioPrev = finActual && finActual > hoy ? finActual : hoy;
  const finPrev = plan ? sumarDias(inicioPrev, plan.duracion_dias) : null;

  const necesitaOperacion = metodo === "Yape" || metodo === "Plin";
  const operacionValida = !necesitaOperacion || /^\d{6,10}$/.test(operacion.trim());
  const listo = !!plan && !!metodo && operacionValida;

  const pagar = useMutation({
    mutationFn: async () => {
      // Pequeña espera para simular que el banco/app confirma el pago.
      await new Promise((r) => setTimeout(r, 1200));
      return pagarPlan({ planId: plan!.id, metodo: metodo! });
    },
    onSuccess: (res) => {
      setRecibo({
        ...res,
        planNombre: plan!.nombre,
        metodo: metodo!,
        operacion: operacion.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["mis-membresias"] });
      queryClient.invalidateQueries({ queryKey: ["mis-pagos"] });
      queryClient.invalidateQueries({ queryKey: ["mi-membresia-vigente"] });
    },
    onError: (e: Error) =>
      setError(e.message || "No se pudo procesar el pago. Inténtalo de nuevo."),
  });

  function reiniciar() {
    setRecibo(null);
    setPlanId(null);
    setMetodo(null);
    setOperacion("");
    setError(null);
  }

  /* ---------------------------- RECIBO ---------------------------- */
  if (recibo) {
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #recibo-imprimible, #recibo-imprimible * { visibility: visible; }
            #recibo-imprimible { position: absolute; top: 0; left: 0; width: 100%; }
          }
        `}</style>

        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-success/15 text-success grid place-items-center mx-auto">
            <Check size={28} />
          </div>
          <h1 className="text-2xl text-ink mt-3">¡Pago realizado!</h1>
          <p className="text-muted text-sm mt-1">Tu membresía ya está activa.</p>
        </div>

        <div id="recibo-imprimible" className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="bg-primary px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Receipt className="text-white" size={22} />
              <div>
                <p className="text-white font-semibold">Recibo de pago</p>
                <p className="text-white/80 text-xs">GYMTRACK 360</p>
              </div>
            </div>
            <p className="text-white/90 text-xs">N.° {recibo.pagoId.slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="p-5 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Dato label="Cliente" valor={perfil.data ? `${perfil.data.nombre} ${perfil.data.apellido}` : "—"} />
              <Dato label="Sede" valor={sede.data?.nombre ?? "—"} />
              <Dato label="Fecha" valor={new Date(recibo.fecha).toLocaleString("es-PE")} />
              <Dato label="Método" valor={recibo.metodo} />
              <Dato label="Concepto" valor={`Membresía ${recibo.planNombre}`} />
              {recibo.operacion && <Dato label="N.° de operación" valor={recibo.operacion} />}
              <Dato label="Vigencia" valor={`${fmtFecha(recibo.fechaInicio)} → ${fmtFecha(recibo.fechaFin)}`} />
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-muted">Total pagado</span>
              <span className="text-ink text-2xl font-bold">{money(recibo.monto)}</span>
            </div>

            <p className="text-muted text-[11px] border-t border-line pt-3">
              Recibo simulado — no tiene validez tributaria. {recibo.metodo === "Efectivo"
                ? "El pago en efectivo es una simulación: en el gimnasio lo cobraría recepción."
                : "El pago con Yape/Plin es una simulación: no se realizó ningún cobro real."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[48px] rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold inline-flex items-center justify-center gap-2"
          >
            <Download size={16} /> Descargar recibo (PDF)
          </button>
          <Link
            to="/cliente/mi-membresia"
            className="min-h-[48px] rounded-xl border border-line-strong text-ink-2 hover:border-primary hover:text-primary font-semibold inline-flex items-center justify-center gap-2"
          >
            <Wallet size={16} /> Ver mi membresía
          </Link>
        </div>
        <button type="button" onClick={reiniciar} className="w-full min-h-[44px] text-sm text-muted hover:text-primary">
          Hacer otro pago
        </button>
      </div>
    );
  }

  /* ---------------------------- FLUJO DE PAGO ---------------------------- */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-ink">Pagar membresía</h1>
        <p className="text-muted text-sm mt-1">Elige tu plan, el método de pago y listo.</p>
      </div>

      <AsyncState
        isLoading={perfil.isLoading || planesQ.isLoading}
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
                    Pagarás en efectivo en la recepción {sede.data ? `de ${sede.data.nombre}` : "de tu sede"}. Para esta
                    demostración, al confirmar se registra el pago y se emite tu recibo al instante.
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
                    Tu membresía quedará vigente del <strong className="text-ink">{fmtFecha(aISO(inicioPrev))}</strong> al{" "}
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
                disabled={!listo || pagar.isPending}
                onClick={() => {
                  setError(null);
                  pagar.mutate();
                }}
                className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold disabled:opacity-40"
              >
                {pagar.isPending ? "Procesando pago…" : plan ? `Pagar ${money(plan.precio)}` : "Pagar"}
              </button>
            </div>
          </aside>
        </div>
      </AsyncState>
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

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted mb-1">{label}</p>
      <p className="text-ink font-medium">{valor}</p>
    </div>
  );
}