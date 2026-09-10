import { useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Plus,
  RotateCw,
  Ban,
} from "lucide-react";

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

  const [sedeFiltro, setSedeFiltro] = useState<string>(
    sesion?.sedeId ?? ""
  );

  const [modalAsignarAbierto, setModalAsignarAbierto] =
    useState(false);

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const sedeActivaId = esSuperAdmin
    ? sedeFiltro || null
    : sesion?.sedeId ?? null;

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
      const plan = planes?.find(
        (p) => p.id === values.planId
      );

      if (!plan) throw new Error("Plan no encontrado");

      if (!sedeActivaId) {
        throw new Error("Selecciona una sede primero");
      }

      return crearMembresia({
        clienteId: values.clienteId,
        planId: values.planId,
        sedeId: sedeActivaId,
        duracionDias: plan.duracion_dias,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-membresias"],
      });

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
          planes?.find(
            (p) => p.id === membresia.plan_id
          )?.duracion_dias ?? 30,
        fechaFinAnterior: membresia.fecha_fin,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-membresias"],
      });
    },
  });

  const cancelarMutacion = useMutation({
    mutationFn: (id: string) => cancelarMembresia(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-membresias"],
      });
    },
  });

  function abrirModalAsignar() {
    reset({
      clienteId: "",
      planId: "",
    });

    setModalAsignarAbierto(true);
  }

  return (
    <div className="space-y-7">

      {/* =====================================================
          CABECERA
      ===================================================== */}
      <div className="flex items-start justify-between gap-4">

        <div>

          <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-white">
            Membresías
          </h1>

          <p className="text-[#89939d] text-sm mt-1">
            Gestiona las membresías{" "}
            {esSuperAdmin
              ? "de todas las sedes"
              : "de tu sede"}
          </p>

        </div>

        {/* BOTÓN NUEVA */}
        <button
          onClick={abrirModalAsignar}
          disabled={!sedeActivaId}
          className="
            shrink-0
            h-[42px]
            bg-[#f15a24]
            text-white
            font-semibold
            rounded-lg
            px-4
            text-sm
            inline-flex
            items-center
            gap-2
            shadow-[0_8px_25px_rgba(241,90,36,0.18)]
            hover:bg-[#ff6930]
            hover:shadow-[0_10px_30px_rgba(241,90,36,0.24)]
            transition-all
            disabled:opacity-40
            disabled:cursor-not-allowed
          "
        >
          <Plus className="w-4 h-4" />

          <span className="hidden sm:inline">
            Nueva membresía
          </span>

          <span className="sm:hidden">
            Nueva
          </span>
        </button>

      </div>

      {/* =====================================================
          SELECTOR DE SEDE
      ===================================================== */}
      {esSuperAdmin && (
        <div>

          <label className="block text-[12px] font-medium text-[#89939d] mb-2">
            Sede
          </label>

          <select
            value={sedeFiltro}
            onChange={(e) =>
              setSedeFiltro(e.target.value)
            }
            className="
              rounded-lg
              bg-[#1a1e22]
              border
              border-[#30363d]
              px-4
              h-[44px]
              text-sm
              text-white
              w-full
              sm:w-56
              outline-none
              focus:border-[#f15a24]/70
              focus:ring-2
              focus:ring-[#f15a24]/10
              hover:border-[#3a424a]
              transition-all
            "
          >
            <option
              value=""
              className="bg-[#1a1e22]"
            >
              Selecciona una sede
            </option>

            {sedes?.map((sede) => (
              <option
                key={sede.id}
                value={sede.id}
                className="bg-[#1a1e22]"
              >
                {sede.nombre}
              </option>
            ))}
          </select>

        </div>
      )}

      {/* =====================================================
          CONTENIDO
      ===================================================== */}
      {!sedeActivaId ? (

        <div
          className="
            bg-[#1a1e22]
            rounded-[14px]
            p-8
            text-center
            text-[#89939d]
            text-sm
            border
            border-[#30363d]
          "
        >
          <div
            className="
              w-12
              h-12
              mx-auto
              mb-4
              rounded-full
              bg-[#f15a24]/10
              border
              border-[#f15a24]/15
              flex
              items-center
              justify-center
            "
          >
            <RotateCw className="w-5 h-5 text-[#f15a24]" />
          </div>

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

          {/* =================================================
              TABLA DESKTOP
          ================================================= */}
          <div
            className="
              hidden
              md:block
              bg-[#1a1e22]
              rounded-[14px]
              border
              border-[#30363d]
              overflow-hidden
              shadow-[0_10px_35px_rgba(0,0,0,0.18)]
            "
          >

            <table className="w-full text-sm">

              <thead
                className="
                  bg-[#1f2429]
                  text-[#89939d]
                  text-[11px]
                  uppercase
                  tracking-[0.08em]
                "
              >

                <tr>

                  <th className="text-left px-5 py-4 font-semibold">
                    Cliente
                  </th>

                  <th className="text-left px-5 py-4 font-semibold">
                    Plan
                  </th>

                  <th className="text-left px-5 py-4 font-semibold">
                    Estado
                  </th>

                  <th className="text-left px-5 py-4 font-semibold">
                    Vence
                  </th>

                  <th className="px-5 py-4"></th>

                </tr>

              </thead>

              <tbody>

                {membresias?.map((m) => (

                  <tr
                    key={m.id}
                    className="
                      border-t
                      border-[#2a3036]
                      hover:bg-white/[0.025]
                      transition-colors
                    "
                  >

                    {/* CLIENTE */}
                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        <div
                          className="
                            w-9
                            h-9
                            rounded-full
                            bg-[#f15a24]/10
                            border
                            border-[#f15a24]/15
                            flex
                            items-center
                            justify-center
                            shrink-0
                          "
                        >
                          <span className="text-[#f15a24] text-xs font-bold">
                            {m.clienteNombre
                              ?.charAt(0)
                              ?.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-white font-medium">
                          {m.clienteNombre}
                        </p>

                      </div>

                    </td>

                    {/* PLAN */}
                    <td className="px-5 py-4 text-[#a2abb4]">
                      {m.planNombre}
                    </td>

                    {/* ESTADO */}
                    <td className="px-5 py-4">

                      <BadgeEstadoMembresia
                        estado={m.estado}
                      />

                    </td>

                    {/* VENCIMIENTO */}
                    <td className="px-5 py-4 text-[#9ba4ad] text-xs">

                      {new Date(
                        m.fecha_fin
                      ).toLocaleDateString("es-PE")}

                    </td>

                    {/* ACCIONES */}
                    <td className="px-5 py-4">

                      <div className="flex justify-end gap-1">

                        <button
                          onClick={() =>
                            renovarMutacion.mutate(m)
                          }
                          disabled={
                            renovarMutacion.isPending ||
                            m.estado === "cancelada"
                          }
                          aria-label="Renovar"
                          className="
                            p-2
                            rounded-lg
                            text-[#89939d]
                            hover:bg-[#f15a24]/10
                            hover:text-[#f15a24]
                            transition-colors
                            disabled:opacity-25
                            disabled:cursor-not-allowed
                          "
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            cancelarMutacion.mutate(m.id)
                          }
                          disabled={
                            cancelarMutacion.isPending ||
                            m.estado === "cancelada"
                          }
                          aria-label="Cancelar"
                          className="
                            p-2
                            rounded-lg
                            text-[#89939d]
                            hover:bg-red-500/10
                            hover:text-red-400
                            transition-colors
                            disabled:opacity-25
                            disabled:cursor-not-allowed
                          "
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

          {/* =================================================
              CARDS MOVILES
          ================================================= */}
          <div className="md:hidden space-y-3">

            {membresias?.map((m) => (

              <div
                key={m.id}
                className="
                  bg-[#1a1e22]
                  rounded-[14px]
                  p-4
                  border
                  border-[#30363d]
                  space-y-3
                  shadow-[0_8px_25px_rgba(0,0,0,0.15)]
                "
              >

                <div className="flex items-start justify-between gap-3">

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        w-10
                        h-10
                        rounded-full
                        bg-[#f15a24]/10
                        border
                        border-[#f15a24]/15
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    >
                      <span className="text-[#f15a24] text-xs font-bold">
                        {m.clienteNombre
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </span>
                    </div>

                    <div>

                      <p className="font-medium text-sm text-white">
                        {m.clienteNombre}
                      </p>

                      <p className="text-[#89939d] text-xs mt-1">
                        {m.planNombre}
                      </p>

                    </div>

                  </div>

                  <BadgeEstadoMembresia
                    estado={m.estado}
                  />

                </div>

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    text-xs
                    pt-3
                    border-t
                    border-[#2a3036]
                  "
                >

                  <span className="text-[#89939d]">

                    Vence{" "}

                    {new Date(
                      m.fecha_fin
                    ).toLocaleDateString("es-PE")}

                  </span>

                  <div className="flex gap-1">

                    <button
                      onClick={() =>
                        renovarMutacion.mutate(m)
                      }
                      disabled={
                        renovarMutacion.isPending ||
                        m.estado === "cancelada"
                      }
                      className="
                        p-2
                        rounded-lg
                        text-[#89939d]
                        hover:bg-[#f15a24]/10
                        hover:text-[#f15a24]
                        transition-colors
                        disabled:opacity-25
                      "
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        cancelarMutacion.mutate(m.id)
                      }
                      disabled={
                        cancelarMutacion.isPending ||
                        m.estado === "cancelada"
                      }
                      className="
                        p-2
                        rounded-lg
                        text-[#89939d]
                        hover:bg-red-500/10
                        hover:text-red-400
                        transition-colors
                        disabled:opacity-25
                      "
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

      {/* =====================================================
          MODAL
      ===================================================== */}
      <Modal
        isOpen={modalAsignarAbierto}
        onClose={() => setModalAsignarAbierto(false)}
        title="Asignar nueva membresía"
      >

        <form
          onSubmit={handleSubmit((values) =>
            asignarMutacion.mutate(values)
          )}
          className="space-y-5"
        >

          {/* CLIENTE */}
          <div>

            <label
              htmlFor="clienteId"
              className="
                block
                text-sm
                font-medium
                text-white/80
                mb-2
              "
            >
              Cliente
            </label>

            <select
              id="clienteId"
              {...register("clienteId")}
              defaultValue=""
              className="
                w-full
                h-[46px]
                rounded-lg
                bg-[#171b1f]
                border
                border-[#30363d]
                px-4
                text-sm
                text-white
                outline-none
                focus:border-[#f15a24]
                focus:ring-2
                focus:ring-[#f15a24]/10
                transition-all
              "
            >

              <option
                value=""
                disabled
                className="bg-[#171b1f]"
              >
                {clientes
                  ? "Selecciona un cliente"
                  : "Cargando clientes..."}
              </option>

              {clientes?.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  className="bg-[#171b1f]"
                >
                  {c.nombre} {c.apellido}
                </option>
              ))}

            </select>

            {errors.clienteId && (
              <p className="text-red-400 text-xs mt-2">
                {errors.clienteId.message}
              </p>
            )}

          </div>

          {/* PLAN */}
          <div>

            <label
              htmlFor="planId"
              className="
                block
                text-sm
                font-medium
                text-white/80
                mb-2
              "
            >
              Plan
            </label>

            <select
              id="planId"
              {...register("planId")}
              defaultValue=""
              className="
                w-full
                h-[46px]
                rounded-lg
                bg-[#171b1f]
                border
                border-[#30363d]
                px-4
                text-sm
                text-white
                outline-none
                focus:border-[#f15a24]
                focus:ring-2
                focus:ring-[#f15a24]/10
                transition-all
              "
            >

              <option
                value=""
                disabled
                className="bg-[#171b1f]"
              >
                {planes
                  ? "Selecciona un plan"
                  : "Cargando planes..."}
              </option>

              {planes?.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-[#171b1f]"
                >
                  {p.nombre} — S/ {p.precio} ({p.duracion_dias} días)
                </option>
              ))}

            </select>

            {errors.planId && (
              <p className="text-red-400 text-xs mt-2">
                {errors.planId.message}
              </p>
            )}

          </div>

          {/* ERROR */}
          {asignarMutacion.isError && (
            <div
              className="
                bg-red-500/10
                border
                border-red-500/20
                text-red-400
                text-sm
                rounded-lg
                px-4
                py-3
              "
            >
              No se pudo asignar la membresía.
              Intenta de nuevo.
            </div>
          )}

          {/* BOTON */}
          <button
            type="submit"
            disabled={asignarMutacion.isPending}
            className="
              w-full
              h-[48px]
              bg-[#f15a24]
              text-white
              font-semibold
              rounded-lg
              text-sm
              shadow-[0_8px_25px_rgba(241,90,36,0.18)]
              hover:bg-[#ff6930]
              hover:shadow-[0_10px_30px_rgba(241,90,36,0.24)]
              transition-all
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {asignarMutacion.isPending
              ? "Asignando..."
              : "Asignar membresía"}
          </button>

        </form>

      </Modal>

    </div>
  );
}