import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { BadgeEstadoMembresia } from "@/components/ui/BadgeEstadoMembresia";
import { obtenerSedesActivas } from "@/services/sedesService";
import { obtenerClientes } from "@/services/clientesService";

// Vista de solo lectura para recepción: solo sirve para verificar el
// estado de la membresía de un cliente (ej. alguien llama a preguntar
// "¿mi membresía sigue activa?"). No incluye edición, eso es exclusivo
// de admin_sede/super_admin en /admin/clientes.
export default function BuscarCliente() {
  const { sesion } = useAuth();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeFiltro, setSedeFiltro] = useState<string>(sesion?.sedeId ?? "");
  const [busqueda, setBusqueda] = useState("");

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
    queryKey: ["recepcion-buscar-cliente", sedeActivaId],
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

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Buscar cliente</h1>
        <p className="text-muted text-sm">
          Verifica el estado de la membresía de un cliente
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
            autoFocus
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
        <div className="space-y-3">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-surface rounded-xl p-4 border border-white/10 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserRound className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {cliente.nombre} {cliente.apellido}
                  </p>
                  {cliente.membresiaFechaFin && (
                    <p className="text-muted text-xs">
                      Vence{" "}
                      {new Date(cliente.membresiaFechaFin).toLocaleDateString("es-PE")}
                    </p>
                  )}
                </div>
              </div>
              <BadgeEstadoMembresia estado={cliente.membresiaEstado} />
            </div>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
