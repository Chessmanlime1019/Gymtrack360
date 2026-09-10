import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Tags } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import {
  obtenerTodosLosPlanes,
  crearPlan,
  actualizarPlan,
  alternarActivoPlan,
  type PlanCompleto,
} from "@/services/planesService";
import { planSchema, type PlanFormValues } from "@/schemas/planSchemas";

export default function AdminPlanes() {
  const { sesion } = useAuth();
  const esSuperAdmin = sesion?.role === "super_admin";
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [planEditando, setPlanEditando] = useState<PlanCompleto | null>(null);

  const {
    data: planes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-planes"],
    queryFn: obtenerTodosLosPlanes,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: { esMultisede: false },
  });

  const guardarMutacion = useMutation({
    mutationFn: (values: PlanFormValues) =>
      planEditando ? actualizarPlan(planEditando.id, values) : crearPlan(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-planes"] });
      queryClient.invalidateQueries({ queryKey: ["planes-activos"] });
      cerrarModal();
    },
  });

  const alternarMutacion = useMutation({
    mutationFn: (plan: PlanCompleto) => alternarActivoPlan(plan.id, !plan.activo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-planes"] });
      queryClient.invalidateQueries({ queryKey: ["planes-activos"] });
    },
  });

  function abrirNuevo() {
    setPlanEditando(null);
    reset({ nombre: "", precio: 0, duracionDias: 30, esMultisede: false });
    setModalAbierto(true);
  }

  function abrirEdicion(plan: PlanCompleto) {
    setPlanEditando(plan);
    reset({
      nombre: plan.nombre,
      precio: plan.precio,
      duracionDias: plan.duracion_dias,
      esMultisede: plan.es_multisede,
    });
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setPlanEditando(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Planes</h1>
          <p className="text-muted text-sm">
            Los planes son compartidos por todas las sedes
          </p>
        </div>
        {esSuperAdmin && (
          <button
            onClick={abrirNuevo}
            className="shrink-0 bg-primary text-white font-semibold rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        )}
      </div>

      <AsyncState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!planes || planes.length === 0}
        emptyMessage="Todavía no hay planes creados."
        errorMessage="No se pudo cargar la lista de planes."
      >
        <div className="hidden md:block bg-surface rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] text-muted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Precio</th>
                <th className="text-left px-4 py-3">Duración</th>
                <th className="text-left px-4 py-3">Multisede</th>
                <th className="text-left px-4 py-3">Estado</th>
                {esSuperAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {planes?.map((plan) => (
                <tr key={plan.id} className="border-t border-line">
                  <td className="px-4 py-3">{plan.nombre}</td>
                  <td className="px-4 py-3">S/ {plan.precio.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted">{plan.duracion_dias} días</td>
                  <td className="px-4 py-3 text-muted">
                    {plan.es_multisede ? "Sí" : "No"}
                  </td>
                  <td className="px-4 py-3">
                    {esSuperAdmin ? (
                      <button
                        onClick={() => alternarMutacion.mutate(plan)}
                        disabled={alternarMutacion.isPending}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          plan.activo
                            ? "bg-green-600/10 text-green-600"
                            : "bg-muted/10 text-muted"
                        }`}
                      >
                        {plan.activo ? "Activo" : "Inactivo"}
                      </button>
                    ) : (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          plan.activo
                            ? "bg-green-600/10 text-green-600"
                            : "bg-muted/10 text-muted"
                        }`}
                      >
                        {plan.activo ? "Activo" : "Inactivo"}
                      </span>
                    )}
                  </td>
                  {esSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => abrirEdicion(plan)}
                        aria-label="Editar plan"
                        className="p-1.5 rounded-md text-muted hover:bg-black/5 hover:text-primary transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {planes?.map((plan) => (
            <div
              key={plan.id}
              className="bg-surface rounded-xl p-4 border border-line space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Tags className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{plan.nombre}</p>
                    <p className="text-muted text-xs">
                      S/ {plan.precio.toFixed(2)} · {plan.duracion_dias} días
                    </p>
                  </div>
                </div>
                {esSuperAdmin && (
                  <button
                    onClick={() => abrirEdicion(plan)}
                    aria-label="Editar plan"
                    className="p-1.5 rounded-md text-muted hover:bg-black/5 hover:text-primary transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-line">
                <span className="text-muted">
                  {plan.es_multisede ? "Multisede" : "Una sede"}
                </span>
                {esSuperAdmin ? (
                  <button
                    onClick={() => alternarMutacion.mutate(plan)}
                    disabled={alternarMutacion.isPending}
                    className={`px-2 py-0.5 rounded-full ${
                      plan.activo
                        ? "bg-green-600/10 text-green-600"
                        : "bg-muted/10 text-muted"
                    }`}
                  >
                    {plan.activo ? "Activo" : "Inactivo"}
                  </button>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      plan.activo
                        ? "bg-green-600/10 text-green-600"
                        : "bg-muted/10 text-muted"
                    }`}
                  >
                    {plan.activo ? "Activo" : "Inactivo"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </AsyncState>

      {esSuperAdmin && (
        <Modal
          isOpen={modalAbierto}
          onClose={cerrarModal}
          title={planEditando ? "Editar plan" : "Nuevo plan"}
        >
          <form
            onSubmit={handleSubmit((values) => guardarMutacion.mutate(values))}
            className="space-y-4"
          >
            <div>
              <label htmlFor="nombre" className="block text-sm mb-1">
                Nombre
              </label>
              <input
                id="nombre"
                {...register("nombre")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.nombre && (
                <p className="text-red-600 text-xs mt-1">{errors.nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="precio" className="block text-sm mb-1">
                  Precio (S/)
                </label>
                <input
                  id="precio"
                  type="number"
                  step="0.01"
                  {...register("precio")}
                  className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.precio && (
                  <p className="text-red-600 text-xs mt-1">{errors.precio.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="duracionDias" className="block text-sm mb-1">
                  Duración (días)
                </label>
                <input
                  id="duracionDias"
                  type="number"
                  {...register("duracionDias")}
                  className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.duracionDias && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.duracionDias.message}
                  </p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={watch("esMultisede")}
                onChange={(e) => setValue("esMultisede", e.target.checked)}
                className="rounded border-line"
              />
              Este plan permite acceso en cualquier sede
            </label>

            {guardarMutacion.isError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
                No se pudo guardar el plan. Intenta de nuevo.
              </div>
            )}

            <button
              type="submit"
              disabled={guardarMutacion.isPending}
              className="w-full bg-primary text-white font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
            >
              {guardarMutacion.isPending ? "Guardando..." : "Guardar plan"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}