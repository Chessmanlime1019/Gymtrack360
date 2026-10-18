import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Plus, RotateCw, Search } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { obtenerClientesSimple } from "@/services/clientesService";
import { obtenerPlanesActivos } from "@/services/planesService";
import {
  cancelarMembresia,
  obtenerMembresias,
  type MembresiaConDetalle,
} from "@/services/membresiasService";
import { METODOS_STAFF, venderPlan, type MetodoStaff } from "@/services/recepcionService";

type Filtro = "vigentes" | "por_vencer" | "vencidas" | "todas";

const input =
  "w-full h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

function soles(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Estado real de una fila: una membresía "activa" cuya fecha ya pasó está vencida.
function estadoReal(m: MembresiaConDetalle): "vigente" | "vencida" | "cancelada" {
  if (m.estado === "cancelada") return "cancelada";
  return m.estado === "activa" && diasHasta(m.fecha_fin) >= 0 ? "vigente" : "vencida";
}

interface FormVenta {
  clienteId: string;
  planId: string;
  metodo: MetodoStaff | "";
  bloquearCliente: boolean;
}
const FORM_VACIO: FormVenta = { clienteId: "", planId: "", metodo: "", bloquearCliente: false };

export default function RecepcionMembresias() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const sedeId = sesion?.sedeId ?? null;

  const [filtro, setFiltro] = useState<Filtro>("vigentes");
  const [busqueda, setBusqueda] = useState("");
  const [venta, setVenta] = useState<FormVenta | null>(null);
  const [cancelando, setCancelando] = useState<MembresiaConDetalle | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const membresias = useQuery({
    queryKey: ["recepcion-membresias", sedeId],
    queryFn: () => obtenerMembresias(sedeId),
    enabled: !!sedeId,
  });
  const planes = useQuery({
    queryKey: ["planes-activos", sedeId],
    queryFn: () => obtenerPlanesActivos(sedeId),
    enabled: !!sedeId,
  });
  const clientes = useQuery({
    queryKey: ["clientes-simple", sedeId],
    queryFn: () => obtenerClientesSimple(sedeId),
    enabled: !!sedeId && venta !== null,
  });

  // La última membresía (no cancelada) de cada cliente: así un cliente
  // renovado no aparece también como "vencido" por su plan anterior.
  const ultimaPorCliente = useMemo(() => {
    const mapa = new Map<string, MembresiaConDetalle>();
    (membresias.data ?? []).forEach((m) => {
      if (m.estado === "cancelada") return;
      const actual = mapa.get(m.cliente_id);
      if (!actual || m.fecha_fin > actual.fecha_fin) mapa.set(m.cliente_id, m);
    });
    return Array.from(mapa.values());
  }, [membresias.data]);

  const conteo = useMemo(() => {
    const vigentes = ultimaPorCliente.filter((m) => estadoReal(m) === "vigente");
    return {
      vigentes: vigentes.length,
      por_vencer: vigentes.filter((m) => diasHasta(m.fecha_fin) <= 7).length,
      vencidas: ultimaPorCliente.length - vigentes.length,
      todas: membresias.data?.length ?? 0,
    };
  }, [ultimaPorCliente, membresias.data]);

  const lista = useMemo(() => {
    let base: MembresiaConDetalle[];
    if (filtro === "todas") base = membresias.data ?? [];
    else if (filtro === "vigentes") base = ultimaPorCliente.filter((m) => estadoReal(m) === "vigente");
    else if (filtro === "por_vencer")
      base = ultimaPorCliente.filter(
        (m) => estadoReal(m) === "vigente" && diasHasta(m.fecha_fin) <= 7
      );
    else base = ultimaPorCliente.filter((m) => estadoReal(m) !== "vigente");

    if (filtro === "por_vencer") base = [...base].sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin));

    const q = busqueda.trim().toLowerCase();
    return q ? base.filter((m) => m.clienteNombre.toLowerCase().includes(q)) : base;
  }, [filtro, busqueda, membresias.data, ultimaPorCliente]);

  const planElegido = planes.data?.find((p) => p.id === venta?.planId) ?? null;

  const vender = useMutation({
    mutationFn: async () => {
      if (!venta || !venta.metodo) throw new Error("Completa todos los datos.");
      return venderPlan({
        clienteId: venta.clienteId,
        planId: venta.planId,
        metodoPago: venta.metodo,
      });
    },
    onSuccess: (r) => {
      ["recepcion-membresias", "admin-membresias", "recepcion-dashboard-pagos", "clientes"].forEach(
        (k) => queryClient.invalidateQueries({ queryKey: [k] })
      );
      setAviso(`Plan registrado: ${soles(r.monto)} · vence el ${fechaCorta(r.fechaFin)}`);
      setVenta(null);
      setTimeout(() => setAviso(null), 6000);
    },
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarMembresia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recepcion-membresias"] });
      queryClient.invalidateQueries({ queryKey: ["admin-membresias"] });
      setCancelando(null);
    },
  });

  function abrirNueva() {
    vender.reset();
    setVenta({ ...FORM_VACIO });
  }
  function abrirRenovar(m: MembresiaConDetalle) {
    vender.reset();
    setVenta({ clienteId: m.cliente_id, planId: m.plan_id, metodo: "", bloquearCliente: true });
  }

  if (!sedeId) {
    return (
      <div className="bg-surface rounded-2xl p-10 text-center text-muted text-sm border border-line">
        Tu cuenta no tiene una sede asignada. Pídele a tu Admin de Sede que te la asigne
        desde el módulo de Usuarios.
      </div>
    );
  }

  const FILTROS: { id: Filtro; label: string }[] = [
    { id: "vigentes", label: "Vigentes" },
    { id: "por_vencer", label: "Por vencer" },
    { id: "vencidas", label: "Vencidas" },
    { id: "todas", label: "Todas" },
  ];

  const nombreClienteVenta =
    venta?.bloquearCliente
      ? (membresias.data?.find((m) => m.cliente_id === venta.clienteId)?.clienteNombre ?? "Cliente")
      : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl text-ink">Membresías</h1>
          <p className="text-muted text-sm mt-1">
            Vende y renueva planes. Cada venta registra también el pago.
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva membresía
        </button>
      </div>

      {aviso && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 text-success text-sm px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {aviso}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            aria-pressed={filtro === f.id}
            className={`h-9 px-4 rounded-full text-sm font-medium border transition-colors ${
              filtro === f.id
                ? "bg-primary border-primary text-white"
                : "border-line text-ink-2 hover:border-line-strong"
            }`}
          >
            {f.label}
            <span className={`ml-2 text-xs ${filtro === f.id ? "text-white/80" : "text-muted"}`}>
              {conteo[f.id]}
            </span>
          </button>
        ))}
      </div>

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

      <AsyncState
        isLoading={membresias.isLoading}
        isError={membresias.isError}
        isEmpty={lista.length === 0}
        emptyMessage={
          filtro === "por_vencer"
            ? "Ninguna membresía vence en los próximos 7 días."
            : "No hay membresías para mostrar."
        }
      >
        <div className="grid lg:grid-cols-2 gap-3">
          {lista.map((m) => {
            const estado = estadoReal(m);
            const dias = diasHasta(m.fecha_fin);
            let chip = { texto: "Vencida", clase: "bg-warning/10 text-warning" };
            if (estado === "cancelada") chip = { texto: "Cancelada", clase: "bg-danger/10 text-danger" };
            else if (estado === "vigente") {
              if (dias === 0) chip = { texto: "Vence hoy", clase: "bg-danger/10 text-danger" };
              else if (dias <= 7)
                chip = { texto: `Vence en ${dias} d`, clase: "bg-warning/10 text-warning" };
              else chip = { texto: "Vigente", clase: "bg-success/10 text-success" };
            }

            return (
              <div
                key={m.id}
                className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold grid place-items-center shrink-0">
                  {iniciales(m.clienteNombre)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink truncate">{m.clienteNombre}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${chip.clase}`}>
                      {chip.texto}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {m.planNombre} · {fechaCorta(m.fecha_inicio)} → {fechaCorta(m.fecha_fin)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {estado !== "cancelada" && (
                    <button
                      onClick={() => abrirRenovar(m)}
                      aria-label={`Renovar plan de ${m.clienteNombre}`}
                      title="Renovar"
                      className="w-10 h-10 rounded-xl border border-line text-ink-2 hover:border-primary hover:text-primary grid place-items-center"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  )}
                  {estado === "vigente" && (
                    <button
                      onClick={() => setCancelando(m)}
                      aria-label={`Cancelar membresía de ${m.clienteNombre}`}
                      title="Cancelar"
                      className="w-10 h-10 rounded-xl border border-line text-ink-2 hover:border-danger hover:text-danger grid place-items-center"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AsyncState>

      {/* Modal: vender / renovar */}
      <Modal
        isOpen={venta !== null}
        onClose={() => setVenta(null)}
        title={venta?.bloquearCliente ? "Renovar plan" : "Nueva membresía"}
      >
        {venta && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              vender.mutate();
            }}
            className="p-5 space-y-4"
          >
            <div>
              <label htmlFor="v-cliente" className="block text-xs text-muted mb-1.5">
                Cliente
              </label>
              {venta.bloquearCliente ? (
                <p className="h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink flex items-center">
                  {nombreClienteVenta}
                </p>
              ) : (
                <select
                  id="v-cliente"
                  value={venta.clienteId}
                  onChange={(e) => setVenta({ ...venta, clienteId: e.target.value })}
                  className={input}
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellido}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="v-plan" className="block text-xs text-muted mb-1.5">
                Plan
              </label>
              <select
                id="v-plan"
                value={venta.planId}
                onChange={(e) => setVenta({ ...venta, planId: e.target.value })}
                className={input}
              >
                <option value="">Selecciona un plan</option>
                {planes.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {soles(p.precio)} · {p.duracion_dias} días
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="block text-xs text-muted mb-1.5">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {METODOS_STAFF.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setVenta({ ...venta, metodo: mt })}
                    aria-pressed={venta.metodo === mt}
                    className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                      venta.metodo === mt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-line text-ink-2 hover:border-line-strong"
                    }`}
                  >
                    {mt}
                  </button>
                ))}
              </div>
            </div>

            {planElegido && (
              <div className="flex items-center justify-between rounded-xl bg-background border border-line px-4 py-3 text-sm">
                <span className="text-muted">Total a cobrar</span>
                <span className="text-ink font-semibold">{soles(planElegido.precio)}</span>
              </div>
            )}

            {vender.isError && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3">
                {vender.error instanceof Error
                  ? vender.error.message
                  : "No se pudo registrar la venta."}
              </div>
            )}

            <button
              type="submit"
              disabled={
                vender.isPending || !venta.clienteId || !venta.planId || !venta.metodo
              }
              className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {vender.isPending
                ? "Registrando..."
                : planElegido
                  ? `Cobrar ${soles(planElegido.precio)}`
                  : "Cobrar"}
            </button>
          </form>
        )}
      </Modal>

      {/* Modal: cancelar */}
      <Modal
        isOpen={cancelando !== null}
        onClose={() => setCancelando(null)}
        title="Cancelar membresía"
      >
        {cancelando && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-ink-2">
              ¿Cancelar el plan <span className="text-ink font-semibold">{cancelando.planNombre}</span>{" "}
              de <span className="text-ink font-semibold">{cancelando.clienteNombre}</span>? El
              cliente ya no podrá entrar con su QR. El pago ya registrado no se modifica.
            </p>
            {cancelar.isError && (
              <p className="text-danger text-sm">No se pudo cancelar. Intenta de nuevo.</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setCancelando(null)}
                className="flex-1 h-11 rounded-xl border border-line text-ink text-sm font-medium"
              >
                Volver
              </button>
              <button
                onClick={() => cancelar.mutate(cancelando.id)}
                disabled={cancelar.isPending}
                className="flex-1 h-11 rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-50"
              >
                {cancelar.isPending ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}