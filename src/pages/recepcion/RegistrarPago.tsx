import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Landmark,
  Printer,
  Receipt,
  Search,
  Smartphone,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerSedesActivas } from "@/services/sedesService";
import { obtenerClientes, type ClienteConMembresia } from "@/services/clientesService";
import {
  obtenerMembresiaVigenteCliente,
  type MembresiaVigente,
} from "@/services/membresiasService";
import {
  obtenerPagos,
  obtenerPagosRecientesCliente,
  registrarPago,
} from "@/services/pagosService";
import {
  METODOS_PAGO,
  registrarPagoSchema,
  type MetodoPago,
  type RegistrarPagoValues,
} from "@/schemas/pagoSchemas";

type Filtro = "todos" | "vigentes" | "sin_plan";

interface Recibo {
  numero: string;
  cliente: string;
  plan: string;
  monto: number;
  metodo: string;
  fecha: Date;
  sede: string;
}

const ICONO_METODO: Record<MetodoPago, React.ElementType> = {
  Efectivo: Banknote,
  Yape: Smartphone,
  Plin: Smartphone,
  Transferencia: Landmark,
};

const input =
  "w-full h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

function soles(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function diaLima(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}
function fechaCorta(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function diasHasta(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin.slice(0, 10)}T00:00:00`);
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}
function iniciales(nombre: string, apellido: string) {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}
function tienePlan(c: ClienteConMembresia): boolean {
  return (
    c.membresiaEstado === "activa" &&
    !!c.membresiaFechaFin &&
    diasHasta(c.membresiaFechaFin) >= 0
  );
}

export default function RegistrarPago() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>(sesion?.sedeId ?? "");
  const sedeId = esSuperAdmin ? sedeSeleccionada : (sesion?.sedeId ?? "");

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cliente, setCliente] = useState<ClienteConMembresia | null>(null);
  const [recibo, setRecibo] = useState<Recibo | null>(null);

  const sedes = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const clientes = useQuery({
    queryKey: ["recepcion-clientes", sedeId],
    queryFn: () => obtenerClientes(sedeId || null),
    enabled: !!sedeId,
  });

  const pagosSede = useQuery({
    queryKey: ["recepcion-pagos-sede", sedeId],
    queryFn: () => obtenerPagos(sedeId || null),
    enabled: !!sedeId,
  });

  const membresia = useQuery<MembresiaVigente | null>({
    queryKey: ["membresia-vigente", cliente?.id],
    queryFn: () => obtenerMembresiaVigenteCliente(cliente!.id),
    enabled: !!cliente,
  });

  const recientes = useQuery({
    queryKey: ["pagos-recientes", cliente?.id],
    queryFn: () => obtenerPagosRecientesCliente(cliente!.id, 4),
    enabled: !!cliente,
  });

  // Resumen del día: lo cobrado hoy en la sede.
  const resumenHoy = useMemo(() => {
    const hoy = diaLima(new Date());
    const delDia = (pagosSede.data ?? []).filter((p) => diaLima(p.fecha) === hoy);
    return { cantidad: delDia.length, total: delDia.reduce((s, p) => s + p.monto, 0) };
  }, [pagosSede.data]);

  const lista = useMemo(() => {
    let base = clientes.data ?? [];
    if (filtro === "vigentes") base = base.filter(tienePlan);
    if (filtro === "sin_plan") base = base.filter((c) => !tienePlan(c));
    const q = busqueda.trim().toLowerCase();
    if (q) base = base.filter((c) => `${c.nombre} ${c.apellido}`.toLowerCase().includes(q));
    return base;
  }, [clientes.data, filtro, busqueda]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegistrarPagoValues>({ resolver: zodResolver(registrarPagoSchema) });

  const metodo = watch("metodoPago");
  const montoActual = Number(watch("monto")) || 0;

  // Al cargar la membresía vigente, el monto sugerido es el precio del plan.
  useEffect(() => {
    if (membresia.data) reset({ monto: membresia.data.planPrecio, metodoPago: undefined });
  }, [membresia.data, reset]);

  const mutacion = useMutation({
    mutationFn: async (v: RegistrarPagoValues) => {
      const pagoId = crypto.randomUUID();
      await registrarPago({
        pagoId,
        clienteId: cliente!.id,
        membresiaId: membresia.data!.id,
        sedeId,
        monto: v.monto,
        metodoPago: v.metodoPago,
      });
      return { pagoId, v };
    },
    onSuccess: ({ pagoId, v }) => {
      setRecibo({
        numero: pagoId.slice(-8).toUpperCase(),
        cliente: `${cliente!.nombre} ${cliente!.apellido}`,
        plan: membresia.data!.planNombre,
        monto: v.monto,
        metodo: v.metodoPago,
        fecha: new Date(),
        sede: cliente!.sedeNombre ?? "Cascada Gym",
      });
      ["pagos-recientes", "recepcion-pagos-sede", "recepcion-dashboard-pagos"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
    },
  });

  function elegir(c: ClienteConMembresia) {
    mutacion.reset();
    setRecibo(null);
    setCliente(c);
  }
  function cerrarPanel() {
    mutacion.reset();
    setRecibo(null);
    setCliente(null);
  }

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #recibo-pago, #recibo-pago * { visibility: visible !important; }
          #recibo-pago { position: fixed; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 24px; }
        }
      `}</style>

      {/* Encabezado + resumen del día */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">Registrar pago</h1>
          <p className="text-muted text-sm mt-1">
            Elige un cliente y confirma su pago en efectivo, Yape, Plin o transferencia.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="gt-kpi px-4 py-3 min-w-[130px]">
            <p className="text-muted text-[11px]">Cobrado hoy</p>
            <p className="text-ink text-lg font-bold">{soles(resumenHoy.total)}</p>
          </div>
          <div className="gt-kpi px-4 py-3 min-w-[90px]">
            <p className="text-muted text-[11px]">Pagos</p>
            <p className="text-ink text-lg font-bold">{resumenHoy.cantidad}</p>
          </div>
        </div>
      </div>

      {esSuperAdmin && (
        <div className="max-w-xs">
          <label htmlFor="sede" className="block text-xs text-muted mb-1.5">
            Sede con la que operas
          </label>
          <select
            id="sede"
            value={sedeSeleccionada}
            onChange={(e) => {
              setSedeSeleccionada(e.target.value);
              cerrarPanel();
            }}
            className={input}
          >
            <option value="" disabled>
              Selecciona una sede
            </option>
            {sedes.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {!sedeId ? (
        <div className="bg-surface rounded-2xl p-10 text-center text-muted text-sm border border-line">
          {esSuperAdmin
            ? "Selecciona una sede para ver sus clientes."
            : "Tu cuenta no tiene una sede asignada."}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
          {/* ================= LISTA ================= */}
          <section className={cliente ? "hidden lg:block space-y-3" : "space-y-3"}>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente por nombre..."
                className={`${input} pl-9`}
              />
            </div>

            <div className="flex gap-2">
              {(
                [
                  ["todos", "Todos"],
                  ["vigentes", "Con plan vigente"],
                  ["sin_plan", "Sin plan"],
                ] as [Filtro, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFiltro(id)}
                  aria-pressed={filtro === id}
                  className={`h-9 px-4 rounded-full text-sm font-medium border transition-colors ${
                    filtro === id
                      ? "bg-primary border-primary text-white"
                      : "border-line text-ink-2 hover:border-line-strong"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <AsyncState
              isLoading={clientes.isLoading}
              isError={clientes.isError}
              isEmpty={lista.length === 0}
              emptyMessage="No hay clientes que coincidan."
            >
              <div className="space-y-2">
                {lista.map((c) => {
                  const vigente = tienePlan(c);
                  const dias = c.membresiaFechaFin ? diasHasta(c.membresiaFechaFin) : null;
                  const activo = cliente?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => elegir(c)}
                      className={`w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                        activo
                          ? "border-primary bg-primary/5"
                          : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold grid place-items-center shrink-0">
                        {iniciales(c.nombre, c.apellido)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink truncate">
                          {c.nombre} {c.apellido}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {vigente && dias !== null
                            ? `Vence ${fechaCorta(c.membresiaFechaFin!)}`
                            : "Sin plan vigente"}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full shrink-0 ${
                          !vigente
                            ? "bg-warning/10 text-warning"
                            : (dias ?? 99) <= 7
                              ? "bg-warning/10 text-warning"
                              : "bg-success/10 text-success"
                        }`}
                      >
                        {!vigente ? "Sin plan" : (dias ?? 99) <= 7 ? `${dias} d` : "Vigente"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </AsyncState>
          </section>

          {/* ================= PANEL ================= */}
          <aside className={cliente ? "lg:sticky lg:top-24" : "hidden lg:block lg:sticky lg:top-24"}>
            {!cliente ? (
              <div className="bg-surface border border-line border-dashed rounded-3xl p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center mx-auto">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <p className="text-ink font-semibold mt-4">Selecciona un cliente</p>
                <p className="text-muted text-sm mt-1">
                  Aquí verás su plan y podrás registrar el pago.
                </p>
              </div>
            ) : recibo ? (
              /* ---------- RECIBO ---------- */
              <div className="space-y-3">
                <div
                  id="recibo-pago"
                  className="bg-surface border border-line rounded-3xl overflow-hidden"
                >
                  <div className="bg-primary px-5 py-4 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                    <div>
                      <p className="text-white font-semibold text-sm">Pago registrado</p>
                      <p className="text-white/80 text-xs">Recibo N.º {recibo.numero}</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3 text-sm">
                    <p className="text-center text-3xl font-bold text-ink">{soles(recibo.monto)}</p>
                    <dl className="divide-y divide-line">
                      {[
                        ["Cliente", recibo.cliente],
                        ["Plan", recibo.plan],
                        ["Método", recibo.metodo],
                        ["Sede", recibo.sede],
                        [
                          "Fecha",
                          recibo.fecha.toLocaleString("es-PE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "America/Lima",
                          }),
                        ],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 py-2">
                          <dt className="text-muted">{k}</dt>
                          <dd className="text-ink text-right">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-center text-[11px] text-muted pt-1">
                      GYMTRACK 360 · Cascada Gym
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 h-11 rounded-xl border border-line text-ink text-sm font-medium hover:border-line-strong inline-flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                  <button
                    onClick={cerrarPanel}
                    className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
                  >
                    Nuevo pago
                  </button>
                </div>
              </div>
            ) : (
              /* ---------- FORMULARIO ---------- */
              <div className="bg-surface border border-line rounded-3xl overflow-hidden">
                <div className="px-5 py-4 border-b border-line flex items-center gap-3">
                  <button
                    onClick={cerrarPanel}
                    aria-label="Volver a la lista"
                    className="lg:hidden w-9 h-9 rounded-lg border border-line grid place-items-center text-ink-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold grid place-items-center shrink-0">
                    {iniciales(cliente.nombre, cliente.apellido)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-ink font-semibold text-sm truncate">
                      {cliente.nombre} {cliente.apellido}
                    </p>
                    <p className="text-muted text-xs">{cliente.sedeNombre ?? "Sin sede"}</p>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  <AsyncState
                    isLoading={membresia.isLoading}
                    isError={membresia.isError}
                    errorMessage="No se pudo verificar la membresía de este cliente."
                  >
                    {!membresia.data ? (
                      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 space-y-3">
                        <p className="text-warning text-sm">
                          Este cliente no tiene un plan vigente, así que no hay a qué asociar el
                          pago.
                        </p>
                        <Link
                          to="/recepcion/membresias"
                          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
                        >
                          <CreditCard className="w-4 h-4" /> Vender un plan
                        </Link>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleSubmit((v) => mutacion.mutate(v))}
                        className="space-y-5"
                        noValidate
                      >
                        <div className="rounded-2xl bg-background border border-line p-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-muted text-[11px]">Plan vigente</p>
                            <p className="text-ink text-sm font-semibold">
                              {membresia.data.planNombre}
                            </p>
                            <p className="text-muted text-xs mt-0.5">
                              Vence {fechaCorta(membresia.data.fechaFin)}
                            </p>
                          </div>
                          <p className="text-ink font-bold">{soles(membresia.data.planPrecio)}</p>
                        </div>

                        <div>
                          <label htmlFor="monto" className="block text-xs text-muted mb-1.5">
                            Monto (S/)
                          </label>
                          <input
                            id="monto"
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            {...register("monto")}
                            className={`${input} text-lg font-semibold`}
                          />
                          {errors.monto && (
                            <p className="text-danger text-xs mt-1">{errors.monto.message}</p>
                          )}
                        </div>

                        <div>
                          <p className="block text-xs text-muted mb-1.5">Método de pago</p>
                          <div className="grid grid-cols-2 gap-2">
                            {METODOS_PAGO.map((m) => {
                              const Icono = ICONO_METODO[m];
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setValue("metodoPago", m, { shouldValidate: true })}
                                  aria-pressed={metodo === m}
                                  className={`h-12 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                                    metodo === m
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-line text-ink-2 hover:border-line-strong"
                                  }`}
                                >
                                  <Icono className="w-4 h-4" />
                                  {m}
                                </button>
                              );
                            })}
                          </div>
                          {errors.metodoPago && (
                            <p className="text-danger text-xs mt-1">{errors.metodoPago.message}</p>
                          )}
                        </div>

                        {mutacion.isError && (
                          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3">
                            No se pudo registrar el pago. Intenta de nuevo.
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={mutacion.isPending}
                          className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                          <Receipt className="w-4 h-4" />
                          {mutacion.isPending
                            ? "Registrando..."
                            : montoActual > 0
                              ? `Registrar pago ${soles(montoActual)}`
                              : "Registrar pago"}
                        </button>
                      </form>
                    )}
                  </AsyncState>

                  {recientes.data && recientes.data.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Pagos recientes</p>
                      <ul className="space-y-1.5">
                        {recientes.data.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between text-xs bg-background rounded-xl px-3 py-2.5 border border-line"
                          >
                            <span className="text-ink-2">{p.metodo_pago}</span>
                            <span className="text-muted">
                              {soles(p.monto)} · {new Date(p.fecha).toLocaleDateString("es-PE")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}