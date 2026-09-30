import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Building2, Plus, RotateCw } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { BadgeEstadoMembresia } from "@/components/ui/BadgeEstadoMembresia";

import { obtenerSedesActivas } from "@/services/sedesService";
import { obtenerClientesSimple } from "@/services/clientesService";
import { obtenerPlanesActivos } from "@/services/planesService";

import {
  obtenerMembresias,
  crearMembresia,
  renovarMembresia,
  cancelarMembresia,
  type MembresiaConDetalle,
} from "@/services/membresiasService";

import {
  asignarMembresiaSchema,
  type AsignarMembresiaValues,
} from "@/schemas/membresiaSchemas";

export default function AdminMembresias() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeActiva, setSedeActiva] = useState<string | null>(
    esSuperAdmin ? null : (sesion?.sedeId ?? null)
  );
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [membresiaCancelando, setMembresiaCancelando] =
    useState<MembresiaConDetalle | null>(null);

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  // Super Admin: se selecciona la primera sede en cuanto cargan (igual
  // que en Usuarios). Admin de Sede: ya viene fija desde el inicio.
  useEffect(() => {
    if (esSuperAdmin && !sedeActiva && sedes && sedes.length > 0) {
      setSedeActiva(sedes[0].id);
    }
  }, [esSuperAdmin, sedes, sedeActiva]);

  const {
    data: membresias,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-membresias", sedeActiva],
    queryFn: () => obtenerMembresias(sedeActiva),
    enabled: !!sedeActiva,
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes-simple", sedeActiva],
    queryFn: () => obtenerClientesSimple(sedeActiva),
    enabled: modalAsignarAbierto,
  });

  const { data: planes } = useQuery({
    queryKey: ["planes-activos", sedeActiva],
    queryFn: () => obtenerPlanesActivos(sedeActiva),
    enabled: modalAsignarAbierto,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AsignarMembresiaValues>({ resolver: zodResolver(asignarMembresiaSchema) });

  const asignarMutacion = useMutation({
    mutationFn: (values: AsignarMembresiaValues) => {
      const plan = planes?.find((p) => p.id === values.planId);
      if (!plan) throw new Error("Plan no encontrado");
      if (!sedeActiva) throw new Error("Selecciona una sede primero");

      return crearMembresia({
        clienteId: values.clienteId,
        planId: values.planId,
        sedeId: sedeActiva,
        duracionDias: plan.duracion_dias,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-membresias"] });
      setModalAsignarAbierto(false);
      reset();
    },
  });

  const renovarMutacion = useMutation({
    mutationFn: (membresia: MembresiaConDetalle) =>
      renovarMembresia({
        membresiaAnteriorId: membresia.id,
        clienteId: membresia.cliente_id,
        planId: membresia.plan_id,
        sedeId: membresia.sede_origen_id,
        duracionDias: planes?.find((p) => p.id === membresia.plan_id)?.duracion_dias ?? 30,
        fechaFinAnterior: membresia.fecha_fin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-membresias"] });
    },
  });

  const cancelarMutacion = useMutation({
    mutationFn: (id: string) => cancelarMembresia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-membresias"] });
      setMembresiaCancelando(null);
    },
  });

  function abrirModalAsignar() {
    reset({ clienteId: "", planId: "" });
    setModalAsignarAbierto(true);
  }

  const sedeSeleccionada = sedes?.find((s) => s.id === sedeActiva) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink">Membresías</h1>
          <p className="text-muted text-sm mt-1">
            Gestiona las membresías {esSuperAdmin ? "de todas las sedes" : "de tu sede"}
          </p>
        </div>

        <button
          onClick={abrirModalAsignar}
          disabled={!sedeActiva}
          className="shrink-0 inline-flex items-center justify-center gap-2 bg-primary text-ink font-semibold rounded-lg h-11 px-4 text-sm hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Nueva membresía
        </button>
      </div>

      {/* Solo Super Admin ve la columna de sedes; Admin de Sede ya está
          fijo en la suya, igual que antes. */}
      {esSuperAdmin ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
          <div className="bg-surface rounded-xl border border-line overflow-hidden lg:sticky lg:top-4 lg:self-start">
            <div className="px-4 py-3 border-b border-line">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Sedes
              </p>
            </div>
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible">
              {sedes?.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSedeActiva(s.id)}
                  className={`flex items-center gap-2.5 px-4 py-3 text-sm text-left whitespace-nowrap shrink-0 lg:shrink lg:whitespace-normal border-b border-line last:border-b-0 transition-colors ${
                    sedeActiva === s.id
                      ? "bg-primary text-ink font-semibold"
                      : "text-ink-2 hover:bg-white/5"
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{s.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          <TablaMembresias
            membresias={membresias}
            isLoading={isLoading}
            isError={isError}
            nombreSede={sedeSeleccionada?.nombre}
            onRenovar={(m) => renovarMutacion.mutate(m)}
            renovarPendiente={renovarMutacion.isPending}
            onPedirCancelar={setMembresiaCancelando}
          />
        </div>
      ) : (
        <TablaMembresias
          membresias={membresias}
          isLoading={isLoading}
          isError={isError}
          onRenovar={(m) => renovarMutacion.mutate(m)}
          renovarPendiente={renovarMutacion.isPending}
          onPedirCancelar={setMembresiaCancelando}
        />
      )}

      {/* ================= MODAL: nueva membresía ================= */}
      <Modal
        isOpen={modalAsignarAbierto}
        onClose={() => setModalAsignarAbierto(false)}
        title="Asignar nueva membresía"
      >
        <form
          onSubmit={handleSubmit((values) => asignarMutacion.mutate(values))}
          className="space-y-5"
        >
          <div>
            <label htmlFor="clienteId" className="block text-sm font-medium text-ink mb-2">
              Cliente
            </label>
            <select
              id="clienteId"
              {...register("clienteId")}
              defaultValue=""
              className="w-full h-11 rounded-lg bg-background border border-line px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="" disabled>
                {clientes ? "Selecciona un cliente" : "Cargando clientes..."}
              </option>
              {clientes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
            {errors.clienteId && (
              <p className="text-danger text-xs mt-2">{errors.clienteId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="planId" className="block text-sm font-medium text-ink mb-2">
              Plan
            </label>
            <select
              id="planId"
              {...register("planId")}
              defaultValue=""
              className="w-full h-11 rounded-lg bg-background border border-line px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="" disabled>
                {planes ? "Selecciona un plan" : "Cargando planes..."}
              </option>
              {planes?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — S/ {p.precio} ({p.duracion_dias} días)
                </option>
              ))}
            </select>
            {errors.planId && (
              <p className="text-danger text-xs mt-2">{errors.planId.message}</p>
            )}
          </div>

          {asignarMutacion.isError && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3">
              No se pudo asignar la membresía. Intenta de nuevo.
            </div>
          )}

          <button
            type="submit"
            disabled={asignarMutacion.isPending}
            className="w-full h-12 bg-primary text-ink font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {asignarMutacion.isPending ? "Asignando..." : "Asignar membresía"}
          </button>
        </form>
      </Modal>

      {/* ================= MODAL: cancelar membresía ================= */}
      <Modal
        isOpen={!!membresiaCancelando}
        onClose={() => setMembresiaCancelando(null)}
        title="Cancelar membresía"
      >
        {membresiaCancelando && (
          <div className="space-y-5">
            <p className="text-sm text-ink-2">
              ¿Seguro que deseas cancelar la membresía de{" "}
              <span className="text-ink font-semibold">
                {membresiaCancelando.clienteNombre}
              </span>{" "}
              ({membresiaCancelando.planNombre})? Esta acción no se puede deshacer; si
              luego quiere seguir asistiendo, habrá que asignarle una membresía nueva.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setMembresiaCancelando(null)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 hover:bg-white/5"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={cancelarMutacion.isPending}
                onClick={() => cancelarMutacion.mutate(membresiaCancelando.id)}
                className="bg-danger hover:bg-danger/90 text-white font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                {cancelarMutacion.isPending ? "Cancelando..." : "Cancelar membresía"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ===========================================================
// Tabla + tarjetas móviles. Se separa en su propio componente
// porque se usa tanto para Super Admin (dentro de la grilla con
// sedes) como para Admin de Sede (a todo el ancho).
// ===========================================================
function TablaMembresias({
  membresias,
  isLoading,
  isError,
  nombreSede,
  onRenovar,
  renovarPendiente,
  onPedirCancelar,
}: {
  membresias: MembresiaConDetalle[] | undefined;
  isLoading: boolean;
  isError: boolean;
  nombreSede?: string;
  onRenovar: (m: MembresiaConDetalle) => void;
  renovarPendiente: boolean;
  onPedirCancelar: (m: MembresiaConDetalle) => void;
}) {
  return (
    <div className="min-w-0">
      <AsyncState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!membresias || membresias.length === 0}
        emptyMessage={
          nombreSede
            ? `Todavía no hay membresías registradas en ${nombreSede}.`
            : "Todavía no hay membresías registradas en esta sede."
        }
        errorMessage="No se pudo cargar la lista de membresías."
      >
        {/* ---------- Tabla (escritorio) ---------- */}
        <div className="hidden md:block bg-surface rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/20 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-4 font-semibold">Cliente</th>
                <th className="text-left px-5 py-4 font-semibold">Plan</th>
                <th className="text-left px-5 py-4 font-semibold">Estado</th>
                <th className="text-left px-5 py-4 font-semibold">Vence</th>
                <th className="px-5 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {membresias?.map((m) => (
                <tr key={m.id} className="border-t border-line hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-bold">
                          {m.clienteNombre?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-ink font-medium">{m.clienteNombre}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink-2">{m.planNombre}</td>
                  <td className="px-5 py-4">
                    <BadgeEstadoMembresia estado={m.estado} />
                  </td>
                  <td className="px-5 py-4 text-muted text-xs">
                    {new Date(m.fecha_fin).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onRenovar(m)}
                        disabled={renovarPendiente || m.estado === "cancelada"}
                        aria-label="Renovar"
                        className="p-2 rounded-lg text-muted hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPedirCancelar(m)}
                        disabled={m.estado === "cancelada"}
                        aria-label="Cancelar"
                        className="p-2 rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---------- Tarjetas (móvil) ---------- */}
        <div className="md:hidden space-y-3">
          {membresias?.map((m) => (
            <div key={m.id} className="bg-surface rounded-xl p-4 border border-line space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs font-bold">
                      {m.clienteNombre?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-ink truncate">{m.clienteNombre}</p>
                    <p className="text-muted text-xs mt-1 truncate">{m.planNombre}</p>
                  </div>
                </div>
                <BadgeEstadoMembresia estado={m.estado} />
              </div>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-line">
                <span className="text-muted">
                  Vence {new Date(m.fecha_fin).toLocaleDateString("es-PE")}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onRenovar(m)}
                    disabled={renovarPendiente || m.estado === "cancelada"}
                    className="p-2 rounded-lg text-muted hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-25"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onPedirCancelar(m)}
                    disabled={m.estado === "cancelada"}
                    className="p-2 rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-25"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}