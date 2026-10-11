import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Eye, Search, UserMinus, UserPlus } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { RutinaPlan } from "@/components/rutinas/RutinaPlan";
import { obtenerMiPerfil } from "@/services/perfilService";
import { obtenerRutinas } from "@/services/rutinasService";
import { obtenerMisClientes, tomarACargo, dejarDeAtender, type ClienteSede } from "@/services/misClientesService";
import type { ClienteResumen } from "@/services/dashboardProfesionalService";

type Pestana = "mios" | "sede";
type Filtro = "todos" | "sin-rutina" | "por-vencer" | "inactivos";

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: "todos", texto: "Todos" },
  { id: "sin-rutina", texto: "Sin rutina" },
  { id: "por-vencer", texto: "Por vencer" },
  { id: "inactivos", texto: "Sin venir" },
];

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(iso);
  f.setHours(0, 0, 0, 0);
  return Math.round((hoy.getTime() - f.getTime()) / 86_400_000);
}

const sinRutina = (c: ClienteResumen) => !c.rutinaActiva;
const porVencer = (c: ClienteResumen) => c.diasMembresia !== null && c.diasMembresia >= 0 && c.diasMembresia <= 7;
const inactivo = (c: ClienteResumen) => {
  if (c.diasMembresia === null || c.diasMembresia < 0) return false;
  const d = diasDesde(c.ultimaVisita);
  return d === null || d >= 7;
};

function textoVisita(iso: string | null) {
  const d = diasDesde(iso);
  if (d === null) return "Sin visitas recientes";
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  return `Hace ${d} días`;
}

const iniciales = (c: { nombre: string; apellido: string }) =>
  `${c.nombre[0] ?? ""}${c.apellido[0] ?? ""}`.toUpperCase();

const inputCls =
  "w-full h-11 rounded-lg bg-background border border-line px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

export default function MisClientes() {
  const queryClient = useQueryClient();
  const [pestana, setPestana] = useState<Pestana>("mios");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [rutinaVerId, setRutinaVerId] = useState<string | null>(null);
  const [confirmarSoltar, setConfirmarSoltar] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
  const profesionalId = perfil.data?.id;
  const sedeId = perfil.data?.sede_id ?? null;

  const clientesQ = useQuery({
    queryKey: ["mis-clientes", profesionalId, sedeId],
    queryFn: () => obtenerMisClientes(profesionalId as string, sedeId as string),
    enabled: !!profesionalId && !!sedeId,
  });
  const rutinasQ = useQuery({
    queryKey: ["rutinas-prof", profesionalId],
    queryFn: () => obtenerRutinas({ profesionalId }),
    enabled: !!profesionalId,
  });

  function avisar(tipo: "ok" | "error", texto: string) {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3500);
  }

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ["mis-clientes"] });
    queryClient.invalidateQueries({ queryKey: ["resumen-profesional"] });
  }

  const tomar = useMutation({
    mutationFn: (clienteId: string) =>
      tomarACargo({ profesionalId: profesionalId as string, clienteId, sedeId: sedeId as string }),
    onSuccess: (_d, clienteId) => {
      refrescar();
      setPestana("mios");
      setFiltro("todos");
      setSeleccionId(clienteId);
      avisar("ok", "Cliente agregado a tu lista.");
    },
    onError: () => avisar("error", "No se pudo agregar al cliente."),
  });

  const soltar = useMutation({
    mutationFn: (clienteId: string) => dejarDeAtender({ profesionalId: profesionalId as string, clienteId }),
    onSuccess: () => {
      setConfirmarSoltar(false);
      setSeleccionId(null);
      refrescar();
      avisar("ok", "Cliente quitado de tu lista. Sus rutinas se conservan.");
    },
    onError: () => avisar("error", "No se pudo quitar al cliente."),
  });

  const asignados: ClienteResumen[] = clientesQ.data?.asignados ?? [];
  const disponibles: ClienteSede[] = clientesQ.data?.disponibles ?? [];
  const q = busqueda.trim().toLowerCase();
  const coincide = (c: { nombre: string; apellido: string }) =>
    !q || `${c.nombre} ${c.apellido}`.toLowerCase().includes(q);

  const listaMios = useMemo(
    () =>
      asignados
        .filter(coincide)
        .filter((c: ClienteResumen) => {
          if (filtro === "sin-rutina") return sinRutina(c);
          if (filtro === "por-vencer") return porVencer(c);
          if (filtro === "inactivos") return inactivo(c);
          return true;
        })
        .sort((a: ClienteResumen, b: ClienteResumen) =>
          `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)
        ),
    [asignados, filtro, q] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const listaSede = useMemo(() => disponibles.filter(coincide), [disponibles, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const miSel = asignados.find((c) => c.id === seleccionId) ?? null;
  const sedeSel = disponibles.find((c) => c.id === seleccionId) ?? null;
  const seleccion = pestana === "mios" ? miSel ?? listaMios[0] ?? null : sedeSel ?? listaSede[0] ?? null;
  const esMio = pestana === "mios";

  const rutinasCliente = (rutinasQ.data ?? []).filter((r) => r.clienteId === seleccion?.id);
  const rutinaVer = rutinasCliente.find((r) => r.id === rutinaVerId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-ink">Mis clientes</h1>
        <p className="text-muted text-sm mt-1">Los clientes que atiendes y los de tu sede que puedes tomar a cargo.</p>
      </div>

      {mensaje && (
        <p className={`text-sm rounded-xl px-4 py-3 ${mensaje.tipo === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {mensaje.texto}
        </p>
      )}

      {perfil.data && !perfil.data.sede_id && (
        <p className="text-warning text-sm bg-warning/10 rounded-xl p-4">
          Tu usuario no tiene sede asignada. Pídele al administrador que te la asigne.
        </p>
      )}

      <AsyncState
        isLoading={perfil.isLoading || (!!sedeId && clientesQ.isLoading)}
        isError={perfil.isError || clientesQ.isError}
        errorMessage="No se pudieron cargar los clientes."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-2 gap-2 bg-bar border border-line rounded-2xl p-1.5">
              {([
                ["mios", `Mis clientes (${asignados.length})`],
                ["sede", `Clientes de la sede (${disponibles.length})`],
              ] as [Pestana, string][]).map(([id, texto]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPestana(id);
                    setSeleccionId(null);
                    setRutinaVerId(null);
                  }}
                  className={`min-h-[44px] rounded-xl text-sm font-semibold ${
                    pestana === id ? "bg-primary text-white" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre" className={`${inputCls} pl-10`} />
            </div>

            {esMio && (
              <div className="flex gap-2 overflow-x-auto">
                {FILTROS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltro(f.id)}
                    className={`shrink-0 min-h-[40px] px-4 rounded-xl text-sm font-semibold border ${
                      filtro === f.id ? "bg-primary border-primary text-white" : "bg-bar border-line text-ink-2 hover:border-line-strong"
                    }`}
                  >
                    {f.texto}
                  </button>
                ))}
              </div>
            )}

            {esMio ? (
              listaMios.length === 0 ? (
                <p className="text-muted text-sm bg-surface border border-line rounded-2xl p-5">
                  {asignados.length === 0
                    ? "Aún no atiendes a nadie. Ve a “Clientes de la sede” y toma a tu primer cliente."
                    : "Ningún cliente coincide con la búsqueda o el filtro."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {listaMios.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSeleccionId(c.id);
                          setRutinaVerId(null);
                        }}
                        className={`w-full text-left bg-surface border rounded-2xl p-4 min-h-[64px] ${
                          seleccion?.id === c.id ? "border-primary" : "border-line hover:border-line-strong"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar c={c} />
                          <div className="min-w-0 flex-1">
                            <p className="text-ink font-semibold truncate">{c.nombre} {c.apellido}</p>
                            <p className="text-muted text-xs mt-0.5 truncate">
                              {c.rutinaActiva ? c.rutinaActiva.nombre : "Sin rutina activa"} · {textoVisita(c.ultimaVisita)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {sinRutina(c) && <Etiqueta clase="bg-warning/10 text-warning">Sin rutina</Etiqueta>}
                            {porVencer(c) && <Etiqueta clase="bg-danger/10 text-danger">{c.diasMembresia === 0 ? "Vence hoy" : `Vence en ${c.diasMembresia} d`}</Etiqueta>}
                            {inactivo(c) && <Etiqueta clase="bg-info/10 text-info">Sin venir</Etiqueta>}
                            {c.diasMembresia === null && <Etiqueta clase="bg-muted/15 text-muted">Sin membresía</Etiqueta>}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : listaSede.length === 0 ? (
              <p className="text-muted text-sm bg-surface border border-line rounded-2xl p-5">
                {disponibles.length === 0 ? "Ya atiendes a todos los clientes de tu sede." : "Ningún cliente coincide con la búsqueda."}
              </p>
            ) : (
              <ul className="space-y-3">
                {listaSede.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSeleccionId(c.id)}
                      className={`w-full text-left bg-surface border rounded-2xl p-4 min-h-[64px] ${
                        seleccion?.id === c.id ? "border-primary" : "border-line hover:border-line-strong"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar c={c} />
                        <div className="min-w-0 flex-1">
                          <p className="text-ink font-semibold truncate">{c.nombre} {c.apellido}</p>
                          <p className="text-muted text-xs mt-0.5">
                            Cliente desde {new Date(c.createdAt).toLocaleDateString("es-PE", { month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <UserPlus size={18} className="text-primary shrink-0" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ---------- Panel ---------- */}
          {seleccion && (
            <aside className="lg:sticky lg:top-6 bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="bg-primary px-5 py-5 flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/20 overflow-hidden grid place-items-center text-white font-bold text-lg shrink-0">
                  {seleccion.avatarUrl ? <img src={seleccion.avatarUrl} alt="" className="w-full h-full object-cover" /> : iniciales(seleccion)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white text-lg truncate">{seleccion.nombre} {seleccion.apellido}</h3>
                  <p className="text-white/80 text-xs">{esMio ? "Cliente a tu cargo" : "Cliente de tu sede"}</p>
                </div>
              </div>

              <div className="p-5 space-y-4 text-sm">
                {esMio && miSel === null && listaMios[0] && (
                  <ResumenCliente c={listaMios[0]} />
                )}
                {esMio && miSel && <ResumenCliente c={miSel} />}

                {esMio && (
                  <div className="pt-4 border-t border-line space-y-3">
                    <p className="text-ink font-semibold flex items-center gap-2">
                      <Dumbbell size={16} className="text-primary" /> Rutinas ({rutinasCliente.length})
                    </p>
                    {rutinasCliente.length === 0 ? (
                      <p className="text-muted text-xs">Todavía no le has creado rutinas.</p>
                    ) : (
                      <ul className="space-y-2">
                        {rutinasCliente.map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-2 bg-bar rounded-xl px-3 min-h-[52px]">
                            <span className="min-w-0">
                              <span className="block text-ink font-medium truncate">{r.nombre}</span>
                              <span className={`block text-xs ${r.activa ? "text-success" : "text-muted"}`}>{r.activa ? "Activa" : "Inactiva"}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setRutinaVerId(rutinaVerId === r.id ? null : r.id)}
                              className="shrink-0 min-h-[40px] px-3 rounded-lg border border-line-strong text-ink-2 hover:text-primary hover:border-primary text-xs font-semibold inline-flex items-center gap-1.5"
                            >
                              <Eye size={14} /> {rutinaVerId === r.id ? "Ocultar" : "Ver"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {rutinaVer && (
                      <div className="pt-2">
                        <RutinaPlan rutina={rutinaVer} />
                      </div>
                    )}
                  </div>
                )}

                {esMio ? (
                  <div className="space-y-2 pt-1">
                    <Link
                      to={`/profesional/rutinas?cliente=${seleccion.id}`}
                      className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold"
                    >
                      <Dumbbell size={16} /> Nueva rutina para este cliente
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmarSoltar(true)}
                      className="w-full min-h-[44px] rounded-xl border border-danger/40 text-danger hover:bg-danger/10 text-sm font-semibold inline-flex items-center justify-center gap-2"
                    >
                      <UserMinus size={16} /> Dejar de atender
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => tomar.mutate(seleccion.id)}
                    disabled={tomar.isPending}
                    className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UserPlus size={16} /> {tomar.isPending ? "Agregando…" : "Tomar a cargo"}
                  </button>
                )}
              </div>
            </aside>
          )}
        </div>
      </AsyncState>

      <Modal isOpen={confirmarSoltar} onClose={() => setConfirmarSoltar(false)} title="Dejar de atender">
        <p className="text-ink-2 text-sm">
          <strong className="text-ink">{seleccion?.nombre} {seleccion?.apellido}</strong> saldrá de tu lista. Sus rutinas se
          conservan y puedes volver a tomarlo a cargo cuando quieras.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setConfirmarSoltar(false)} className="min-h-[44px] rounded-xl border border-line-strong text-ink-2 text-sm font-semibold">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => seleccion && soltar.mutate(seleccion.id)}
            disabled={soltar.isPending}
            className="min-h-[44px] rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-50"
          >
            {soltar.isPending ? "Quitando…" : "Sí, quitar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ResumenCliente({ c }: { c: ClienteResumen }) {
  return (
    <div className="space-y-3">
      <Fila
        label="Membresía"
        valor={c.diasMembresia === null ? "Sin membresía activa" : c.diasMembresia < 0 ? "Vencida" : `Vence en ${c.diasMembresia} días`}
      />
      <Fila label="Última visita" valor={textoVisita(c.ultimaVisita)} />
      <Fila label="Visitas (30 días)" valor={String(c.visitas30d)} />
    </div>
  );
}

function Avatar({ c }: { c: { nombre: string; apellido: string; avatarUrl: string | null } }) {
  return (
    <div className="w-11 h-11 rounded-full bg-primary/15 text-primary overflow-hidden grid place-items-center text-sm font-bold shrink-0">
      {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" /> : iniciales(c)}
    </div>
  );
}

function Etiqueta({ clase, children }: { clase: string; children: ReactNode }) {
  return <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${clase}`}>{children}</span>;
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-ink font-medium text-right">{valor}</span>
    </div>
  );
}