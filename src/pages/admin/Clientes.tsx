import { useMemo, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Search,
  Pencil,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { BadgeEstadoMembresia } from "@/components/ui/BadgeEstadoMembresia";

import { obtenerSedesActivas } from "@/services/sedesService";

import {
  obtenerClientes,
  actualizarCliente,
  type ClienteConMembresia,
} from "@/services/clientesService";

import {
  editarClienteSchema,
  type EditarClienteValues,
} from "@/schemas/clienteSchemas";

export default function AdminClientes() {
  const { sesion } = useAuth();

  const queryClient = useQueryClient();

  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeFiltro, setSedeFiltro] = useState<string>(
    sesion?.sedeId ?? ""
  );

  const [busqueda, setBusqueda] = useState("");

  const [clienteEditando, setClienteEditando] =
    useState<ClienteConMembresia | null>(null);

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const sedeActivaId = esSuperAdmin
    ? sedeFiltro || null
    : sesion?.sedeId ?? null;

  const {
    data: clientes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-clientes", sedeActivaId],
    queryFn: () => obtenerClientes(sedeActivaId),
  });

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return [];

    const termino = busqueda.trim().toLowerCase();

    if (!termino) return clientes;

    return clientes.filter((c) =>
      `${c.nombre} ${c.apellido}`
        .toLowerCase()
        .includes(termino)
    );
  }, [clientes, busqueda]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditarClienteValues>({
    resolver: zodResolver(editarClienteSchema),
  });

  const editarMutacion = useMutation({
    mutationFn: (values: EditarClienteValues) =>
      actualizarCliente(clienteEditando!.id, values),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-clientes"],
      });

      setClienteEditando(null);
    },
  });

  function abrirEdicion(cliente: ClienteConMembresia) {
    setClienteEditando(cliente);

    reset({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
    });
  }

  return (
    <div className="space-y-7">

      {/* =====================================================
          CABECERA
      ===================================================== */}
      <div>

        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-white">
          Clientes
        </h1>

        <p className="text-[#8f99a3] text-sm mt-1">
          Gestiona los clientes{" "}
          {esSuperAdmin
            ? "de todas las sedes"
            : "de tu sede"}
        </p>

      </div>

      {/* =====================================================
          FILTROS
      ===================================================== */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* BUSCADOR */}
        <div className="relative flex-1">

          <Search
            className="
              w-[18px]
              h-[18px]
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-[#7f8992]
            "
          />

          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="
              w-full
              h-[46px]
              rounded-[9px]
              bg-[#1a1e22]
              border
              border-[#30363d]
              pl-11
              pr-4
              text-sm
              text-white
              placeholder:text-[#747e87]
              outline-none
              transition-all
              focus:border-[#f15a24]/70
              focus:ring-2
              focus:ring-[#f15a24]/10
              hover:border-[#3a424a]
            "
          />

        </div>

        {/* SELECT SEDE */}
        {esSuperAdmin && (
          <select
            value={sedeFiltro}
            onChange={(e) => setSedeFiltro(e.target.value)}
            className="
              h-[46px]
              rounded-[9px]
              bg-[#1a1e22]
              border
              border-[#30363d]
              px-4
              text-sm
              text-white
              outline-none
              sm:w-56
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
              Todas las sedes
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
        )}

      </div>

      {/* =====================================================
          ESTADOS / TABLA
      ===================================================== */}
      <AsyncState
        isLoading={isLoading}
        isError={isError}
        isEmpty={clientesFiltrados.length === 0}
        emptyMessage={
          busqueda
            ? "No se encontraron clientes con ese nombre."
            : "Todavía no hay clientes registrados en esta sede."
        }
        errorMessage="No se pudo cargar la lista de clientes."
      >

        {/* ===================================================
            TABLA DESKTOP
        =================================================== */}
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
                  Nombre
                </th>

                <th className="text-left px-5 py-4 font-semibold">
                  Membresía
                </th>

                <th className="text-left px-5 py-4 font-semibold">
                  Vence
                </th>

                <th className="text-left px-5 py-4 font-semibold">
                  Registrado
                </th>

                <th className="px-5 py-4"></th>

              </tr>

            </thead>

            <tbody>

              {clientesFiltrados.map((cliente) => (

                <tr
                  key={cliente.id}
                  className="
                    border-t
                    border-[#2a3036]
                    hover:bg-white/[0.025]
                    transition-colors
                  "
                >

                  {/* NOMBRE */}
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
                        <UserRound
                          className="
                            w-4
                            h-4
                            text-[#f15a24]
                          "
                        />
                      </div>

                      <div>

                        <p className="text-white font-medium">
                          {cliente.nombre}{" "}
                          {cliente.apellido}
                        </p>

                      </div>

                    </div>

                  </td>

                  {/* MEMBRESIA */}
                  <td className="px-5 py-4">

                    <BadgeEstadoMembresia
                      estado={cliente.membresiaEstado}
                    />

                  </td>

                  {/* VENCE */}
                  <td className="px-5 py-4 text-[#9ba4ad] text-xs">

                    {cliente.membresiaFechaFin
                      ? new Date(
                          cliente.membresiaFechaFin
                        ).toLocaleDateString("es-PE")
                      : "—"}

                  </td>

                  {/* REGISTRADO */}
                  <td className="px-5 py-4 text-[#9ba4ad] text-xs">

                    {new Date(
                      cliente.created_at
                    ).toLocaleDateString("es-PE")}

                  </td>

                  {/* EDITAR */}
                  <td className="px-5 py-4 text-right">

                    <button
                      onClick={() =>
                        abrirEdicion(cliente)
                      }
                      aria-label="Editar cliente"
                      className="
                        p-2
                        rounded-lg
                        text-[#8d969f]
                        hover:bg-[#f15a24]/10
                        hover:text-[#f15a24]
                        transition-colors
                      "
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {/* ===================================================
            CARDS MOVILES
        =================================================== */}
        <div className="md:hidden space-y-3">

          {clientesFiltrados.map((cliente) => (

            <div
              key={cliente.id}
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

              <div className="flex items-start justify-between">

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
                    <UserRound
                      className="w-4 h-4 text-[#f15a24]"
                    />
                  </div>

                  <div>

                    <p className="font-medium text-sm text-white">
                      {cliente.nombre}{" "}
                      {cliente.apellido}
                    </p>

                    <p className="text-[#7f8992] text-xs mt-1">
                      Registrado{" "}
                      {new Date(
                        cliente.created_at
                      ).toLocaleDateString("es-PE")}
                    </p>

                  </div>

                </div>

                <button
                  onClick={() =>
                    abrirEdicion(cliente)
                  }
                  aria-label="Editar cliente"
                  className="
                    p-2
                    rounded-lg
                    text-[#8d969f]
                    hover:bg-[#f15a24]/10
                    hover:text-[#f15a24]
                    transition-colors
                  "
                >
                  <Pencil className="w-4 h-4" />
                </button>

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

                <BadgeEstadoMembresia
                  estado={cliente.membresiaEstado}
                />

                {cliente.membresiaFechaFin && (
                  <span className="text-[#89939d]">

                    Vence{" "}

                    {new Date(
                      cliente.membresiaFechaFin
                    ).toLocaleDateString("es-PE")}

                  </span>
                )}

              </div>

            </div>

          ))}

        </div>

      </AsyncState>

      {/* =====================================================
          MODAL EDITAR CLIENTE
      ===================================================== */}
      <Modal
        isOpen={!!clienteEditando}
        onClose={() => setClienteEditando(null)}
        title="Editar cliente"
      >

        <form
          onSubmit={handleSubmit((values) =>
            editarMutacion.mutate(values)
          )}
          className="space-y-5"
        >

          {/* NOMBRE */}
          <div>

            <label
              htmlFor="nombre"
              className="
                block
                text-sm
                font-medium
                text-white/80
                mb-2
              "
            >
              Nombre
            </label>

            <input
              id="nombre"
              {...register("nombre")}
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
            />

            {errors.nombre && (
              <p className="text-red-400 text-xs mt-2">
                {errors.nombre.message}
              </p>
            )}

          </div>

          {/* APELLIDO */}
          <div>

            <label
              htmlFor="apellido"
              className="
                block
                text-sm
                font-medium
                text-white/80
                mb-2
              "
            >
              Apellido
            </label>

            <input
              id="apellido"
              {...register("apellido")}
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
            />

            {errors.apellido && (
              <p className="text-red-400 text-xs mt-2">
                {errors.apellido.message}
              </p>
            )}

          </div>

          {/* ERROR */}
          {editarMutacion.isError && (
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
              No se pudo guardar el cambio.
              Intenta de nuevo.
            </div>
          )}

          {/* GUARDAR */}
          <button
            type="submit"
            disabled={editarMutacion.isPending}
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
              transition-all
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {editarMutacion.isPending
              ? "Guardando..."
              : "Guardar cambios"}
          </button>

        </form>

      </Modal>

    </div>
  );
}