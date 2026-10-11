import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Camera, ChevronRight, Dumbbell, KeyRound, MapPin, Pencil, QrCode, Target } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  obtenerMembresiaVigenteCliente,
  type MembresiaVigente,
} from "@/services/membresiasService";
import { obtenerRutinas } from "@/services/rutinasService";
import { subirAvatar } from "@/services/avatarService";
import {
  obtenerMiPerfil,
  obtenerMiSede,
  obtenerMisVisitas,
  actualizarMiPerfil,
  cambiarContrasena,
} from "@/services/perfilService";
import {
  perfilSchema,
  contrasenaSchema,
  type PerfilFormValues,
  type ContrasenaFormValues,
} from "@/schemas/perfilSchemas";

type Modo = "ver" | "editar" | "contrasena";

// Días de calendario que faltan hasta la fecha de vencimiento (0 = vence hoy).
function diasHasta(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin.slice(0, 10)}T00:00:00`);
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}

function estadoVigencia(dias: number) {
  if (dias <= 0) return { texto: "Vence hoy", clase: "bg-danger/10 text-danger" };
  if (dias <= 7) return { texto: "Por vencer", clase: "bg-warning/10 text-warning" };
  return { texto: "Activa", clase: "bg-success/10 text-success" };
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MiPerfil() {
  const queryClient = useQueryClient();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [modo, setModo] = useState<Modo>("ver");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function mostrarMensaje(tipo: "ok" | "error", texto: string) {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3500);
  }

  // ---------------- Datos ----------------
  const {
    data: perfil,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });

  const { data: sede } = useQuery({
    queryKey: ["mi-sede", perfil?.sede_id],
    queryFn: () => obtenerMiSede(perfil!.sede_id!),
    enabled: !!perfil?.sede_id,
  });

  const {
    data: membresia,
    isLoading: cargandoMembresia,
    isError: errorMembresia,
  } = useQuery<MembresiaVigente | null>({
    queryKey: ["mi-membresia-vigente", perfil?.id],
    queryFn: () => obtenerMembresiaVigenteCliente(perfil!.id),
    enabled: !!perfil,
  });

  const { data: visitas, isError: errorVisitas } = useQuery({
    queryKey: ["mis-visitas", perfil?.id],
    queryFn: () => obtenerMisVisitas(perfil!.id),
    enabled: !!perfil,
  });

  const { data: rutinas } = useQuery({
    queryKey: ["mis-rutinas", perfil?.id],
    queryFn: () => obtenerRutinas({ clienteId: perfil!.id }),
    enabled: !!perfil,
  });
  const rutinaActiva = (rutinas ?? []).find((r) => r.activa) ?? null;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const visitasDelMes = (visitas ?? []).filter((v) => new Date(v.fecha_hora) >= inicioMes).length;
  const ultimaVisita = visitas && visitas.length > 0 ? visitas[0] : null;

  // ---------------- Editar nombre y apellido ----------------
  const formPerfil = useForm<PerfilFormValues>({ resolver: zodResolver(perfilSchema) });

  const guardarMutacion = useMutation({
    mutationFn: (values: PerfilFormValues) => actualizarMiPerfil(perfil!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });
      setModo("ver");
      mostrarMensaje("ok", "Datos actualizados.");
    },
    onError: () => mostrarMensaje("error", "No se pudieron guardar los cambios."),
  });

  function abrirEdicion() {
    if (!perfil) return;
    formPerfil.reset({ nombre: perfil.nombre, apellido: perfil.apellido });
    setModo("editar");
  }

  // ---------------- Cambiar contraseña ----------------
  const formContrasena = useForm<ContrasenaFormValues>({
    resolver: zodResolver(contrasenaSchema),
  });

  const contrasenaMutacion = useMutation({
    mutationFn: (values: ContrasenaFormValues) => cambiarContrasena(values.nueva),
    onSuccess: () => {
      formContrasena.reset({ nueva: "", confirmar: "" });
      setModo("ver");
      mostrarMensaje("ok", "Contraseña actualizada.");
    },
    onError: (err: Error) =>
      mostrarMensaje("error", err.message || "No se pudo cambiar la contraseña."),
  });

  function abrirContrasena() {
    formContrasena.reset({ nueva: "", confirmar: "" });
    setModo("contrasena");
  }

  // ---------------- Foto ----------------
  const avatarMutacion = useMutation({
    mutationFn: (archivo: File) => subirAvatar(perfil!.id, archivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mi-perfil"] });
      mostrarMensaje("ok", "Foto actualizada.");
    },
    onError: () => mostrarMensaje("error", "No se pudo subir la foto."),
  });

  function alElegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      mostrarMensaje("error", "Elige un archivo de imagen.");
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      mostrarMensaje("error", "La foto no puede pesar más de 2 MB.");
      return;
    }
    avatarMutacion.mutate(archivo);
  }

  const dias = membresia ? diasHasta(membresia.fechaFin) : null;
  const vigencia = dias !== null ? estadoVigencia(dias) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink">
          {perfil ? `Hola, ${perfil.nombre}` : "Mi perfil"}
        </h1>
        <p className="text-muted text-sm mt-1">
          {sede ? `Tu resumen en ${sede.nombre}` : "Tu resumen en el gimnasio"}
        </p>
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

      <AsyncState
        isLoading={isLoading}
        isError={isError}
        errorMessage="No se pudo cargar tu perfil."
      >
        {perfil && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
            {/* ================= IZQUIERDA: lo más importante ================= */}
            <div className="space-y-5 min-w-0">
              {/* ---------- Mi membresía ---------- */}
              <div className="bg-surface rounded-xl border border-line overflow-hidden">
                <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Mi membresía</p>
                  <Link
                    to="/cliente/mi-membresia"
                    className="text-xs text-primary hover:text-primary-dark font-medium"
                  >
                    Ver detalle
                  </Link>
                </div>

                <div className="p-5">
                  {cargandoMembresia ? (
                    <p className="text-muted text-sm">Cargando tu membresía...</p>
                  ) : errorMembresia ? (
                    <p className="text-danger text-sm">No se pudo cargar tu membresía.</p>
                  ) : !membresia ? (
                    <div className="text-center py-3 space-y-1">
                      <p className="text-ink font-medium text-sm">
                        No tienes una membresía activa
                      </p>
                      <p className="text-muted text-xs">
                        Acércate a recepción {sede ? `de ${sede.nombre} ` : ""}para renovarla.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <p className="text-ink text-lg font-semibold truncate">
                          {membresia.planNombre}
                        </p>
                        <p className="text-muted text-xs">
                          Vence el{" "}
                          {new Date(`${membresia.fechaFin.slice(0, 10)}T00:00:00`).toLocaleDateString(
                            "es-PE",
                            { day: "numeric", month: "long", year: "numeric" }
                          )}
                        </p>
                        {vigencia && (
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded-full ${vigencia.clase}`}
                          >
                            {vigencia.texto}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="gt-kpi text-ink">{Math.max(dias ?? 0, 0)}</p>
                        <p className="text-muted text-xs mt-1">
                          {dias === 1 ? "día restante" : "días restantes"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ---------- Botón del QR ---------- */}
              <Link
                to="/cliente/mi-qr"
                className="w-full inline-flex items-center justify-center gap-3 bg-primary text-ink font-semibold rounded-xl h-14 text-base hover:bg-primary-dark transition-colors"
              >
                <QrCode className="w-5 h-5" />
                Mostrar mi QR para entrar
              </Link>

              {/* ---------- Mi rutina ---------- */}
              <Link
                to="/cliente/rutinas"
                className="block bg-surface rounded-xl border border-line hover:border-primary/60 transition-colors p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-muted text-xs font-medium">Mi rutina</p>
                    {rutinaActiva ? (
                      <>
                        <p className="text-ink font-semibold truncate">{rutinaActiva.nombre}</p>
                        <p className="text-muted text-xs mt-0.5 flex flex-wrap items-center gap-x-3">
                          {rutinaActiva.objetivo && (
                            <span className="inline-flex items-center gap-1">
                              <Target className="w-3 h-3" /> {rutinaActiva.objetivo}
                            </span>
                          )}
                          <span>
                            {rutinaActiva.totalDias} {rutinaActiva.totalDias === 1 ? "día" : "días"} ·{" "}
                            {rutinaActiva.ejercicios.length} ejercicios
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-ink text-sm font-medium">
                        Aún no tienes una rutina. Pídesela a tu profesional.
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted shrink-0" />
                </div>
              </Link>

              {/* ---------- Estadísticas ---------- */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl border border-line p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-muted text-xs font-medium">Visitas este mes</p>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-ink">
                    {errorVisitas ? "—" : visitasDelMes}
                  </p>
                </div>

                <div className="bg-surface rounded-xl border border-line p-5">
                  <p className="text-muted text-xs font-medium mb-3">Última visita</p>
                  <p className="text-ink text-sm font-semibold">
                    {errorVisitas
                      ? "—"
                      : ultimaVisita
                        ? formatFechaHora(ultimaVisita.fecha_hora)
                        : "Aún no registras visitas"}
                  </p>
                </div>
              </div>

              {/* ---------- Últimas visitas ---------- */}
              <div className="bg-surface rounded-xl border border-line overflow-hidden">
                <div className="px-5 py-4 border-b border-line">
                  <p className="text-sm font-semibold text-ink">Mis últimas visitas</p>
                </div>

                {!visitas || visitas.length === 0 ? (
                  <p className="text-muted text-sm text-center py-8">
                    Cuando entres al gimnasio, tus visitas aparecerán aquí.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-black/20 text-muted text-xs uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                        <th className="text-right px-5 py-3 font-semibold">Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitas.slice(0, 5).map((v) => (
                        <tr key={v.id} className="border-t border-line">
                          <td className="px-5 py-3 text-ink">
                            {new Date(v.fecha_hora).toLocaleDateString("es-PE", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="px-5 py-3 text-right text-muted text-xs">
                            {new Date(v.fecha_hora).toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ================= DERECHA: panel de perfil ================= */}
            <div className="lg:sticky lg:top-4">
              <div className="bg-surface rounded-xl border border-line overflow-hidden">
                {/* Cabecera con foto */}
                <div className="bg-primary px-5 py-5 flex items-center gap-4">
                  <div className="relative shrink-0">
                    {perfil.avatar_url ? (
                      <img
                        src={perfil.avatar_url}
                        alt="Tu foto de perfil"
                        className="w-16 h-16 rounded-full object-cover bg-white/15"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center text-ink text-2xl font-semibold">
                        {perfil.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => inputFotoRef.current?.click()}
                      disabled={avatarMutacion.isPending}
                      aria-label="Cambiar foto"
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border border-line flex items-center justify-center text-ink hover:bg-surface transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={inputFotoRef}
                      type="file"
                      accept="image/*"
                      onChange={alElegirFoto}
                      className="hidden"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-ink font-semibold truncate">
                      {perfil.nombre} {perfil.apellido}
                    </p>
                    <p className="text-ink/80 text-xs truncate">
                      Cliente{sede ? ` · ${sede.nombre}` : ""}
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  {modo === "ver" && (
                    <>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                            Correo
                          </p>
                          <p className="text-ink text-sm font-medium break-all">{perfil.email}</p>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                            Mi sede
                          </p>
                          <p className="text-ink text-sm font-medium">
                            {sede?.nombre ?? "Sin sede asignada"}
                          </p>
                          {sede?.direccion && (
                            <p className="text-muted text-xs mt-1 flex items-start gap-1">
                              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                              {sede.direccion}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
                            Miembro desde
                          </p>
                          <p className="text-ink text-sm font-medium">
                            {new Date(perfil.created_at).toLocaleDateString("es-PE", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-5">
                        <button
                          onClick={abrirEdicion}
                          className="inline-flex items-center justify-center gap-2 bg-primary text-ink font-semibold rounded-lg h-11 text-sm hover:bg-primary-dark transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar información
                        </button>
                        <button
                          onClick={abrirContrasena}
                          className="inline-flex items-center justify-center gap-2 rounded-lg h-11 text-sm border border-line text-ink-2 hover:bg-white/5 transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                          Cambiar contraseña
                        </button>
                      </div>
                    </>
                  )}

                  {modo === "editar" && (
                    <form
                      onSubmit={formPerfil.handleSubmit((v) => guardarMutacion.mutate(v))}
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
                          {...formPerfil.register("nombre")}
                          className="w-full h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        {formPerfil.formState.errors.nombre && (
                          <p className="text-danger text-xs mt-1">
                            {formPerfil.formState.errors.nombre.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="apellido" className="block text-sm mb-1 text-ink">
                          Apellido
                        </label>
                        <input
                          id="apellido"
                          {...formPerfil.register("apellido")}
                          className="w-full h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        {formPerfil.formState.errors.apellido && (
                          <p className="text-danger text-xs mt-1">
                            {formPerfil.formState.errors.apellido.message}
                          </p>
                        )}
                      </div>

                      <p className="text-muted text-xs">
                        Tu correo y tu sede los cambia recepción si lo necesitas.
                      </p>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={guardarMutacion.isPending}
                          className="flex-1 h-11 bg-primary text-ink font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                          {guardarMutacion.isPending ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setModo("ver")}
                          disabled={guardarMutacion.isPending}
                          className="h-11 px-4 rounded-lg border border-line text-ink-2 text-sm hover:bg-white/5 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {modo === "contrasena" && (
                    <form
                      onSubmit={formContrasena.handleSubmit((v) => contrasenaMutacion.mutate(v))}
                      className="space-y-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Cambiar contraseña
                      </p>

                      <div>
                        <label htmlFor="nueva" className="block text-sm mb-1 text-ink">
                          Nueva contraseña
                        </label>
                        <PasswordInput
                          id="nueva"
                          autoComplete="new-password"
                          placeholder="Mínimo 8 caracteres"
                          {...formContrasena.register("nueva")}
                          className="w-full h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        {formContrasena.formState.errors.nueva && (
                          <p className="text-danger text-xs mt-1">
                            {formContrasena.formState.errors.nueva.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="confirmar" className="block text-sm mb-1 text-ink">
                          Repite la contraseña
                        </label>
                        <PasswordInput
                          id="confirmar"
                          autoComplete="new-password"
                          {...formContrasena.register("confirmar")}
                          className="w-full h-10 rounded-lg bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        {formContrasena.formState.errors.confirmar && (
                          <p className="text-danger text-xs mt-1">
                            {formContrasena.formState.errors.confirmar.message}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={contrasenaMutacion.isPending}
                          className="flex-1 h-11 bg-primary text-ink font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                          {contrasenaMutacion.isPending ? "Guardando..." : "Cambiar contraseña"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setModo("ver")}
                          disabled={contrasenaMutacion.isPending}
                          className="h-11 px-4 rounded-lg border border-line text-ink-2 text-sm hover:bg-white/5 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AsyncState>
    </div>
  );
}