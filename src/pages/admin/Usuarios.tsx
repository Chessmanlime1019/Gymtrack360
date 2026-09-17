import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, UserCog } from "lucide-react";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import {
  obtenerTodosLosUsuarios,
  actualizarUsuario,
  type UsuarioCompleto,
} from "@/services/usuariosService";
import { obtenerTodasLasSedes } from "@/services/sedesService";
import { usuarioSchema, type UsuarioFormValues } from "@/schemas/usuarioSchemas";
import { ETIQUETA_ROL } from "@/lib/navConfig";
import type { UserRole } from "@/types";

const ROLES: UserRole[] = [
  "super_admin",
  "admin_sede",
  "recepcionista",
  "profesional",
  "cliente",
];

const ESTILO_ROL: Record<UserRole, string> = {
  super_admin: "bg-primary/10 text-primary",
  admin_sede: "bg-blue-500/10 text-blue-400",
  recepcionista: "bg-purple-500/10 text-purple-400",
  profesional: "bg-teal-500/10 text-teal-400",
  cliente: "bg-muted/10 text-muted",
};

export default function AdminUsuarios() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>("");
  const [filtroSede, setFiltroSede] = useState<string>("");
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioCompleto | null>(null);

  const {
    data: usuarios,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: obtenerTodosLosUsuarios,
  });

  const { data: sedes } = useQuery({
    queryKey: ["sedes-todas-usuarios"],
    queryFn: obtenerTodasLasSedes,
  });

  const usuariosFiltrados = useMemo(() => {
    if (!usuarios) return [];
    return usuarios.filter((u) => {
      const coincideNombre = `${u.nombre} ${u.apellido}`
        .toLowerCase()
        .includes(busqueda.trim().toLowerCase());
      const coincideRol = !filtroRol || u.role === filtroRol;
      const coincideSede = !filtroSede || u.sede_id === filtroSede;
      return coincideNombre && coincideRol && coincideSede;
    });
  }, [usuarios, busqueda, filtroRol, filtroSede]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
  });

  const rolSeleccionado = watch("role");

  const guardarMutacion = useMutation({
    mutationFn: (values: UsuarioFormValues) =>
      actualizarUsuario(usuarioEditando!.id, {
        nombre: values.nombre,
        apellido: values.apellido,
        role: values.role,
        sedeId: values.role === "super_admin" ? null : values.sedeId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      setUsuarioEditando(null);
    },
  });

  function abrirEdicion(usuario: UsuarioCompleto) {
    setUsuarioEditando(usuario);
    reset({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      role: usuario.role,
      sedeId: usuario.sede_id ?? "",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink">Usuarios</h1>
        <p className="text-muted text-sm">
          Gestiona todos los usuarios del sistema: staff y clientes de cualquier sede
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre..."
          className="flex-1 rounded-lg bg-surface border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="rounded-lg bg-surface border border-line px-3 py-2 text-sm text-ink sm:w-48"
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>
        <select
          value={filtroSede}
          onChange={(e) => setFiltroSede(e.target.value)}
          className="rounded-lg bg-surface border border-line px-3 py-2 text-sm text-ink sm:w-56"
        >
          <option value="">Todas las sedes</option>
          {sedes?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <AsyncState
        isLoading={isLoading}
        isError={isError}
        isEmpty={usuariosFiltrados.length === 0}
        emptyMessage="No se encontraron usuarios con esos filtros."
        errorMessage="No se pudo cargar la lista de usuarios."
      >
        <div className="hidden md:block bg-surface rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/20 text-muted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Sede</th>
                <th className="text-left px-4 py-3">Registrado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3 text-ink">
                    {u.nombre} {u.apellido}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${ESTILO_ROL[u.role]}`}
                    >
                      {ETIQUETA_ROL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.sedeNombre ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(u.created_at).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => abrirEdicion(u)}
                      aria-label="Editar usuario"
                      className="p-1.5 rounded-md text-muted hover:bg-white/5 hover:text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {usuariosFiltrados.map((u) => (
            <div
              key={u.id}
              className="bg-surface rounded-xl p-4 border border-line space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCog className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-ink">
                      {u.nombre} {u.apellido}
                    </p>
                    <p className="text-muted text-xs">{u.sedeNombre ?? "Sin sede"}</p>
                  </div>
                </div>
                <button
                  onClick={() => abrirEdicion(u)}
                  aria-label="Editar usuario"
                  className="p-1.5 rounded-md text-muted hover:bg-white/5 hover:text-primary transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <div className="pt-2 border-t border-line">
                <span className={`text-xs px-2 py-0.5 rounded-full ${ESTILO_ROL[u.role]}`}>
                  {ETIQUETA_ROL[u.role]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </AsyncState>

      <Modal
        isOpen={!!usuarioEditando}
        onClose={() => setUsuarioEditando(null)}
        title="Editar usuario"
      >
        <form
          onSubmit={handleSubmit((values) => guardarMutacion.mutate(values))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
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
                <p className="text-red-400 text-xs mt-1">{errors.nombre.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="apellido" className="block text-sm mb-1 text-ink">
                Apellido
              </label>
              <input
                id="apellido"
                {...register("apellido")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.apellido && (
                <p className="text-red-400 text-xs mt-1">{errors.apellido.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm mb-1 text-ink">
              Rol
            </label>
            <select
              id="role"
              {...register("role")}
              className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA_ROL[r]}
                </option>
              ))}
            </select>
          </div>

          {rolSeleccionado !== "super_admin" ? (
            <div>
              <label htmlFor="sedeId" className="block text-sm mb-1 text-ink">
                Sede
              </label>
              <select
                id="sedeId"
                {...register("sedeId")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink"
              >
                <option value="">Sin sede asignada</option>
                {sedes?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-muted text-xs">
              Los super_admin no están ligados a ninguna sede (acceso global).
            </p>
          )}

          {guardarMutacion.isError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              No se pudo guardar el cambio. Intenta de nuevo.
            </div>
          )}

          <button
            type="submit"
            disabled={guardarMutacion.isPending}
            className="w-full bg-primary text-white font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
          >
            {guardarMutacion.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </Modal>
    </div>
  );
}