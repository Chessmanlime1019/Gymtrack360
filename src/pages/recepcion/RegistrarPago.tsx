import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserRound, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerSedesActivas } from "@/services/sedesService";
import { obtenerClientesSimple, type ClienteMini } from "@/services/clientesService";
import {
  obtenerMembresiaVigenteCliente,
  type MembresiaVigente,
} from "@/services/membresiasService";
import {
  registrarPago,
  obtenerPagosRecientesCliente,
} from "@/services/pagosService";
import {
  registrarPagoSchema,
  METODOS_PAGO,
  type RegistrarPagoValues,
} from "@/schemas/pagoSchemas";

export default function RegistrarPago() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const esSuperAdmin = sesion?.role === "super_admin";

  // super_admin no tiene sede propia: igual que en Control de Acceso,
  // elige con qué sede está operando antes de poder buscar clientes
  // (el pago se registra contra esa sede).
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>(
    sesion?.sedeId ?? ""
  );
  const sedeActivaId = esSuperAdmin ? sedeSeleccionada : sesion?.sedeId ?? "";

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteMini | null>(
    null
  );
  const [pagoConfirmado, setPagoConfirmado] = useState(false);

  const { data: clientes, isLoading: cargandoClientes } = useQuery({
    queryKey: ["recepcion-clientes-simple", sedeActivaId],
    queryFn: () => obtenerClientesSimple(sedeActivaId || null),
    enabled: !!sedeActivaId && !clienteSeleccionado,
  });

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return [];
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return [];
    return clientes
      .filter((c) => `${c.nombre} ${c.apellido}`.toLowerCase().includes(termino))
      .slice(0, 8);
  }, [clientes, busqueda]);

  const {
    data: membresiaVigente,
    isLoading: cargandoMembresia,
    isError: errorMembresia,
  } = useQuery<MembresiaVigente | null>({
    queryKey: ["membresia-vigente", clienteSeleccionado?.id],
    queryFn: () => obtenerMembresiaVigenteCliente(clienteSeleccionado!.id),
    enabled: !!clienteSeleccionado,
  });

  const { data: pagosRecientes } = useQuery({
    queryKey: ["pagos-recientes", clienteSeleccionado?.id],
    queryFn: () => obtenerPagosRecientesCliente(clienteSeleccionado!.id),
    enabled: !!clienteSeleccionado,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegistrarPagoValues>({
    resolver: zodResolver(registrarPagoSchema),
  });

  const mutacion = useMutation({
    mutationFn: (values: RegistrarPagoValues) =>
      registrarPago({
        clienteId: clienteSeleccionado!.id,
        membresiaId: membresiaVigente!.id,
        sedeId: sedeActivaId,
        monto: values.monto,
        metodoPago: values.metodoPago,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pagos-recientes", clienteSeleccionado?.id],
      });
      setPagoConfirmado(true);
      reset();
      setTimeout(() => {
        setPagoConfirmado(false);
        setClienteSeleccionado(null);
        setBusqueda("");
      }, 2000);
    },
  });

  function seleccionarCliente(cliente: ClienteMini) {
    setClienteSeleccionado(cliente);
    setBusqueda("");
    reset({ monto: undefined, metodoPago: undefined });
  }

  function limpiarSeleccion() {
    setClienteSeleccionado(null);
    setPagoConfirmado(false);
    reset();
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Registrar pago</h1>
        <p className="text-muted text-sm">
          Confirma un pago hecho en efectivo, Yape, Plin o transferencia
        </p>
      </div>

      {esSuperAdmin && (
        <div>
          <label htmlFor="sede" className="block text-sm mb-1">
            Sede actual (modo super admin)
          </label>
          <select
            id="sede"
            value={sedeSeleccionada}
            onChange={(e) => {
              setSedeSeleccionada(e.target.value);
              limpiarSeleccion();
            }}
            className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Selecciona una sede
            </option>
            {sedes?.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {!sedeActivaId ? (
        <div className="bg-surface rounded-xl p-6 text-center text-muted text-sm border border-white/10">
          Selecciona una sede para buscar clientes.
        </div>
      ) : !clienteSeleccionado ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente por nombre..."
              autoFocus
              className="w-full rounded-lg bg-surface border border-white/10 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {cargandoClientes && busqueda.trim() && (
            <p className="text-muted text-xs text-center py-2">Buscando...</p>
          )}

          {busqueda.trim() && !cargandoClientes && (
            <div className="space-y-2">
              {clientesFiltrados.length === 0 ? (
                <p className="text-muted text-xs text-center py-2">
                  No se encontraron clientes con ese nombre.
                </p>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => seleccionarCliente(cliente)}
                    className="w-full flex items-center gap-3 bg-surface rounded-xl p-3 border border-white/10 text-left hover:border-primary/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserRound className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">
                      {cliente.nombre} {cliente.apellido}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-surface rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserRound className="w-4 h-4 text-primary" />
              </div>
              <p className="font-medium text-sm">
                {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
              </p>
            </div>
            <button
              onClick={limpiarSeleccion}
              aria-label="Cambiar cliente"
              className="p-1.5 rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {pagoConfirmado ? (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <p className="font-semibold text-sm">Pago registrado</p>
            </div>
          ) : (
            <AsyncState
              isLoading={cargandoMembresia}
              isError={errorMembresia}
              errorMessage="No se pudo verificar la membresía de este cliente."
            >
              {!membresiaVigente ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm rounded-xl p-4">
                  Este cliente no tiene una membresía activa y vigente. No se
                  puede registrar un pago hasta que un admin le asigne un plan.
                </div>
              ) : (
                <>
                  <div className="bg-surface rounded-xl p-4 border border-white/10 text-sm space-y-1">
                    <p>
                      Plan vigente:{" "}
                      <span className="font-medium">{membresiaVigente.planNombre}</span>
                    </p>
                    <p className="text-muted text-xs">
                      Vence{" "}
                      {new Date(membresiaVigente.fechaFin).toLocaleDateString("es-PE")}
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit((values) => mutacion.mutate(values))}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="monto" className="block text-sm mb-1">
                        Monto (S/)
                      </label>
                      <input
                        id="monto"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={membresiaVigente.planPrecio}
                        {...register("monto")}
                        className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.monto && (
                        <p className="text-red-400 text-xs mt-1">
                          {errors.monto.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="metodoPago" className="block text-sm mb-1">
                        Método de pago
                      </label>
                      <select
                        id="metodoPago"
                        defaultValue=""
                        {...register("metodoPago")}
                        className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="" disabled>
                          Selecciona un método
                        </option>
                        {METODOS_PAGO.map((metodo) => (
                          <option key={metodo} value={metodo}>
                            {metodo}
                          </option>
                        ))}
                      </select>
                      {errors.metodoPago && (
                        <p className="text-red-400 text-xs mt-1">
                          {errors.metodoPago.message}
                        </p>
                      )}
                    </div>

                    {mutacion.isError && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                        No se pudo registrar el pago. Intenta de nuevo.
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={mutacion.isPending}
                      className="w-full bg-primary text-background font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
                    >
                      {mutacion.isPending ? "Registrando..." : "Registrar pago"}
                    </button>
                  </form>
                </>
              )}

              {pagosRecientes && pagosRecientes.length > 0 && (
                <div className="pt-2">
                  <h2 className="text-xs font-semibold text-muted mb-2">
                    Pagos recientes
                  </h2>
                  <ul className="space-y-1.5">
                    {pagosRecientes.map((pago) => (
                      <li
                        key={pago.id}
                        className="flex items-center justify-between text-xs bg-surface rounded-lg px-3 py-2 border border-white/10"
                      >
                        <span>{pago.metodo_pago}</span>
                        <span className="text-muted">
                          S/ {pago.monto.toFixed(2)} ·{" "}
                          {new Date(pago.fecha).toLocaleDateString("es-PE")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AsyncState>
          )}
        </div>
      )}
    </div>
  );
}
