import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Search, UserRound } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { BadgeEstadoMembresia } from "@/components/ui/BadgeEstadoMembresia";
import { obtenerSedesActivas } from "@/services/sedesService";
import {
  obtenerClientes,
  actualizarCliente,
  type ClienteConMembresia,
} from "@/services/clientesService";
import { editarClienteSchema, type EditarClienteValues } from "@/schemas/clienteSchemas";

const ESTADOS_MEMBRESIA = [
  { value: "", label: "Todos los estados" },
  { value: "activa", label: "Activa" },
  { value: "vencida", label: "Vencida" },
  { value: "cancelada", label: "Cancelada" },
  { value: "sin_membresia", label: "Sin membresía" },
] as const;

// Mismo patrón que /admin/clientes (lista + panel editable): recepción
// ahora también puede corregir datos básicos del cliente, no solo
// consultar el estado de su membresía.
export default function BuscarCliente() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeFiltro, setSedeFiltro] = useState<string>(sesion?.sedeId ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [venceDesde, setVenceDesde] = useState("");
  const [venceHasta, setVenceHasta] = useState("");
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
  });

  const sedeActivaId = esSuperAdmin ? sedeFiltro || null : (sesion?.sedeId ?? null);

  const {
    data: clientes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["recepcion-buscar-cliente", sedeActivaId],
    queryFn: () => obtenerClientes(sedeActivaId),
  });

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return [];
    const termino = busqueda.trim().toLowerCase();

    return clientes.filter((c) => {
      const coincideNombre = `${c.nombre} ${c.apellido}`.toLowerCase().includes(termino);

      const coincideEstado =
        !filtroEstado ||
        (filtroEstado === "sin_membresia" ? !c.membresiaEstado : c.membresiaEstado === filtroEstado);

      const vence = c.membresiaFechaFin?.slice(0, 10);
      const coincideDesde = !venceDesde || (vence && vence >= venceDesde);
      const coincideHasta = !venceHasta || (vence && vence <= venceHasta);
      // Si se puso un rango de vencimiento, un cliente sin membresía no
      // puede "coincidir" (no tiene fecha que comparar).
      const coincideRangoFechas = !venceDesde && !venceHasta ? true : !!vence && coincideDesde && coincideHasta;

      return coincideNombre && coincideEstado && coincideRangoFechas;
    });
  }, [clientes, busqueda, filtroEstado, venceDesde, venceHasta]);

  // Selecciona el primero de la lista por defecto, y salta al primero
  // disponible si el seleccionado deja de estar en la lista filtrada.
  useEffect(() => {
    if (clientesFiltrados.length === 0) {
      setClienteSeleccionadoId(null);
      return;
    }
    const sigueEnLista = clientesFiltrados.some((c) => c.id === clienteSeleccionadoId);
    if (!sigueEnLista) {
      setClienteSeleccionadoId(clientesFiltrados[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientesFiltrados]);

  const clienteSeleccionado =
    clientesFiltrados.find((c) => c.id === clienteSeleccionadoId) ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditarClienteValues>({ resolver: zodResolver(editarClienteSchema) });

  const editarMutacion = useMutation({
    mutationFn: (values: EditarClienteValues) =>
      actualizarCliente(clienteSeleccionado!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recepcion-buscar-cliente"] });
      setEditando(false);
    },
  });

  function abrirEdicion(cliente: ClienteConMembresia) {
    reset({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      sedeId: cliente.sede_id ?? "",
    });
    setEditando(true);
  }

  function seleccionar(cliente: ClienteConMembresia) {
    setClienteSeleccionadoId(cliente.id);
    setEditando(false);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("");
    setVenceDesde("");
    setVenceHasta("");
  }

  const hayFiltrosActivos = !!(busqueda || filtroEstado || venceDesde || venceHasta);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink">Buscar cliente</h1>
        <p className="text-muted text-sm">
          Consulta y edita la información del cliente {esSuperAdmin ? "" : "de tu sede"}
        </p>
      </div>

      {/* ================= FILTROS ================= */}
      <div className="bg-surface rounded-xl border border-line p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre..."
              autoFocus
              className="w-full h-11 rounded-lg bg-background border border-line pl-9 pr-3 text-sm text-ink placeholder:text-muted outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
            />
          </div>

          {esSuperAdmin && (
            <select
              value={sedeFiltro}
              onChange={(e) => setSedeFiltro(e.target.value)}
              className="h-11 rounded-lg bg-background border border-line px-3 text-sm text-ink sm:w-52 outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
            >
              <option value="">Todas las sedes</option>
              {sedes?.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="h-11 rounded-lg bg-background border border-line px-3 text-sm text-ink sm:w-48 outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
          >
            {ESTADOS_MEMBRESIA.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted shrink-0" />
            <span className="text-muted text-xs whitespace-nowrap">Vence entre</span>
            <input
              type="date"
              value={venceDesde}
              onChange={(e) => setVenceDesde(e.target.value)}
              className="h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
            />
            <span className="text-muted text-xs">y</span>
            <input
              type="date"
              value={venceHasta}
              onChange={(e) => setVenceHasta(e.target.value)}
              className="h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
            />
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="text-xs text-primary hover:text-primary-dark font-medium sm:ml-auto text-left"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ================= LISTA + PANEL ================= */}
      <AsyncState
        isLoading={isLoading}
        isError={isError}
        isEmpty={clientesFiltrados.length === 0}
        emptyMessage={
          hayFiltrosActivos
            ? "No se encontraron clientes con esos filtros."
            : "Todavía no hay clientes registrados en esta sede."
        }
        errorMessage="No se pudo cargar la lista de clientes."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* ---------- LISTA (izquierda) ---------- */}
          <div className="space-y-3">
            {clientesFiltrados.map((cliente) => {
              const activo = cliente.id === clienteSeleccionadoId;
              return (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() => seleccionar(cliente)}
                  className={`w-full text-left bg-surface rounded-xl p-4 border transition-colors ${
                    activo
                      ? "border-primary/60 ring-1 ring-primary/30"
                      : "border-line hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                        <UserRound className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-ink font-medium truncate">
                          {cliente.nombre} {cliente.apellido}
                        </p>
                        <p className="text-muted text-xs truncate">
                          {cliente.membresiaFechaFin
                            ? `Vence ${new Date(cliente.membresiaFechaFin).toLocaleDateString("es-PE")}`
                            : (cliente.sedeNombre ?? "Sin sede")}
                        </p>
                      </div>
                    </div>
                    <BadgeEstadoMembresia estado={cliente.membresiaEstado} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* ---------- PANEL (derecha, fijo) ---------- */}
          <div className="lg:sticky lg:top-4">
            {!clienteSeleccionado ? (
              <div className="bg-surface rounded-xl border border-line p-6 text-center text-muted text-sm">
                Selecciona un cliente para ver su información.
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-line overflow-hidden">
                <div className="bg-primary px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-ink font-semibold">
                    {clienteSeleccionado.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-ink font-semibold truncate">
                      {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                    </p>
                    <p className="text-ink/80 text-xs truncate">
                      {clienteSeleccionado.sedeNombre ?? "Sin sede"}
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  {!editando ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                            Sede
                          </p>
                          <p className="text-ink text-sm font-medium">
                            {clienteSeleccionado.sedeNombre ?? "Sin sede"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                            Membresía
                          </p>
                          <BadgeEstadoMembresia estado={clienteSeleccionado.membresiaEstado} />
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                            Vence
                          </p>
                          <p className="text-ink text-sm font-medium">
                            {clienteSeleccionado.membresiaFechaFin
                              ? new Date(
                                  clienteSeleccionado.membresiaFechaFin
                                ).toLocaleDateString("es-PE")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                            Registrado
                          </p>
                          <p className="text-ink text-sm font-medium">
                            {new Date(clienteSeleccionado.created_at).toLocaleDateString(
                              "es-PE"
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => abrirEdicion(clienteSeleccionado)}
                        className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-primary text-ink font-semibold rounded-lg h-11 text-sm hover:bg-primary-dark transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar información
                      </button>
                    </>
                  ) : (
                    <form
                      onSubmit={handleSubmit((values) => editarMutacion.mutate(values))}
                      className="space-y-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Editar información
                      </p>

                      <div>
                        <label htmlFor="nombre" className="block text-sm mb-1 text-ink">
                          Nombre
                        </label>
                        <input
                          id="nombre"
                          {...register("nombre")}
                          className="w-full h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        {errors.nombre && (
                          <p className="text-danger text-xs mt-1">{errors.nombre.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="apellido" className="block text-sm mb-1 text-ink">
                          Apellido
                        </label>
                        <input
                          id="apellido"
                          {...register("apellido")}
                          className="w-full h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        {errors.apellido && (
                          <p className="text-danger text-xs mt-1">
                            {errors.apellido.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="sedeId" className="block text-sm mb-1 text-ink">
                          Sede
                        </label>
                        <select
                          id="sedeId"
                          {...register("sedeId")}
                          className="w-full h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
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

                      {editarMutacion.isError && (
                        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">
                          No se pudo guardar el cambio. Intenta de nuevo.
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={editarMutacion.isPending}
                          className="flex-1 h-11 bg-primary text-ink font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                          {editarMutacion.isPending ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(false)}
                          disabled={editarMutacion.isPending}
                          className="h-11 px-4 rounded-lg border border-line text-ink-2 text-sm hover:bg-white/5 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AsyncState>
    </div>
  );
}