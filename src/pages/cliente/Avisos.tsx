import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Megaphone, Pencil, Pin, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { obtenerSedesActivas } from "@/services/sedesService";
import {
  actualizarAviso,
  alternarActivoAviso,
  crearAviso,
  eliminarAviso,
  estaVigente,
  hoyLima,
  obtenerAvisosGestion,
  type Aviso,
  type TipoAviso,
} from "@/services/avisosService";
import { ESTILO_AVISO, fechaAviso } from "@/components/avisos/estilosAviso";

type Filtro = "vigentes" | "inactivos" | "todos";

interface Form {
  id: string | null;
  titulo: string;
  mensaje: string;
  tipo: TipoAviso;
  fijado: boolean;
  venceEn: string;
  sedeId: string; // "" = todas las sedes (solo super admin)
}

const input =
  "w-full h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

// Pantalla para publicar y gestionar avisos. La usan Admin de Sede, Recepción y Super Admin.
export default function AvisosGestion() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const esSuperAdmin = sesion?.role === "super_admin";
  const miSede = sesion?.sedeId ?? null;

  const [filtro, setFiltro] = useState<Filtro>("vigentes");
  const [form, setForm] = useState<Form | null>(null);
  const [borrando, setBorrando] = useState<Aviso | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const avisos = useQuery({ queryKey: ["avisos-gestion"], queryFn: obtenerAvisosGestion });
  const sedes = useQuery({ queryKey: ["sedes-activas"], queryFn: obtenerSedesActivas });

  const nombreSede = (id: string | null) =>
    id === null ? "Todas las sedes" : (sedes.data?.find((s) => s.id === id)?.nombre ?? "Sede");
  const puedeEditar = (a: Aviso) => esSuperAdmin || (a.sedeId !== null && a.sedeId === miSede);

  const lista = useMemo(() => {
    const todos = avisos.data ?? [];
    if (filtro === "vigentes") return todos.filter(estaVigente);
    if (filtro === "inactivos") return todos.filter((a) => !estaVigente(a));
    return todos;
  }, [avisos.data, filtro]);

  const conteo = useMemo(() => {
    const todos = avisos.data ?? [];
    const vig = todos.filter(estaVigente).length;
    return { vigentes: vig, inactivos: todos.length - vig, todos: todos.length };
  }, [avisos.data]);

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ["avisos-gestion"] });
    queryClient.invalidateQueries({ queryKey: ["avisos-vigentes"] });
  }
  function avisar(t: string) {
    setAviso(t);
    setTimeout(() => setAviso(null), 5000);
  }

  const guardar = useMutation({
    mutationFn: async (f: Form) => {
      if (f.titulo.trim().length < 3) throw new Error("El título es muy corto.");
      if (!f.mensaje.trim()) throw new Error("Escribe el mensaje del aviso.");
      if (f.venceEn && f.venceEn < hoyLima()) throw new Error("La fecha de vencimiento ya pasó.");
      const base = {
        titulo: f.titulo,
        mensaje: f.mensaje,
        tipo: f.tipo,
        fijado: f.fijado,
        venceEn: f.venceEn || null,
      };
      if (f.id) {
        await actualizarAviso(f.id, base);
      } else {
        const sedeId = esSuperAdmin ? (f.sedeId || null) : miSede;
        if (!esSuperAdmin && !sedeId) throw new Error("Tu cuenta no tiene una sede asignada.");
        await crearAviso({ ...base, sedeId });
      }
    },
    onSuccess: (_d, f) => {
      refrescar();
      setForm(null);
      setErrorForm(null);
      avisar(f.id ? "Aviso actualizado." : "Aviso publicado. Se notificó a clientes y profesionales.");
    },
    onError: (e) => setErrorForm(e instanceof Error ? e.message : "No se pudo guardar."),
  });

  const alternar = useMutation({
    mutationFn: (a: Aviso) => alternarActivoAviso(a.id, !a.activo),
    onSuccess: refrescar,
  });
  const borrar = useMutation({
    mutationFn: (id: string) => eliminarAviso(id),
    onSuccess: () => {
      refrescar();
      setBorrando(null);
    },
  });

  function abrirNuevo() {
    guardar.reset();
    setErrorForm(null);
    setForm({
      id: null,
      titulo: "",
      mensaje: "",
      tipo: "info",
      fijado: false,
      venceEn: "",
      sedeId: esSuperAdmin ? "" : (miSede ?? ""),
    });
  }
  function abrirEditar(a: Aviso) {
    guardar.reset();
    setErrorForm(null);
    setForm({
      id: a.id,
      titulo: a.titulo,
      mensaje: a.mensaje,
      tipo: a.tipo,
      fijado: a.fijado,
      venceEn: a.venceEn ?? "",
      sedeId: a.sedeId ?? "",
    });
  }

  const FILTROS: { id: Filtro; label: string }[] = [
    { id: "vigentes", label: "Vigentes" },
    { id: "inactivos", label: "Ocultos o vencidos" },
    { id: "todos", label: "Todos" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl text-ink">Avisos</h1>
          <p className="text-muted text-sm mt-1">
            Publica novedades para los clientes y profesionales {esSuperAdmin ? "de las sedes" : "de tu sede"}.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo aviso
        </button>
      </div>

      {aviso && (
        <div className="rounded-xl border border-success/30 bg-success/10 text-success text-sm px-4 py-3">
          {aviso}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            aria-pressed={filtro === f.id}
            className={`h-9 px-4 rounded-full text-sm font-medium border transition-colors ${
              filtro === f.id
                ? "bg-primary border-primary text-white"
                : "border-line text-ink-2 hover:border-line-strong"
            }`}
          >
            {f.label}
            <span className={`ml-2 text-xs ${filtro === f.id ? "text-white/80" : "text-muted"}`}>
              {conteo[f.id]}
            </span>
          </button>
        ))}
      </div>

      <AsyncState
        isLoading={avisos.isLoading}
        isError={avisos.isError}
        isEmpty={lista.length === 0}
        emptyMessage="No hay avisos en esta vista."
      >
        <div className="grid lg:grid-cols-2 gap-3">
          {lista.map((a) => {
            const e = ESTILO_AVISO[a.tipo];
            const vigente = estaVigente(a);
            const editable = puedeEditar(a);
            return (
              <article
                key={a.id}
                className={`relative bg-surface border border-line rounded-2xl pl-6 pr-4 py-4 overflow-hidden ${
                  vigente ? "" : "opacity-70"
                }`}
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${e.barra}`} />
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${e.chip}`}>
                    {e.etiqueta}
                  </span>
                  {a.fijado && (
                    <span className="text-[11px] text-muted inline-flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Fijado
                    </span>
                  )}
                  {!a.activo && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/15 text-muted">Oculto</span>
                  )}
                  {a.activo && !vigente && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                      Vencido
                    </span>
                  )}
                </div>
                <h2 className="text-ink font-semibold text-sm">{a.titulo}</h2>
                <p className="text-ink-2 text-sm mt-1 line-clamp-3 whitespace-pre-line">{a.mensaje}</p>
                <p className="text-muted text-xs mt-3">
                  {nombreSede(a.sedeId)} · {fechaAviso(a.createdAt)}
                  {a.venceEn ? ` · vence ${fechaAviso(`${a.venceEn}T12:00:00`)}` : ""}
                </p>

                {editable && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <button
                      onClick={() => abrirEditar(a)}
                      className="h-9 px-3 rounded-lg border border-line text-ink-2 hover:border-primary hover:text-primary text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => alternar.mutate(a)}
                      disabled={alternar.isPending}
                      className="h-9 px-3 rounded-lg border border-line text-ink-2 hover:border-line-strong text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      {a.activo ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Ocultar
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Mostrar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setBorrando(a)}
                      aria-label="Eliminar aviso"
                      className="h-9 w-9 rounded-lg border border-line text-muted hover:text-danger hover:border-danger/40 grid place-items-center ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </AsyncState>

      {/* Crear / editar */}
      <Modal
        isOpen={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar aviso" : "Nuevo aviso"}
      >
        {form && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErrorForm(null);
              guardar.mutate(form);
            }}
            className="p-5 space-y-4"
            noValidate
          >
            <div>
              <label htmlFor="av-titulo" className="block text-xs text-muted mb-1.5">
                Título
              </label>
              <input
                id="av-titulo"
                maxLength={120}
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej: Mañana cerramos a las 6 pm"
                className={input}
              />
            </div>

            <div>
              <label htmlFor="av-mensaje" className="block text-xs text-muted mb-1.5">
                Mensaje
              </label>
              <textarea
                id="av-mensaje"
                rows={4}
                maxLength={1000}
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                className="w-full rounded-xl bg-background border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
              />
              <p className="text-muted text-[11px] text-right mt-1">{form.mensaje.length}/1000</p>
            </div>

            <div>
              <p className="block text-xs text-muted mb-1.5">Tipo</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ESTILO_AVISO) as TipoAviso[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, tipo: t })}
                    aria-pressed={form.tipo === t}
                    className={`h-11 rounded-xl border text-xs font-medium transition-colors ${
                      form.tipo === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-line text-ink-2 hover:border-line-strong"
                    }`}
                  >
                    {ESTILO_AVISO[t].etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {!form.id && esSuperAdmin && (
              <div>
                <label htmlFor="av-sede" className="block text-xs text-muted mb-1.5">
                  Para quién
                </label>
                <select
                  id="av-sede"
                  value={form.sedeId}
                  onChange={(e) => setForm({ ...form, sedeId: e.target.value })}
                  className={input}
                >
                  <option value="">Todas las sedes</option>
                  {sedes.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      Solo {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label htmlFor="av-vence" className="block text-xs text-muted mb-1.5">
                  Vence el (opcional)
                </label>
                <input
                  id="av-vence"
                  type="date"
                  min={hoyLima()}
                  value={form.venceEn}
                  onChange={(e) => setForm({ ...form, venceEn: e.target.value })}
                  className={input}
                />
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, fijado: !form.fijado })}
                aria-pressed={form.fijado}
                className={`h-11 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                  form.fijado
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-line text-ink-2 hover:border-line-strong"
                }`}
              >
                <Pin className="w-4 h-4" /> {form.fijado ? "Fijado" : "Fijar arriba"}
              </button>
            </div>

            {!form.id && (
              <p className="text-muted text-xs inline-flex items-start gap-2">
                <Megaphone className="w-4 h-4 shrink-0 mt-0.5" />
                Al publicar, los clientes y profesionales recibirán una notificación.
              </p>
            )}

            {errorForm && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3">
                {errorForm}
              </div>
            )}

            <button
              type="submit"
              disabled={guardar.isPending}
              className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {guardar.isPending ? "Guardando..." : form.id ? "Guardar cambios" : "Publicar aviso"}
            </button>
          </form>
        )}
      </Modal>

      {/* Eliminar */}
      <Modal isOpen={borrando !== null} onClose={() => setBorrando(null)} title="Eliminar aviso">
        {borrando && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-ink-2">
              ¿Eliminar el aviso <span className="text-ink font-semibold">“{borrando.titulo}”</span>? Esta
              acción no se puede deshacer. Si solo quieres que deje de verse, usa{" "}
              <span className="text-ink">Ocultar</span>.
            </p>
            {borrar.isError && <p className="text-danger text-sm">No se pudo eliminar.</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setBorrando(null)}
                className="flex-1 h-11 rounded-xl border border-line text-ink text-sm font-medium"
              >
                Volver
              </button>
              <button
                onClick={() => borrar.mutate(borrando.id)}
                disabled={borrar.isPending}
                className="flex-1 h-11 rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-50"
              >
                {borrar.isPending ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}