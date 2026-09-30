import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Globe, Pencil, Plus, Tags } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { obtenerSedesActivas } from "@/services/sedesService";
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

  // null = pestaña "Todas las sedes" (planes globales).
  const [sedeActiva, setSedeActiva] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [planEditando, setPlanEditando] = useState<PlanCompleto | null>(null);

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
  });

  // Admin de Sede solo puede ver su propia sede como pestaña (no las
  // otras dos) -- Super Admin ve todas.
  const sedesVisibles = esSuperAdmin
    ? (sedes ?? [])
    : (sedes ?? []).filter((s) => s.id === sesion?.sedeId);

  const {
    data: planes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-planes", sedeActiva],
    queryFn: () => obtenerTodosLosPlanes(sedeActiva),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PlanFormValues>({ resolver: zodResolver(planSchema) });

  const alcance = watch("alcance");

  const guardarMutacion = useMutation({
    mutationFn: (values: PlanFormValues) => {
      const sedeId = values.alcance === "todas" ? null : (values.sedeId ?? null);
      const payload = {
        nombre: values.nombre,
        precio: values.precio,
        duracionDias: values.duracionDias,
        esMultisede: values.esMultisede,
        sedeId,
      };
      return planEditando ? actualizarPlan(planEditando.id, payload) : crearPlan(payload);
    },
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
    reset({
      nombre: "",
      precio: 0,
      duracionDias: 30,
      esMultisede: false,
      // Si estás viendo una sede en particular, el plan nuevo nace para
      // esa sede; si estás en "Todas las sedes", nace global. Se puede
      // cambiar igual desde el propio formulario.
      alcance: sedeActiva ? "sede" : "todas",
      sedeId: sedeActiva ?? "",
    });
    setModalAbierto(true);
  }

  function abrirEdicion(plan: PlanCompleto) {
    setPlanEditando(plan);
    reset({
      nombre: plan.nombre,
      precio: plan.precio,
      duracionDias: plan.duracion_dias,
      esMultisede: plan.es_multisede,
      alcance: plan.sede_id ? "sede" : "todas",
      sedeId: plan.sede_id ?? "",
    });
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setPlanEditando(null);
  }

  const tituloLista = sedeActiva
    ? (sedesVisibles.find((s) => s.id === sedeActiva)?.nombre ?? "esta sede")
    : "todas las sedes";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink">Planes</h1>
          <p className="text-muted text-sm">
            Los planes pueden ser para todas las sedes o exclusivos de una
          </p>
        </div>
        {esSuperAdmin && (
          <button
            onClick={abrirNuevo}
            className="shrink-0 inline-flex items-center gap-2 bg-primary text-ink font-semibold rounded-lg h-11 px-4 text-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo plan</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        {/* ================= SEDES (+ Todas las sedes) ================= */}
        <div className="bg-surface rounded-xl border border-line overflow-hidden lg:sticky lg:top-4 lg:self-start">
          <div className="px-4 py-3 border-b border-line">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Alcance
            </p>
          </div>
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible">
            <button
              type="button"
              onClick={() => setSedeActiva(null)}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm text-left whitespace-nowrap shrink-0 lg:shrink lg:whitespace-normal border-b border-line transition-colors ${
                sedeActiva === null
                  ? "bg-primary text-ink font-semibold"
                  : "text-ink-2 hover:bg-white/5"
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="flex-1">Todas las sedes</span>
            </button>

            {sedesVisibles.map((s) => (
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

        {/* ================= TABLA ================= */}
        <div className="min-w-0">
          <AsyncState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!planes || planes.length === 0}
            emptyMessage={
              sedeActiva
                ? `Todavía no hay planes exclusivos de ${tituloLista}.`
                : "Todavía no hay planes para todas las sedes."
            }
            errorMessage="No se pudo cargar la lista de planes."
          >
            <div className="hidden md:block bg-surface rounded-xl border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-black/20 text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold">Precio</th>
                    <th className="text-left px-4 py-3 font-semibold">Duración</th>
                    <th className="text-left px-4 py-3 font-semibold">Multisede</th>
                    <th className="text-left px-4 py-3 font-semibold">Estado</th>
                    {esSuperAdmin && (
                      <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {planes?.map((plan) => (
                    <tr key={plan.id} className="border-t border-line">
                      <td className="px-4 py-3 text-ink font-medium">{plan.nombre}</td>
                      <td className="px-4 py-3 text-ink-2">S/ {plan.precio.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted">{plan.duracion_dias} días</td>
                      <td className="px-4 py-3 text-muted">
                        {plan.es_multisede ? "Sí" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        {esSuperAdmin ? (
                          <button
                            onClick={() => alternarMutacion.mutate(plan)}
                            disabled={alternarMutacion.isPending}
                            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                              plan.activo
                                ? "bg-success/10 text-success"
                                : "bg-muted/10 text-muted"
                            }`}
                          >
                            {plan.activo ? "Activo" : "Inactivo"}
                          </button>
                        ) : (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              plan.activo
                                ? "bg-success/10 text-success"
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
                            className="p-1.5 rounded-md text-muted hover:bg-white/5 hover:text-primary transition-colors"
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
                        <p className="font-medium text-sm text-ink">{plan.nombre}</p>
                        <p className="text-muted text-xs">
                          S/ {plan.precio.toFixed(2)} · {plan.duracion_dias} días
                        </p>
                      </div>
                    </div>
                    {esSuperAdmin && (
                      <button
                        onClick={() => abrirEdicion(plan)}
                        aria-label="Editar plan"
                        className="p-1.5 rounded-md text-muted hover:bg-white/5 hover:text-primary transition-colors"
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
                          plan.activo ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                        }`}
                      >
                        {plan.activo ? "Activo" : "Inactivo"}
                      </button>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          plan.activo ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
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
        </div>
      </div>

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
              <label htmlFor="nombre" className="block text-sm mb-1 text-ink">
                Nombre
              </label>
              <input
                id="nombre"
                {...register("nombre")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.nombre && (
                <p className="text-danger text-xs mt-1">{errors.nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="precio" className="block text-sm mb-1 text-ink">
                  Precio (S/)
                </label>
                <input
                  id="precio"
                  type="number"
                  step="0.01"
                  {...register("precio")}
                  className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.precio && (
                  <p className="text-danger text-xs mt-1">{errors.precio.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="duracionDias" className="block text-sm mb-1 text-ink">
                  Duración (días)
                </label>
                <input
                  id="duracionDias"
                  type="number"
                  {...register("duracionDias")}
                  className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.duracionDias && (
                  <p className="text-danger text-xs mt-1">{errors.duracionDias.message}</p>
                )}
              </div>
            </div>

            {/* -------- Alcance: para todas las sedes, o solo una -------- */}
            <div>
              <p className="block text-sm mb-2 text-ink">¿Para qué sedes es este plan?</p>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    alcance === "todas"
                      ? "border-primary bg-primary/10 text-ink"
                      : "border-line text-ink-2 hover:bg-white/5"
                  }`}
                >
                  <input type="radio" value="todas" {...register("alcance")} className="accent-primary" />
                  Todas las sedes
                </label>
                <label
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    alcance === "sede"
                      ? "border-primary bg-primary/10 text-ink"
                      : "border-line text-ink-2 hover:bg-white/5"
                  }`}
                >
                  <input type="radio" value="sede" {...register("alcance")} className="accent-primary" />
                  Solo esta sede
                </label>
              </div>
            </div>

            {alcance === "sede" && (
              <div>
                <label htmlFor="sedeId" className="block text-sm mb-1 text-ink">
                  Sede
                </label>
                <select
                  id="sedeId"
                  {...register("sedeId")}
                  className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecciona una sede</option>
                  {sedes?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                {errors.sedeId && (
                  <p className="text-danger text-xs mt-1">{errors.sedeId.message}</p>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input
                type="checkbox"
                checked={watch("esMultisede")}
                onChange={(e) => setValue("esMultisede", e.target.checked)}
                className="rounded border-line accent-primary"
              />
              Este plan permite acceso en cualquier sede
            </label>

            {guardarMutacion.isError && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">
                No se pudo guardar el plan. Intenta de nuevo.
              </div>
            )}

            <button
              type="submit"
              disabled={guardarMutacion.isPending}
              className="w-full bg-primary text-ink font-semibold rounded-lg py-2.5 text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {guardarMutacion.isPending ? "Guardando..." : "Guardar plan"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}