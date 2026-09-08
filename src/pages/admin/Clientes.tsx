import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Pencil, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { obtenerSedesActivas } from "@/services/sedesService";
import { BadgeEstadoMembresia } from "@/components/ui/BadgeEstadoMembresia";
import {
  obtenerClientes,
  actualizarCliente,
  type ClienteConMembresia,
} from "@/services/clientesService";
import {
  editarClienteSchema,
  type EditarClienteValues,
} from "@/schemas/clienteSchemas";
import type { MembresiaEstado } from "@/types";

const ESTILO_BADGE: Record<MembresiaEstado, string> = {
  activa: "bg-primary/10 text-primary",
  vencida: "bg-yellow-500/10 text-yellow-400",
  cancelada: "bg-red-500/10 text-red-400",
};

const ETIQUETA_BADGE: Record<MembresiaEstado, string> = {
  activa: "Activa",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

function BadgeMembresia({ estado }: { estado: MembresiaEstado | null }) {
  if (!estado) {
    return <span className="text-xs text-muted">Sin membresía</span>;
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTILO_BADGE[estado]}`}>
      
    </span>
  );
}

export default function AdminClientes() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeFiltro, setSedeFiltro] = useState<string>(sesion?.sedeId ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [clienteEditando, setClienteEditando] = useState<ClienteConMembresia | null>(
    null
  );

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const sedeActivaId = esSuperAdmin ? sedeFiltro || null : sesion?.sedeId ?? null;

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
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(termino)
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
      queryClient.invalidateQueries({ queryKey: ["admin-clientes"] });
      setClienteEditando(null);
    },
  });

  function abrirEdicion(cliente: ClienteConMembresia) {
    setClienteEditando(cliente);
    reset({ nombre: cliente.nombre, apellido: cliente.apellido });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Clientes</h1>
        <p className="text-muted text-sm">
          Gestiona los clientes {esSuperAdmin ? "de todas las sedes" : "de tu sede"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full rounded-lg bg-surface border border-white/10 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {esSuperAdmin && (
          <select
            value={sedeFiltro}
            onChange={(e) => setSedeFiltro(e.target.value)}
            className="rounded-lg bg-surface border border-white/10 px-3 py-2 text-sm sm:w-56"
          >
            <option value="">Todas las sedes</option>
            {sedes?.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

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
        {/* Tabla en escritorio */}
        <div className="hidden md:block bg-surface rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Membresía</th>
                <th className="text-left px-4 py-3">Vence</th>
                <th className="text-left px-4 py-3">Registrado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    {cliente.nombre} {cliente.apellido}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeMembresia estado={cliente.membresiaEstado} />
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {cliente.membresiaFechaFin
                      ? new Date(cliente.membresiaFechaFin).toLocaleDateString("es-PE")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(cliente.created_at).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => abrirEdicion(cliente)}
                      aria-label="Editar cliente"
                      className="p-1.5 rounded-md text-white/60 hover:bg-white/5 hover:text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards en móvil/tablet angosto */}
        <div className="md:hidden space-y-3">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-surface rounded-xl p-4 border border-white/10 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserRound className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {cliente.nombre} {cliente.apellido}
                    </p>
                    <p className="text-muted text-xs">
                      Registrado{" "}
                      {new Date(cliente.created_at).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => abrirEdicion(cliente)}
                  aria-label="Editar cliente"
                  className="p-1.5 rounded-md text-white/60 hover:bg-white/5 hover:text-primary transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <BadgeMembresia estado={cliente.membresiaEstado} />
                {cliente.membresiaFechaFin && (
                  <span className="text-muted">
                    Vence{" "}
                    {new Date(cliente.membresiaFechaFin).toLocaleDateString("es-PE")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </AsyncState>

      <Modal
        isOpen={!!clienteEditando}
        onClose={() => setClienteEditando(null)}
        title="Editar cliente"
      >
        <form
          onSubmit={handleSubmit((values) => editarMutacion.mutate(values))}
          className="space-y-4"
        >
          <div>
            <label htmlFor="nombre" className="block text-sm mb-1">
              Nombre
            </label>
            <input
              id="nombre"
              {...register("nombre")}
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.nombre && (
              <p className="text-red-400 text-xs mt-1">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="apellido" className="block text-sm mb-1">
              Apellido
            </label>
            <input
              id="apellido"
              {...register("apellido")}
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.apellido && (
              <p className="text-red-400 text-xs mt-1">{errors.apellido.message}</p>
            )}
          </div>

          {editarMutacion.isError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              No se pudo guardar el cambio. Intenta de nuevo.
            </div>
          )}

          <button
            type="submit"
            disabled={editarMutacion.isPending}
            className="w-full bg-primary text-background font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
          >
            {editarMutacion.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </Modal>
    </div>
  );
}