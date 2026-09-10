import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Building2 } from "lucide-react";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import {
  obtenerTodasLasSedes,
  crearSede,
  actualizarSede,
  alternarActivaSede,
  type SedeCompleta,
} from "@/services/sedesService";
import { sedeSchema, type SedeFormValues } from "@/schemas/sedeSchemas";

export default function AdminSedes() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [sedeEditando, setSedeEditando] = useState<SedeCompleta | null>(null);

  const {
    data: sedes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-sedes"],
    queryFn: obtenerTodasLasSedes,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SedeFormValues>({
    resolver: zodResolver(sedeSchema),
  });

  const guardarMutacion = useMutation({
    mutationFn: (values: SedeFormValues) =>
      sedeEditando ? actualizarSede(sedeEditando.id, values) : crearSede(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sedes"] });
      queryClient.invalidateQueries({ queryKey: ["sedes-activas"] });
      cerrarModal();
    },
  });

  const alternarMutacion = useMutation({
    mutationFn: (sede: SedeCompleta) => alternarActivaSede(sede.id, !sede.activa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sedes"] });
      queryClient.invalidateQueries({ queryKey: ["sedes-activas"] });
    },
  });

  function abrirNueva() {
    setSedeEditando(null);
    reset({ nombre: "", direccion: "" });
    setModalAbierto(true);
  }

  function abrirEdicion(sede: SedeCompleta) {
    setSedeEditando(sede);
    reset({ nombre: sede.nombre, direccion: sede.direccion ?? "" });
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setSedeEditando(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Sedes</h1>
          <p className="text-muted text-sm">Gestiona las sedes de Cascada Gym</p>
        </div>
        <button
          onClick={abrirNueva}
          className="shrink-0 bg-primary text-white font-semibold rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva</span>
        </button>
      </div>

      <AsyncState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!sedes || sedes.length === 0}
        emptyMessage="Todavía no hay sedes creadas."
        errorMessage="No se pudo cargar la lista de sedes."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sedes?.map((sede) => (
            <div
              key={sede.id}
              className="bg-surface rounded-xl p-4 border border-line space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{sede.nombre}</p>
                    <p className="text-muted text-xs truncate">
                      {sede.direccion ?? "Sin dirección"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => abrirEdicion(sede)}
                  aria-label="Editar sede"
                  className="shrink-0 p-1.5 rounded-md text-muted hover:bg-black/5 hover:text-primary transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => alternarMutacion.mutate(sede)}
                disabled={alternarMutacion.isPending}
                className={`text-xs px-2 py-1 rounded-full ${
                  sede.activa
                    ? "bg-green-600/10 text-green-600"
                    : "bg-muted/10 text-muted"
                }`}
              >
                {sede.activa ? "Activa" : "Inactiva"}
              </button>
            </div>
          ))}
        </div>
      </AsyncState>

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title={sedeEditando ? "Editar sede" : "Nueva sede"}
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

          <div>
            <label htmlFor="direccion" className="block text-sm mb-1">
              Dirección
            </label>
            <input
              id="direccion"
              {...register("direccion")}
              className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.direccion && (
              <p className="text-red-600 text-xs mt-1">{errors.direccion.message}</p>
            )}
          </div>

          {guardarMutacion.isError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
              No se pudo guardar la sede. Intenta de nuevo.
            </div>
          )}

          <button
            type="submit"
            disabled={guardarMutacion.isPending}
            className="w-full bg-primary text-white font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
          >
            {guardarMutacion.isPending ? "Guardando..." : "Guardar sede"}
          </button>
        </form>
      </Modal>
    </div>
  );
}