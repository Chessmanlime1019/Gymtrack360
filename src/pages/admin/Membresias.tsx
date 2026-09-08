import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCw, Ban } from "lucide-react";
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

  const [sedeFiltro, setSedeFiltro] = useState<string>(sesion?.sedeId ?? "");
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const sedeActivaId = esSuperAdmin ? sedeFiltro || null : sesion?.sedeId ?? null;

  const {
    data: membresias,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-membresias", sedeActivaId],
    queryFn: () => obtenerMembresias(sedeActivaId),
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes-simple", sedeActivaId],
    queryFn: () => obtenerClientesSimple(sedeActivaId),
    enabled: modalAsignarAbierto,
  });

  const { data: planes } = useQuery({
    queryKey: ["planes-activos"],
    queryFn: obtenerPlanesActivos,
    enabled: modalAsignarAbierto,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AsignarMembresiaValues>({
    resolver: zodResolver(asignarMembresiaSchema),
  });

  const asignarMutacion = useMutation({
    mutationFn: (values: AsignarMembresiaValues) => {
      const plan = planes?.find((p) => p.id === values.planId);
      if (!plan) throw new Error("Plan no encontrado");
      if (!sedeActivaId) throw new Error("Selecciona una sede primero");

      return crearMembresia({
        clienteId: values.clienteId,
        planId: values.planId,
        sedeId: sedeActivaId,
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
        duracionDias:
          planes?.find((p) => p.id === membresia.plan_id)?.duracion_dias ?? 30,
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
    },
  });

  function abrirModalAsignar() {
    reset({ clienteId: "", planId: "" });
    setModalAsignarAbierto(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Membresías</h1>
          <p className="text-muted text-sm">
            Gestiona las membresías {esSuperAdmin ? "de todas las sedes" : "de tu sede"}
          </p>
        </div>
        <button
          onClick={abrirModalAsignar}
          disabled={!sedeActivaId}
          className="shrink-0 bg-primary text-background font-semibold rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva</span>
        </button>
      </div>

      {esSuperAdmin && (
        <select
          value={sedeFiltro}
          onChange={(e) => setSedeFiltro(e.target.value)}
          className="rounded-lg bg-surface border border-white/10 px-3 py-2 text-sm w-full sm:w-56"
        >
          <option value="">Selecciona una sede</option>
          {sedes?.map((sede) => (
            <option key={sede.id} value={sede.id}>
              {sede.nombre}
            </option>
          ))}
        </select>
      )}

      {!sedeActivaId ? (
        <div className="bg-surface rounded-xl p-6 text-center text-muted text-sm border border-white/10">
          Selecciona una sede para ver sus membresías.
        </div>
      ) : (
        <AsyncState
          isLoading={isLoading}
          isError={isError}
          isEmpty={!membresias || membresias.length === 0}
          emptyMessage="Todavía no hay membresías registradas en esta sede."
          errorMessage="No se pudo cargar la lista de membresías."
        >
          {/* Tabla en escritorio */}
          <div className="hidden md:block bg-surface rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Vence</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {membresias?.map((m) => (
                  <tr key={m.id} className="border-t border-white/5">
                    <td className="px-4 py-3">{m.clienteNombre}</td>
                    <td className="px-4 py-3 text-muted">{m.planNombre}</td>
                    <td className="px-4 py-3">
                      <BadgeEstadoMembresia estado={m.estado} />
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(m.fecha_fin).toLocaleDateString("es-PE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => renovarMutacion.mutate(m)}
                          disabled={renovarMutacion.isPending || m.estado === "cancelada"}
                          aria-label="Renovar"
                          className="p-1.5 rounded-md text-white/60 hover:bg-white/5 hover:text-primary transition-colors disabled:opacity-30"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => cancelarMutacion.mutate(m.id)}
                          disabled={cancelarMutacion.isPending || m.estado === "cancelada"}
                          aria-label="Cancelar"
                          className="p-1.5 rounded-md text-white/60 hover:bg-white/5 hover:text-red-400 transition-colors disabled:opacity-30"
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

          {/* Cards en móvil/tablet angosto */}
          <div className="md:hidden space-y-3">
            {membresias?.map((m) => (
              <div
                key={m.id}
                className="bg-surface rounded-xl p-4 border border-white/10 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{m.clienteNombre}</p>
                    <p className="text-muted text-xs">{m.planNombre}</p>
                  </div>
                  <BadgeEstadoMembresia estado={m.estado} />
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                  <span className="text-muted">
                    Vence {new Date(m.fecha_fin).toLocaleDateString("es-PE")}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => renovarMutacion.mutate(m)}
                      disabled={renovarMutacion.isPending || m.estado === "cancelada"}
                      className="p-1.5 rounded-md text-white/60 hover:bg-white/5 hover:text-primary transition-colors disabled:opacity-30"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => cancelarMutacion.mutate(m.id)}
                      disabled={cancelarMutacion.isPending || m.estado === "cancelada"}
                      className="p-1.5 rounded-md text-white/60 hover:bg-white/5 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AsyncState>
      )}

      <Modal
        isOpen={modalAsignarAbierto}
        onClose={() => setModalAsignarAbierto(false)}
        title="Asignar nueva membresía"
      >
        <form
          onSubmit={handleSubmit((values) => asignarMutacion.mutate(values))}
          className="space-y-4"
        >
          <div>
            <label htmlFor="clienteId" className="block text-sm mb-1">
              Cliente
            </label>
            <select
              id="clienteId"
              {...register("clienteId")}
              defaultValue=""
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm"
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
              <p className="text-red-400 text-xs mt-1">{errors.clienteId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="planId" className="block text-sm mb-1">
              Plan
            </label>
            <select
              id="planId"
              {...register("planId")}
              defaultValue=""
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm"
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
              <p className="text-red-400 text-xs mt-1">{errors.planId.message}</p>
            )}
          </div>

          {asignarMutacion.isError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              No se pudo asignar la membresía. Intenta de nuevo.
            </div>
          )}

          <button
            type="submit"
            disabled={asignarMutacion.isPending}
            className="w-full bg-primary text-background font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
          >
            {asignarMutacion.isPending ? "Asignando..." : "Asignar membresía"}
          </button>
        </form>
      </Modal>
    </div>
  );
}