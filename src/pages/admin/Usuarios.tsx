import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Building2, Pencil, Plus, Search, UserCog } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import {
  obtenerTodosLosUsuarios,
  actualizarUsuario,
  alternarActivoUsuario,
  crearUsuario,
  type UsuarioCompleto,
} from "@/services/usuariosService";
import { obtenerTodasLasSedes, type SedeCompleta } from "@/services/sedesService";
import {
  usuarioSchema,
  type UsuarioFormValues,
  nuevoUsuarioSchema,
  type NuevoUsuarioFormValues,
} from "@/schemas/usuarioSchemas";
import { ETIQUETA_ROL } from "@/lib/navConfig";
import type { UserRole } from "@/types";

// Super Admin es único y no se crea ni se asigna desde aquí: no aparece
// en el filtro de arriba ni en los selects de "Nuevo usuario" / "Editar".
const ROLES_ASIGNABLES: UserRole[] = [
  "admin_sede",
  "recepcionista",
  "profesional",
  "cliente",
];

// Admin de Sede solo gestiona su propio staff: recepción y profesionales.
// No puede crear/ver otro admin_sede (ya tiene el suyo) ni clientes (eso
// es trabajo de la pantalla Clientes).
const ROLES_STAFF_SEDE: UserRole[] = ["recepcionista", "profesional"];

const ESTILO_ROL: Record<UserRole, string> = {
  super_admin: "bg-primary/10 text-primary",
  admin_sede: "bg-info/10 text-info",
  recepcionista: "bg-purple-500/10 text-purple-400",
  profesional: "bg-teal-500/10 text-teal-400",
  cliente: "bg-muted/10 text-muted",
};

export default function AdminUsuarios() {
  const { sesion } = useAuth();
  const esSuperAdmin = sesion?.role === "super_admin";
  const esAdminSede = sesion?.role === "admin_sede";
  // Qué roles puede asignar/filtrar quien está viendo la pantalla.
  const rolesDisponibles = esAdminSede ? ROLES_STAFF_SEDE : ROLES_ASIGNABLES;

  const queryClient = useQueryClient();

  // Admin de Sede no elige sede: siempre es la suya, fija.
  const [sedeActiva, setSedeActiva] = useState<string | null>(
    esSuperAdmin ? null : (sesion?.sedeId ?? null)
  );
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>(rolesDisponibles[0]);

  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioCompleto | null>(null);
  const [usuarioCambiandoEstado, setUsuarioCambiandoEstado] =
    useState<UsuarioCompleto | null>(null);
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(
    null
  );
  const mostrarMensaje = (tipo: "ok" | "error", texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

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

  // Por defecto se muestra la primera sede en cuanto cargan.
  useEffect(() => {
    if (!sedeActiva && sedes && sedes.length > 0) {
      setSedeActiva(sedes[0].id);
    }
  }, [sedes, sedeActiva]);

  const cantidadPorSede = useMemo(() => {
    const mapa = new Map<string, number>();
    usuarios?.forEach((u) => {
      if (!u.sede_id) return;
      mapa.set(u.sede_id, (mapa.get(u.sede_id) ?? 0) + 1);
    });
    return mapa;
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    if (!usuarios || !sedeActiva) return [];
    return usuarios.filter((u) => {
      const coincideSede = u.sede_id === sedeActiva;
      // Admin de Sede solo ve recepción/profesional -- nunca a sí mismo
      // (admin_sede) ni a los clientes de su sede (esos van en Clientes).
      const coincideAlcanceRol = esSuperAdmin || ROLES_STAFF_SEDE.includes(u.role);
      const coincideNombre = `${u.nombre} ${u.apellido}`
        .toLowerCase()
        .includes(busqueda.trim().toLowerCase());
      const coincideRol = !filtroRol || u.role === filtroRol;
      return coincideSede && coincideAlcanceRol && coincideNombre && coincideRol;
    });
  }, [usuarios, sedeActiva, busqueda, filtroRol, esSuperAdmin]);

  const sedeSeleccionada = sedes?.find((s) => s.id === sedeActiva) ?? null;

  // ---------------- Editar ----------------
  const formEdicion = useForm<UsuarioFormValues>({ resolver: zodResolver(usuarioSchema) });

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
      mostrarMensaje("ok", "Usuario actualizado correctamente.");
    },
    onError: () => mostrarMensaje("error", "No se pudo guardar el cambio."),
  });

  function abrirEdicion(usuario: UsuarioCompleto) {
    setUsuarioEditando(usuario);
    formEdicion.reset({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      role: usuario.role,
      sedeId: usuario.sede_id ?? "",
    });
  }


  // ---------------- Activar / desactivar ----------------
  const activoMutacion = useMutation({
    mutationFn: (u: UsuarioCompleto) => alternarActivoUsuario(u.id, !u.activo),
    onSuccess: (_d, u) => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      mostrarMensaje("ok", u.activo ? "Usuario desactivado." : "Usuario activado.");
      setUsuarioCambiandoEstado(null);
    },
    onError: () => mostrarMensaje("error", "No se pudo cambiar el estado."),
  });

  // ---------------- Crear ----------------
  const formCreacion = useForm<NuevoUsuarioFormValues>({
    resolver: zodResolver(nuevoUsuarioSchema),
    defaultValues: { role: "recepcionista", sedeId: sedeActiva ?? "" },
  });
  const crearMutacion = useMutation({
    mutationFn: (values: NuevoUsuarioFormValues) =>
      crearUsuario({
        nombre: values.nombre,
        apellido: values.apellido,
        email: values.email,
        password: values.password,
        role: values.role,
        sedeId: values.role === "super_admin" ? null : values.sedeId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      setCreandoUsuario(false);
      mostrarMensaje("ok", "Usuario creado correctamente.");
    },
    onError: (err: Error) => mostrarMensaje("error", err.message),
  });

  function abrirCreacion() {
    formCreacion.reset({
      nombre: "",
      apellido: "",
      email: "",
      password: "",
      role: "recepcionista",
      // Admin de Sede siempre crea para su propia sede, sin importar
      // nada más (la Edge Function además lo exige del lado servidor).
      sedeId: esAdminSede ? (sesion?.sedeId ?? "") : (sedeActiva ?? ""),
    });
    setCreandoUsuario(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink">Usuarios</h1>
          <p className="text-muted text-sm">
            {esSuperAdmin ? "Gestiona el staff de cada sede" : "Gestiona el staff de tu sede"}
          </p>
        </div>

        <button
          onClick={abrirCreacion}
          className="inline-flex items-center justify-center gap-2 bg-primary text-ink font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-primary-dark transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {mensaje && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${
            mensaje.tipo === "ok"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-5 ${esSuperAdmin ? "lg:grid-cols-[240px_1fr]" : ""}`}
      >
        {/* ================= SEDES (solo Super Admin elige) ================= */}
        {esSuperAdmin && (
          <div className="bg-surface rounded-xl border border-line overflow-hidden lg:sticky lg:top-4 lg:self-start">
            <div className="px-4 py-3 border-b border-line">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Sedes
              </p>
            </div>

            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible">
              {sedes?.map((s) => (
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
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      sedeActiva === s.id ? "bg-white/15" : "bg-white/5 text-muted"
                    }`}
                  >
                    {cantidadPorSede.get(s.id) ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================= TABLA DE LA SEDE ELEGIDA ================= */}
        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full rounded-lg bg-surface border border-line pl-9 pr-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="rounded-lg bg-surface border border-line px-3 py-2 text-sm text-ink sm:w-48"
            >
              {rolesDisponibles.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA_ROL[r]}
                </option>
              ))}
            </select>
          </div>

          <AsyncState
            isLoading={isLoading}
            isError={isError}
            isEmpty={usuariosFiltrados.length === 0}
            emptyMessage={`No hay usuarios en ${sedeSeleccionada?.nombre ?? "esta sede"} con esos filtros.`}
            errorMessage="No se pudo cargar la lista de usuarios."
          >
            {/* ---------- Tabla (escritorio) ---------- */}
            <div className="hidden md:block bg-surface rounded-xl border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-black/20 text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold">Rol</th>
                    <th className="text-left px-4 py-3 font-semibold">Registrado</th>
                    <th className="text-left px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id} className={`border-t border-line ${!u.activo ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3 text-ink font-medium">
                        {u.nombre} {u.apellido}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTILO_ROL[u.role]}`}>
                          {ETIQUETA_ROL[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">
                        {new Date(u.created_at).toLocaleDateString("es-PE")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            u.activo ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEdicion(u)}
                            aria-label="Editar usuario"
                            className="p-1.5 rounded-md text-muted hover:bg-white/5 hover:text-primary transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setUsuarioCambiandoEstado(u)}
                            aria-label={u.activo ? "Desactivar usuario" : "Activar usuario"}
                            className="p-1.5 rounded-md text-muted hover:bg-danger/10 hover:text-danger transition-colors"
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

            {/* ---------- Tarjetas (móvil) ---------- */}
            <div className="md:hidden space-y-3">
              {usuariosFiltrados.map((u) => (
                <div
                  key={u.id}
                  className={`bg-surface rounded-xl p-4 border border-line space-y-3 ${
                    !u.activo ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <UserCog className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-ink truncate">
                          {u.nombre} {u.apellido}
                        </p>
                        <p className="text-muted text-xs truncate">
                          {new Date(u.created_at).toLocaleDateString("es-PE")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => abrirEdicion(u)}
                        aria-label="Editar usuario"
                        className="p-1.5 rounded-md text-muted hover:bg-white/5 hover:text-primary transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setUsuarioCambiandoEstado(u)}
                        aria-label={u.activo ? "Desactivar usuario" : "Activar usuario"}
                        className="p-1.5 rounded-md text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTILO_ROL[u.role]}`}>
                      {ETIQUETA_ROL[u.role]}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        u.activo ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                      }`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AsyncState>
        </div>
      </div>

      {/* ================= MODAL: editar ================= */}
      <Modal
        isOpen={!!usuarioEditando}
        onClose={() => setUsuarioEditando(null)}
        title="Editar usuario"
      >
        <form
          onSubmit={formEdicion.handleSubmit((v) => guardarMutacion.mutate(v))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1 text-ink">Nombre</label>
              <input
                {...formEdicion.register("nombre")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {formEdicion.formState.errors.nombre && (
                <p className="text-danger text-xs mt-1">
                  {formEdicion.formState.errors.nombre.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1 text-ink">Apellido</label>
              <input
                {...formEdicion.register("apellido")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {formEdicion.formState.errors.apellido && (
                <p className="text-danger text-xs mt-1">
                  {formEdicion.formState.errors.apellido.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1 text-ink">Rol</label>
            <select
              {...formEdicion.register("role")}
              className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink"
            >
              {rolesDisponibles.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA_ROL[r]}
                </option>
              ))}
            </select>
          </div>

          {esSuperAdmin ? (
            <div>
              <label className="block text-sm mb-1 text-ink">Sede</label>
              <select
                {...formEdicion.register("sedeId")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink"
              >
                <option value="">Selecciona una sede</option>
                {sedes?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              {formEdicion.formState.errors.sedeId && (
                <p className="text-danger text-xs mt-1">
                  {formEdicion.formState.errors.sedeId.message}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted text-xs">Pertenece a tu sede.</p>
          )}

          {guardarMutacion.isError && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">
              No se pudo guardar el cambio. Intenta de nuevo.
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setUsuarioEditando(null)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardarMutacion.isPending}
              className="bg-primary text-ink font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {guardarMutacion.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: activar / desactivar ================= */}
      <Modal
        isOpen={!!usuarioCambiandoEstado}
        onClose={() => setUsuarioCambiandoEstado(null)}
        title={usuarioCambiandoEstado?.activo ? "Desactivar usuario" : "Activar usuario"}
      >
        {usuarioCambiandoEstado && (
          <div className="space-y-5">
            <p className="text-sm text-ink-2">
              {usuarioCambiandoEstado.activo ? (
                <>
                  ¿Seguro que deseas desactivar a{" "}
                  <span className="text-ink font-semibold">
                    {usuarioCambiandoEstado.nombre} {usuarioCambiandoEstado.apellido}
                  </span>
                  ? No podrá iniciar sesión hasta que lo actives de nuevo.
                </>
              ) : (
                <>
                  ¿Deseas volver a activar a{" "}
                  <span className="text-ink font-semibold">
                    {usuarioCambiandoEstado.nombre} {usuarioCambiandoEstado.apellido}
                  </span>
                  ?
                </>
              )}
            </p>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setUsuarioCambiandoEstado(null)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={activoMutacion.isPending}
                onClick={() => activoMutacion.mutate(usuarioCambiandoEstado)}
                className={`font-semibold rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 ${
                  usuarioCambiandoEstado.activo
                    ? "bg-danger hover:bg-danger/90"
                    : "bg-success hover:bg-success/90"
                }`}
              >
                {activoMutacion.isPending
                  ? "Guardando..."
                  : usuarioCambiandoEstado.activo
                    ? "Desactivar"
                    : "Activar"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: crear usuario ================= */}
      <Modal
        isOpen={creandoUsuario}
        onClose={() => setCreandoUsuario(false)}
        title="Nuevo usuario"
      >
        <form
          onSubmit={formCreacion.handleSubmit((v) => crearMutacion.mutate(v))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1 text-ink">Nombre</label>
              <input
                {...formCreacion.register("nombre")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {formCreacion.formState.errors.nombre && (
                <p className="text-danger text-xs mt-1">
                  {formCreacion.formState.errors.nombre.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1 text-ink">Apellido</label>
              <input
                {...formCreacion.register("apellido")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {formCreacion.formState.errors.apellido && (
                <p className="text-danger text-xs mt-1">
                  {formCreacion.formState.errors.apellido.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1 text-ink">Correo</label>
            <input
              type="email"
              {...formCreacion.register("email")}
              className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formCreacion.formState.errors.email && (
              <p className="text-danger text-xs mt-1">
                {formCreacion.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1 text-ink">Contraseña temporal</label>
            <input
              type="text"
              {...formCreacion.register("password")}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formCreacion.formState.errors.password && (
              <p className="text-danger text-xs mt-1">
                {formCreacion.formState.errors.password.message}
              </p>
            )}
            <p className="text-muted text-xs mt-1">
              Compártesela por un canal seguro; la persona podrá cambiarla luego.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1 text-ink">Rol</label>
              <select
                {...formCreacion.register("role")}
                className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink"
              >
                {rolesDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {ETIQUETA_ROL[r]}
                  </option>
                ))}
              </select>
            </div>

            {esSuperAdmin ? (
              <div>
                <label className="block text-sm mb-1 text-ink">Sede</label>
                <select
                  {...formCreacion.register("sedeId")}
                  className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm text-ink"
                >
                  <option value="">Selecciona una sede</option>
                  {sedes?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                {formCreacion.formState.errors.sedeId && (
                  <p className="text-danger text-xs mt-1">
                    {formCreacion.formState.errors.sedeId.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-end">
                <p className="text-muted text-xs pb-2">Se crea para tu sede.</p>
              </div>
            )}
          </div>

          {crearMutacion.isError && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">
              {(crearMutacion.error as Error).message}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setCreandoUsuario(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearMutacion.isPending}
              className="bg-primary text-ink font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {crearMutacion.isPending ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}