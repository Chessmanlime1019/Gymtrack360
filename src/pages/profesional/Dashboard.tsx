import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ClipboardList, Dumbbell, Plus, UserRound, Users } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { AvisosBanner } from "@/components/avisos/AvisosBanner";
import { obtenerMiPerfil } from "@/services/perfilService";
import {
  obtenerResumenProfesional,
  type ClienteResumen,
  type ResumenProfesional,
} from "@/services/dashboardProfesionalService";

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
// "Sin venir": tiene membresía vigente pero lleva 7 días o más sin asistir.
const inactivo = (c: ClienteResumen) => {
  if (c.diasMembresia === null || c.diasMembresia < 0) return false;
  const d = diasDesde(c.ultimaVisita);
  return d === null || d >= 7;
};

function textoUltimaVisita(iso: string | null) {
  const d = diasDesde(iso);
  if (d === null) return "Sin visitas recientes";
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  return `Hace ${d} días`;
}

function iniciales(c: { nombre: string; apellido: string }) {
  return `${c.nombre[0] ?? ""}${c.apellido[0] ?? ""}`.toUpperCase();
}

export default function DashboardProfesional() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [seleccionId, setSeleccionId] = useState<string | null>(null);

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
  const resumenQ = useQuery<ResumenProfesional>({
    queryKey: ["resumen-profesional", perfil.data?.id],
    queryFn: () => obtenerResumenProfesional(perfil.data!.id),
    enabled: !!perfil.data,
  });

  const resumen = resumenQ.data;
  const clientes: ClienteResumen[] = resumen?.clientes ?? [];

  const kpis = useMemo(
    () => ({
      clientes: clientes.length,
      sinRutina: clientes.filter(sinRutina).length,
      porVencer: clientes.filter(porVencer).length,
      inactivos: clientes.filter(inactivo).length,
    }),
    [clientes]
  );

  const filtrados = useMemo(() => {
    const lista = clientes.filter((c: ClienteResumen) => {
      if (filtro === "sin-rutina") return sinRutina(c);
      if (filtro === "por-vencer") return porVencer(c);
      if (filtro === "inactivos") return inactivo(c);
      return true;
    });
    return lista.sort((a: ClienteResumen, b: ClienteResumen) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`));
  }, [clientes, filtro]);

  const seleccionado = clientes.find((c) => c.id === seleccionId) ?? filtrados[0] ?? null;
  const maxVisitas = Math.max(1, ...(resumen?.visitasPorDia.map((d) => d.total) ?? [1]));

  return (
    <div className="space-y-6">
      <AvisosBanner rutaTodos="/profesional/avisos" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-ink">{perfil.data ? `Hola, ${perfil.data.nombre}` : "Dashboard"}</h1>
          <p className="text-muted text-sm mt-1">Así van tus clientes hoy.</p>
        </div>
        <Link
          to="/profesional/rutinas"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl px-5 min-h-[44px]"
        >
          <Plus size={18} /> Nueva rutina
        </Link>
      </div>

      <AsyncState
        isLoading={perfil.isLoading || resumenQ.isLoading}
        isError={perfil.isError || resumenQ.isError}
        errorMessage="No se pudo cargar tu panel."
      >
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icono={<Users size={18} />} label="Mis clientes" valor={kpis.clientes} />
          <Kpi icono={<Dumbbell size={18} />} label="Rutinas activas" valor={resumen?.rutinasActivas ?? 0} />
          <Kpi icono={<ClipboardList size={18} />} label="Sin rutina" valor={kpis.sinRutina} alerta={kpis.sinRutina > 0} />
          <Kpi icono={<CalendarCheck size={18} />} label="Membresía por vencer" valor={kpis.porVencer} alerta={kpis.porVencer > 0} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
          <div className="space-y-6 min-w-0">
            {/* Actividad 7 días */}
            <section className="bg-surface border border-line rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg text-ink">Visitas de tus clientes</h2>
                <span className="text-muted text-xs">Últimos 7 días</span>
              </div>
              <div className="mt-5 flex items-end gap-3 h-32">
                {(resumen?.visitasPorDia ?? []).map((d) => {
                  const fecha = new Date(`${d.fecha}T00:00:00`);
                  return (
                    <div key={d.fecha} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                      <span className="text-xs text-ink-2 font-semibold">{d.total}</span>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full rounded-t-lg bg-primary/80"
                          style={{ height: `${Math.max((d.total / maxVisitas) * 100, d.total ? 8 : 3)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted capitalize">
                        {fecha.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Clientes */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-lg text-ink">Mis clientes</h2>
                <div className="flex gap-2 overflow-x-auto">
                  {FILTROS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltro(f.id)}
                      className={`shrink-0 min-h-[40px] px-4 rounded-xl text-sm font-semibold border ${
                        filtro === f.id
                          ? "bg-primary border-primary text-white"
                          : "bg-bar border-line text-ink-2 hover:border-line-strong"
                      }`}
                    >
                      {f.texto}
                    </button>
                  ))}
                </div>
              </div>

              {clientes.length === 0 ? (
                <div className="bg-surface border border-line rounded-2xl p-6 text-center">
                  <UserRound className="mx-auto text-muted" size={32} />
                  <p className="text-ink font-semibold mt-3">Aún no tienes clientes</p>
                  <p className="text-muted text-sm mt-1">
                    Un cliente queda a tu cargo cuando le creas su primera rutina.
                  </p>
                  <Link
                    to="/profesional/rutinas"
                    className="mt-4 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold"
                  >
                    Crear una rutina
                  </Link>
                </div>
              ) : filtrados.length === 0 ? (
                <p className="text-muted text-sm bg-surface border border-line rounded-2xl p-5">
                  Ningún cliente coincide con este filtro. ¡Buen trabajo!
                </p>
              ) : (
                <ul className="space-y-3">
                  {filtrados.map((c) => {
                    const activo = seleccionado?.id === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSeleccionId(c.id)}
                          className={`w-full text-left bg-surface border rounded-2xl p-4 min-h-[64px] transition-colors ${
                            activo ? "border-primary" : "border-line hover:border-line-strong"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar c={c} />
                            <div className="min-w-0 flex-1">
                              <p className="text-ink font-semibold truncate">
                                {c.nombre} {c.apellido}
                              </p>
                              <p className="text-muted text-xs mt-0.5 truncate">
                                {c.rutinaActiva ? c.rutinaActiva.nombre : "Sin rutina activa"} ·{" "}
                                {textoUltimaVisita(c.ultimaVisita)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {sinRutina(c) && <Etiqueta clase="bg-warning/10 text-warning">Sin rutina</Etiqueta>}
                              {porVencer(c) && (
                                <Etiqueta clase="bg-danger/10 text-danger">
                                  {c.diasMembresia === 0 ? "Vence hoy" : `Vence en ${c.diasMembresia} d`}
                                </Etiqueta>
                              )}
                              {inactivo(c) && <Etiqueta clase="bg-info/10 text-info">Sin venir</Etiqueta>}
                              {c.diasMembresia === null && <Etiqueta clase="bg-muted/15 text-muted">Sin membresía</Etiqueta>}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Panel */}
          {seleccionado && (
            <aside className="lg:sticky lg:top-6 bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="bg-primary px-5 py-5 flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/20 overflow-hidden grid place-items-center text-white font-bold text-lg shrink-0">
                  {seleccionado.avatarUrl ? (
                    <img src={seleccionado.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    iniciales(seleccionado)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white text-lg truncate">
                    {seleccionado.nombre} {seleccionado.apellido}
                  </h3>
                  <p className="text-white/80 text-xs">Cliente</p>
                </div>
              </div>

              <div className="p-5 space-y-4 text-sm">
                <Fila
                  label="Membresía"
                  valor={
                    seleccionado.diasMembresia === null
                      ? "Sin membresía activa"
                      : seleccionado.diasMembresia < 0
                      ? "Vencida"
                      : `Vence en ${seleccionado.diasMembresia} días`
                  }
                />
                <Fila label="Última visita" valor={textoUltimaVisita(seleccionado.ultimaVisita)} />
                <Fila label="Visitas (30 días)" valor={String(seleccionado.visitas30d)} />

                <div className="pt-4 border-t border-line">
                  <p className="text-muted text-xs mb-2">Rutina activa</p>
                  {seleccionado.rutinaActiva ? (
                    <div className="bg-bar rounded-xl p-4">
                      <p className="text-ink font-semibold">{seleccionado.rutinaActiva.nombre}</p>
                      <p className="text-muted text-xs mt-1">
                        {[seleccionado.rutinaActiva.objetivo, seleccionado.rutinaActiva.nivel].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        {seleccionado.rutinaActiva.totalDias} días · {seleccionado.rutinaActiva.ejercicios.length} ejercicios
                      </p>
                    </div>
                  ) : (
                    <p className="text-warning text-xs bg-warning/10 rounded-xl p-3">
                      Este cliente no tiene una rutina activa.
                    </p>
                  )}
                </div>

                <Link
                  to={`/profesional/rutinas?cliente=${seleccionado.id}`}
                  className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold"
                >
                  <Dumbbell size={16} /> Nueva rutina para este cliente
                </Link>
              </div>
            </aside>
          )}
        </div>
      </AsyncState>
    </div>
  );
}

function Kpi({
  icono,
  label,
  valor,
  alerta = false,
}: {
  icono: ReactNode;
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted text-xs font-medium">{label}</p>
        <span className={`w-8 h-8 rounded-lg grid place-items-center ${alerta ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>
          {icono}
        </span>
      </div>
      <p className="gt-kpi text-3xl text-ink mt-3">{valor}</p>
    </div>
  );
}

function Avatar({ c }: { c: ClienteResumen }) {
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