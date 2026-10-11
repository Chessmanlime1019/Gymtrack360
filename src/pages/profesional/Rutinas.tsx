import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarRange,
  Dumbbell,
  Pencil,
  Plus,
  Power,
  Search,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { RutinaPlan } from "@/components/rutinas/RutinaPlan";
import { obtenerMiPerfil } from "@/services/perfilService";
import {
  alternarRutinaActiva,
  crearEjercicio,
  eliminarRutina,
  guardarRutina,
  obtenerClientesDeSede,
  obtenerEjercicios,
  obtenerRutinas,
  type EjercicioCatalogo,
  type RutinaDetalle,
} from "@/services/rutinasService";
import {
  GRUPOS_MUSCULARES,
  NIVELES,
  OBJETIVOS,
  rutinaSchema,
  type RutinaFormValues,
} from "@/schemas/rutinaSchemas";

const inputCls =
  "w-full h-11 rounded-lg bg-background border border-line px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";
const MAX_DIAS = 7;

/* ====================================================================== */
/*  Pantalla principal: lista + panel, o editor                            */
/* ====================================================================== */
export default function Rutinas() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<{ rutina: RutinaDetalle | null } | null>(null);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "activas" | "inactivas">("todas");
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
  const profesionalId = perfil.data?.id;

  const rutinasQ = useQuery({
    queryKey: ["rutinas-prof", profesionalId],
    queryFn: () => obtenerRutinas({ profesionalId }),
    enabled: !!profesionalId,
  });

  function avisar(tipo: "ok" | "error", texto: string) {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  }

  const alternar = useMutation({
    mutationFn: ({ id, activa }: { id: string; activa: boolean }) => alternarRutinaActiva(id, activa),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["rutinas-prof"] });
      avisar("ok", v.activa ? "Rutina activada." : "Rutina desactivada.");
    },
    onError: () => avisar("error", "No se pudo cambiar el estado."),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarRutina(id),
    onSuccess: () => {
      setConfirmarEliminar(false);
      setSeleccionId(null);
      queryClient.invalidateQueries({ queryKey: ["rutinas-prof"] });
      avisar("ok", "Rutina eliminada.");
    },
    onError: () => avisar("error", "No se pudo eliminar la rutina."),
  });

  const rutinas = rutinasQ.data ?? [];
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rutinas.filter((r) => {
      if (filtroEstado === "activas" && !r.activa) return false;
      if (filtroEstado === "inactivas" && r.activa) return false;
      if (!q) return true;
      return r.nombre.toLowerCase().includes(q) || r.clienteNombre.toLowerCase().includes(q);
    });
  }, [rutinas, busqueda, filtroEstado]);

  const seleccionada = rutinas.find((r) => r.id === seleccionId) ?? filtradas[0] ?? null;

  if (editor && perfil.data) {
    return (
      <RutinaEditor
        inicial={editor.rutina}
        profesionalId={perfil.data.id}
        sedeId={perfil.data.sede_id}
        onCancelar={() => setEditor(null)}
        onGuardado={(texto) => {
          setEditor(null);
          queryClient.invalidateQueries({ queryKey: ["rutinas-prof"] });
          avisar("ok", texto);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-ink">Rutinas</h1>
          <p className="text-muted text-sm mt-1">Arma y asigna planes de entrenamiento a tus clientes.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ rutina: null })}
          disabled={!perfil.data?.sede_id}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl px-5 min-h-[44px] disabled:opacity-50"
        >
          <Plus size={18} /> Nueva rutina
        </button>
      </div>

      {perfil.data && !perfil.data.sede_id && (
        <p className="text-warning text-sm bg-warning/10 rounded-xl p-4">
          Tu usuario no tiene una sede asignada. Pídele al administrador que te la asigne para poder crear rutinas.
        </p>
      )}

      {mensaje && (
        <p
          className={`text-sm rounded-xl px-4 py-3 ${
            mensaje.tipo === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      <AsyncState
        isLoading={perfil.isLoading || rutinasQ.isLoading}
        isError={perfil.isError || rutinasQ.isError}
        isEmpty={rutinas.length === 0}
        emptyMessage="Aún no has creado rutinas. Usa “Nueva rutina” para armar la primera."
        errorMessage="No se pudieron cargar las rutinas."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
          {/* ---------- LISTA ---------- */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por rutina o cliente"
                  className={`${inputCls} pl-10`}
                />
              </div>
              <div className="flex gap-2">
                {(["todas", "activas", "inactivas"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFiltroEstado(f)}
                    className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold border capitalize ${
                      filtroEstado === f
                        ? "bg-primary border-primary text-white"
                        : "bg-bar border-line text-ink-2 hover:border-line-strong"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filtradas.length === 0 ? (
              <p className="text-muted text-sm bg-surface border border-line rounded-2xl p-5">
                Ninguna rutina coincide con el filtro.
              </p>
            ) : (
              <ul className="space-y-3">
                {filtradas.map((r) => {
                  const activa = seleccionada?.id === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSeleccionId(r.id)}
                        className={`w-full text-left bg-surface border rounded-2xl p-4 min-h-[56px] transition-colors ${
                          activa ? "border-primary" : "border-line hover:border-line-strong"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-ink font-semibold truncate">{r.nombre}</p>
                            <p className="text-muted text-xs mt-1 flex items-center gap-1.5">
                              <UserRound size={13} /> {r.clienteNombre}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                              r.activa ? "bg-success/10 text-success" : "bg-muted/15 text-muted"
                            }`}
                          >
                            {r.activa ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {r.objetivo && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                              {r.objetivo}
                            </span>
                          )}
                          {r.nivel && (
                            <span className="px-2.5 py-1 rounded-full bg-bar text-ink-2">{r.nivel}</span>
                          )}
                          <span className="px-2.5 py-1 rounded-full bg-bar text-ink-2">
                            {r.totalDias} {r.totalDias === 1 ? "día" : "días"} · {r.ejercicios.length} ejercicios
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ---------- PANEL ---------- */}
          {seleccionada && (
            <aside className="lg:sticky lg:top-6 bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="bg-primary px-5 py-4">
                <p className="text-white/80 text-xs uppercase tracking-wide">Rutina</p>
                <h3 className="text-white text-lg mt-1">{seleccionada.nombre}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-white/90 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={13} /> {seleccionada.clienteNombre}
                  </span>
                  {seleccionada.objetivo && (
                    <span className="inline-flex items-center gap-1.5">
                      <Target size={13} /> {seleccionada.objetivo}
                    </span>
                  )}
                  {seleccionada.semanas && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange size={13} /> {seleccionada.semanas} sem.
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditor({ rutina: seleccionada })}
                    className="min-h-[44px] rounded-xl border border-line-strong text-ink-2 hover:border-primary hover:text-primary text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => alternar.mutate({ id: seleccionada.id, activa: !seleccionada.activa })}
                    disabled={alternar.isPending}
                    className="min-h-[44px] rounded-xl border border-line-strong text-ink-2 hover:border-primary hover:text-primary text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Power size={14} /> {seleccionada.activa ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarEliminar(true)}
                    className="min-h-[44px] rounded-xl border border-danger/40 text-danger hover:bg-danger/10 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>

                {seleccionada.descripcion && (
                  <p className="text-ink-2 text-sm bg-bar rounded-xl p-4">{seleccionada.descripcion}</p>
                )}

                <RutinaPlan rutina={seleccionada} />
              </div>
            </aside>
          )}
        </div>
      </AsyncState>

      <Modal isOpen={confirmarEliminar} onClose={() => setConfirmarEliminar(false)} title="Eliminar rutina">
        <p className="text-ink-2 text-sm">
          Se eliminará <strong className="text-ink">{seleccionada?.nombre}</strong> con todos sus ejercicios. Esta
          acción no se puede deshacer. Si solo quieres que el cliente deje de verla, usa “Desactivar”.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConfirmarEliminar(false)}
            className="min-h-[44px] rounded-xl border border-line-strong text-ink-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => seleccionada && eliminar.mutate(seleccionada.id)}
            disabled={eliminar.isPending}
            className="min-h-[44px] rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-50"
          >
            {eliminar.isPending ? "Eliminando…" : "Sí, eliminar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ====================================================================== */
/*  Editor / constructor de rutina                                         */
/* ====================================================================== */
interface ItemEditor {
  uid: string;
  ejercicioId: string;
  dia: number;
  series: number;
  repeticiones: number;
  descansoSeg: number;
  pesoSugerido: string;
  notas: string;
}

let contadorUid = 0;
const nuevoUid = () => `ej-${Date.now()}-${contadorUid++}`;

function RutinaEditor({
  inicial,
  profesionalId,
  sedeId,
  onCancelar,
  onGuardado,
}: {
  inicial: RutinaDetalle | null;
  profesionalId: string;
  sedeId: string | null;
  onCancelar: () => void;
  onGuardado: (texto: string) => void;
}) {
  const queryClient = useQueryClient();
  const esEdicion = !!inicial;

  const [items, setItems] = useState<ItemEditor[]>(() =>
    (inicial?.ejercicios ?? []).map((e) => ({
      uid: nuevoUid(),
      ejercicioId: e.ejercicioId,
      dia: e.dia,
      series: e.series,
      repeticiones: e.repeticiones,
      descansoSeg: e.descansoSeg,
      pesoSugerido: e.pesoSugerido ?? "",
      notas: e.notas ?? "",
    }))
  );
  const [totalDias, setTotalDias] = useState(Math.max(inicial?.totalDias ?? 1, 1));
  const [diaActivo, setDiaActivo] = useState(1);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [activa, setActiva] = useState(inicial?.activa ?? true);

  const [busqueda, setBusqueda] = useState("");
  const [grupo, setGrupo] = useState<string>("Todos");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoGrupo, setNuevoGrupo] = useState<string>(GRUPOS_MUSCULARES[0]);
  const [creandoEj, setCreandoEj] = useState(false);

  const clientesQ = useQuery({
    queryKey: ["clientes-sede", sedeId],
    queryFn: () => obtenerClientesDeSede(sedeId as string),
    enabled: !!sedeId,
  });
  const ejerciciosQ = useQuery({ queryKey: ["catalogo-ejercicios"], queryFn: obtenerEjercicios });
  const catalogo = ejerciciosQ.data ?? [];
  const mapaCatalogo = new Map(catalogo.map((e) => [e.id, e]));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RutinaFormValues>({
    resolver: zodResolver(rutinaSchema),
    defaultValues: {
      nombre: inicial?.nombre ?? "",
      clienteId: inicial?.clienteId ?? "",
      objetivo: inicial?.objetivo ?? "",
      nivel: inicial?.nivel ?? "",
      semanas: inicial?.semanas ? String(inicial.semanas) : "",
      descripcion: inicial?.descripcion ?? "",
    },
  });

  const guardar = useMutation({
    mutationFn: (v: RutinaFormValues) =>
      guardarRutina({
        id: inicial?.id,
        profesionalId,
        sedeId: sedeId as string,
        datos: {
          nombre: v.nombre.trim(),
          descripcion: v.descripcion ?? "",
          objetivo: v.objetivo,
          nivel: v.nivel,
          semanas: v.semanas ? Math.max(1, Math.min(52, Number(v.semanas))) : null,
          clienteId: v.clienteId,
          activa,
          ejercicios: [...items]
            .sort((a, b) => a.dia - b.dia)
            .map((i) => ({
              ejercicioId: i.ejercicioId,
              dia: i.dia,
              series: i.series,
              repeticiones: i.repeticiones,
              descansoSeg: i.descansoSeg,
              pesoSugerido: i.pesoSugerido,
              notas: i.notas,
            })),
        },
      }),
    onSuccess: () => onGuardado(esEdicion ? "Rutina actualizada." : "Rutina creada y asignada al cliente."),
    onError: () => setErrorGeneral("No se pudo guardar la rutina. Revisa tu conexión e inténtalo de nuevo."),
  });

  function onSubmit(v: RutinaFormValues) {
    setErrorGeneral(null);
    if (items.length === 0) {
      setErrorGeneral("Agrega al menos un ejercicio.");
      return;
    }
    for (let d = 1; d <= totalDias; d++) {
      if (!items.some((i) => i.dia === d)) {
        setErrorGeneral(`El Día ${d} no tiene ejercicios. Agrégale uno o elimina ese día.`);
        setDiaActivo(d);
        return;
      }
    }
    for (const i of items) {
      if (i.series < 1 || i.series > 20 || i.repeticiones < 1 || i.repeticiones > 100) {
        setErrorGeneral("Revisa las series (1–20) y repeticiones (1–100) de cada ejercicio.");
        return;
      }
      if (i.descansoSeg < 0 || i.descansoSeg > 600) {
        setErrorGeneral("El descanso debe estar entre 0 y 600 segundos.");
        return;
      }
    }
    guardar.mutate(v);
  }

  function agregarEjercicio(ej: EjercicioCatalogo) {
    setItems((prev) => [
      ...prev,
      {
        uid: nuevoUid(),
        ejercicioId: ej.id,
        dia: diaActivo,
        series: 3,
        repeticiones: 12,
        descansoSeg: 60,
        pesoSugerido: "",
        notas: "",
      },
    ]);
  }

  function actualizar(uid: string, cambios: Partial<ItemEditor>) {
    setItems((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...cambios } : i)));
  }

  function quitar(uid: string) {
    setItems((prev) => prev.filter((i) => i.uid !== uid));
  }

  // Sube o baja un ejercicio dentro de su día.
  function mover(uid: string, delta: -1 | 1) {
    setItems((prev) => {
      const delDia = prev.filter((i) => i.dia === diaActivo);
      const pos = delDia.findIndex((i) => i.uid === uid);
      const destino = delDia[pos + delta];
      if (!destino) return prev;
      const copia = [...prev];
      const a = copia.findIndex((i) => i.uid === uid);
      const b = copia.findIndex((i) => i.uid === destino.uid);
      [copia[a], copia[b]] = [copia[b], copia[a]];
      return copia;
    });
  }

  function agregarDia() {
    if (totalDias >= MAX_DIAS) return;
    setTotalDias(totalDias + 1);
    setDiaActivo(totalDias + 1);
  }

  function eliminarDia() {
    if (totalDias <= 1) return;
    setItems((prev) =>
      prev.filter((i) => i.dia !== diaActivo).map((i) => (i.dia > diaActivo ? { ...i, dia: i.dia - 1 } : i))
    );
    setTotalDias(totalDias - 1);
    setDiaActivo(Math.max(1, diaActivo - 1));
  }

  async function crearYAgregar() {
    const nombre = nuevoNombre.trim();
    if (nombre.length < 3) return;
    setCreandoEj(true);
    try {
      const nuevo = await crearEjercicio({ nombre, grupoMuscular: nuevoGrupo });
      await queryClient.invalidateQueries({ queryKey: ["catalogo-ejercicios"] });
      agregarEjercicio(nuevo);
      setNuevoNombre("");
    } catch {
      setErrorGeneral("No se pudo crear el ejercicio.");
    } finally {
      setCreandoEj(false);
    }
  }

  const delDia = items.filter((i) => i.dia === diaActivo);
  const catalogoFiltrado = catalogo.filter((e) => {
    if (grupo !== "Todos" && e.grupo_muscular !== grupo) return false;
    const q = busqueda.trim().toLowerCase();
    return !q || e.nombre.toLowerCase().includes(q);
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Volver"
            className="w-11 h-11 rounded-xl border border-line-strong text-ink-2 hover:text-primary hover:border-primary grid place-items-center"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl text-ink">{esEdicion ? "Editar rutina" : "Nueva rutina"}</h1>
            <p className="text-muted text-sm mt-0.5">Define los datos y arma cada día de entrenamiento.</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={guardar.isPending}
          className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl px-6 min-h-[44px] disabled:opacity-50"
        >
          {guardar.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear rutina"}
        </button>
      </div>

      {errorGeneral && <p className="text-sm rounded-xl px-4 py-3 bg-danger/10 text-danger">{errorGeneral}</p>}

      {/* ---------- Datos generales ---------- */}
      <section className="bg-surface border border-line rounded-2xl p-5">
        <h2 className="text-lg text-ink mb-4">Datos generales</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="nombre" className="block text-sm text-ink-2 mb-1.5">Nombre de la rutina</label>
            <input id="nombre" {...register("nombre")} placeholder="Ej. Hipertrofia 4 días" className={inputCls} />
            {errors.nombre && <p className="text-danger text-xs mt-1">{errors.nombre.message}</p>}
          </div>
          <div>
            <label htmlFor="clienteId" className="block text-sm text-ink-2 mb-1.5">Cliente</label>
            <select id="clienteId" {...register("clienteId")} className={inputCls} disabled={esEdicion}>
              <option value="">Selecciona un cliente</option>
              {(clientesQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
            {errors.clienteId && <p className="text-danger text-xs mt-1">{errors.clienteId.message}</p>}
          </div>
          <div>
            <label htmlFor="objetivo" className="block text-sm text-ink-2 mb-1.5">Objetivo</label>
            <select id="objetivo" {...register("objetivo")} className={inputCls}>
              <option value="">Selecciona un objetivo</option>
              {OBJETIVOS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {errors.objetivo && <p className="text-danger text-xs mt-1">{errors.objetivo.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nivel" className="block text-sm text-ink-2 mb-1.5">Nivel</label>
              <select id="nivel" {...register("nivel")} className={inputCls}>
                <option value="">Nivel</option>
                {NIVELES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {errors.nivel && <p className="text-danger text-xs mt-1">{errors.nivel.message}</p>}
            </div>
            <div>
              <label htmlFor="semanas" className="block text-sm text-ink-2 mb-1.5">Duración (semanas)</label>
              <input id="semanas" type="number" min={1} max={52} {...register("semanas")} placeholder="Ej. 8" className={inputCls} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="descripcion" className="block text-sm text-ink-2 mb-1.5">Indicaciones generales (opcional)</label>
            <textarea
              id="descripcion"
              rows={3}
              {...register("descripcion")}
              placeholder="Calentamiento, técnica, alimentación, qué hacer si hay molestias…"
              className="w-full rounded-lg bg-background border border-line px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <label className="md:col-span-2 inline-flex items-center gap-3 text-sm text-ink-2 cursor-pointer min-h-[44px]">
            <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="w-5 h-5 accent-primary" />
            Rutina activa (el cliente la ve en su perfil)
          </label>
        </div>
      </section>

      {/* ---------- Días ---------- */}
      <section className="bg-surface border border-line rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg text-ink">Plan por días</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={agregarDia}
              disabled={totalDias >= MAX_DIAS}
              className="min-h-[44px] px-4 rounded-xl border border-line-strong text-ink-2 hover:border-primary hover:text-primary text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus size={15} /> Agregar día
            </button>
            <button
              type="button"
              onClick={eliminarDia}
              disabled={totalDias <= 1}
              className="min-h-[44px] px-4 rounded-xl border border-danger/40 text-danger hover:bg-danger/10 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 size={15} /> Quitar día
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: totalDias }, (_, k) => k + 1).map((d) => {
            const n = items.filter((i) => i.dia === d).length;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDiaActivo(d)}
                className={`shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-semibold border ${
                  d === diaActivo
                    ? "bg-primary border-primary text-white"
                    : "bg-bar border-line text-ink-2 hover:border-line-strong"
                }`}
              >
                Día {d} <span className="opacity-70">({n})</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px] items-start">
          {/* Ejercicios del día */}
          <div>
            {delDia.length === 0 ? (
              <p className="text-muted text-sm bg-bar rounded-xl p-5">
                El Día {diaActivo} está vacío. Elige ejercicios del catálogo para agregarlos.
              </p>
            ) : (
              <ol className="space-y-3">
                {delDia.map((it, idx) => {
                  const ej = mapaCatalogo.get(it.ejercicioId);
                  return (
                    <li key={it.uid} className="border border-line rounded-2xl p-4 bg-background">
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/15 text-primary text-sm font-bold grid place-items-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-ink font-semibold">{ej?.nombre ?? "Ejercicio"}</p>
                          <p className="text-muted text-xs">{ej?.grupo_muscular}</p>
                        </div>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => mover(it.uid, -1)} disabled={idx === 0} aria-label="Subir" className="w-9 h-9 rounded-lg border border-line text-ink-2 hover:text-primary disabled:opacity-30 grid place-items-center">
                            <ArrowUp size={15} />
                          </button>
                          <button type="button" onClick={() => mover(it.uid, 1)} disabled={idx === delDia.length - 1} aria-label="Bajar" className="w-9 h-9 rounded-lg border border-line text-ink-2 hover:text-primary disabled:opacity-30 grid place-items-center">
                            <ArrowDown size={15} />
                          </button>
                          <button type="button" onClick={() => quitar(it.uid)} aria-label="Quitar ejercicio" className="w-9 h-9 rounded-lg border border-danger/40 text-danger hover:bg-danger/10 grid place-items-center">
                            <X size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <Campo label="Series">
                          <input type="number" min={1} max={20} value={it.series} onChange={(e) => actualizar(it.uid, { series: Number(e.target.value) })} className={inputCls} />
                        </Campo>
                        <Campo label="Repeticiones">
                          <input type="number" min={1} max={100} value={it.repeticiones} onChange={(e) => actualizar(it.uid, { repeticiones: Number(e.target.value) })} className={inputCls} />
                        </Campo>
                        <Campo label="Descanso (seg)">
                          <input type="number" min={0} max={600} step={15} value={it.descansoSeg} onChange={(e) => actualizar(it.uid, { descansoSeg: Number(e.target.value) })} className={inputCls} />
                        </Campo>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Campo label="Carga sugerida">
                          <input value={it.pesoSugerido} onChange={(e) => actualizar(it.uid, { pesoSugerido: e.target.value })} placeholder="Ej. 20 kg o RPE 8" className={inputCls} />
                        </Campo>
                        <Campo label="Nota para el cliente">
                          <input value={it.notas} onChange={(e) => actualizar(it.uid, { notas: e.target.value })} placeholder="Ej. Baja en 3 segundos" className={inputCls} />
                        </Campo>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Catálogo */}
          <div className="border border-line rounded-2xl p-4 bg-background">
            <p className="text-ink font-semibold flex items-center gap-2 mb-3">
              <Dumbbell size={16} className="text-primary" /> Catálogo de ejercicios
            </p>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar ejercicio" className={inputCls} />
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {["Todos", ...GRUPOS_MUSCULARES].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrupo(g)}
                  className={`shrink-0 px-3 min-h-[36px] rounded-full text-xs font-semibold border ${
                    grupo === g ? "bg-primary border-primary text-white" : "bg-bar border-line text-ink-2"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <ul className="mt-3 max-h-[320px] overflow-y-auto space-y-1.5">
              {catalogoFiltrado.length === 0 && <li className="text-muted text-xs py-2">Sin resultados.</li>}
              {catalogoFiltrado.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => agregarEjercicio(e)}
                    className="w-full text-left flex items-center justify-between gap-2 px-3 min-h-[44px] rounded-xl bg-bar hover:bg-primary/10 border border-transparent hover:border-primary/40"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm text-ink truncate">{e.nombre}</span>
                      <span className="block text-[11px] text-muted">{[e.grupo_muscular, e.equipo].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Plus size={16} className="text-primary shrink-0" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-xs text-muted mb-2">¿No está? Créalo y se agrega al Día {diaActivo}:</p>
              <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del ejercicio" className={inputCls} />
              <select value={nuevoGrupo} onChange={(e) => setNuevoGrupo(e.target.value)} className={`${inputCls} mt-2`}>
                {GRUPOS_MUSCULARES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={crearYAgregar}
                disabled={creandoEj || nuevoNombre.trim().length < 3}
                className="mt-2 w-full min-h-[44px] rounded-xl border border-primary text-primary hover:bg-primary/10 text-sm font-semibold disabled:opacity-40"
              >
                {creandoEj ? "Creando…" : "Crear y agregar"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}