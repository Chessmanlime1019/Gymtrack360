import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTema } from "@/context/TemaContext";
import { AsyncState } from "@/components/ui/AsyncState";
import { EncabezadoTablero, EstadoMembresias, KpiCard, Panel, SinDatos } from "@/components/ui/Tablero";
import { hoyLima, primerDiaMesLima } from "@/lib/fechas";
import { obtenerSedesActivas } from "@/services/sedesService";
import {
  obtenerDashboardGlobal,
  obtenerIngresosPorDia,
  obtenerClientesPorSede,
  obtenerMembresiasPorEstado,
  obtenerIngresosPorSede,
} from "@/services/dashboardService";
import { asistenciasAgrupadasPorDia, asistenciasPorSede } from "@/services/asistenciasService";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  LineChart as IconoLinea,
  ScanLine,
  TrendingUp,
  Users,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Recharts dibuja en SVG y recibe colores como valores: un juego por tema.
// Ejes y grilla discretos (1px, sólidos); la serie es lo único que destaca.
const COLORES_GRAFICO = {
  dark: {
    grilla: "#232A31",
    eje: "#8F99A3",
    cursor: "rgba(255,255,255,0.05)",
    superficie: "#12181E",
    ingresos: "#E8570C",
    asistencias: "#4F82F5",
  },
  light: {
    grilla: "#E6EAF0",
    eje: "#647080",
    cursor: "rgba(15,23,42,0.04)",
    superficie: "#FFFFFF",
    ingresos: "#E8570C",
    asistencias: "#2563EB",
  },
};

const soles = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const solesCorto = (n: number) => (n >= 1000 ? `S/ ${(n / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 })}K` : `S/ ${n}`);
const diaCorto = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }).replace(".", "");

// Tooltip en HTML para que use los colores del tema como el resto de la app.
function TooltipGrafico({
  active,
  payload,
  label,
  nombre,
  formato,
  color,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  nombre: string;
  formato: (v: number) => string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line-strong bg-surface px-3 py-2 shadow-lg">
      <p className="text-muted text-[11px]">{label ? diaCorto(label) : ""}</p>
      <p className="text-ink text-sm font-semibold mt-0.5 inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {formato(payload[0].value)} <span className="text-muted font-normal">{nombre}</span>
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const { sesion } = useAuth();
  const { resuelto } = useTema();
  const g = COLORES_GRAFICO[resuelto];
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeFiltro, setSedeFiltro] = useState<string>(sesion?.sedeId ?? "");
  const [desde, setDesde] = useState(primerDiaMesLima());
  const [hasta, setHasta] = useState(hoyLima());

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const sedeActivaId = esSuperAdmin ? (sedeFiltro || null) : (sesion?.sedeId ?? null);
  const vistaGlobal = esSuperAdmin && !sedeActivaId;

  const { data: kpis, isLoading: loadingKpis, isError: errorKpis } = useQuery({
    queryKey: ["dashboard-kpis", sedeActivaId, desde, hasta],
    queryFn: () => obtenerDashboardGlobal(sedeActivaId, desde, hasta),
  });

  const { data: ingresosPorDia } = useQuery({
    queryKey: ["dashboard-ingresos-dia", sedeActivaId, desde, hasta],
    queryFn: () => obtenerIngresosPorDia(sedeActivaId, desde, hasta),
  });

  const { data: asistenciasPorDia } = useQuery({
    queryKey: ["dashboard-asistencias-dia", sedeActivaId, desde, hasta],
    queryFn: () => asistenciasAgrupadasPorDia(sedeActivaId, desde, hasta),
  });

  const { data: clientesPorSede } = useQuery({
    queryKey: ["dashboard-clientes-sede"],
    queryFn: obtenerClientesPorSede,
    enabled: vistaGlobal,
  });

  const { data: membresiasPorEstado } = useQuery({
    queryKey: ["dashboard-membresias-estado", sedeActivaId],
    queryFn: () => obtenerMembresiasPorEstado(sedeActivaId),
  });

  const { data: ingresosPorSede } = useQuery({
    queryKey: ["dashboard-ingresos-sede", desde, hasta],
    queryFn: () => obtenerIngresosPorSede(desde, hasta),
    enabled: vistaGlobal,
  });

  const { data: asistenciasPorSedeData } = useQuery({
    queryKey: ["dashboard-asistencias-sede", desde, hasta],
    queryFn: () => asistenciasPorSede(desde, hasta),
    enabled: vistaGlobal,
  });

  const datosIngresos = ingresosPorDia ?? [];
  const datosAsistencias = asistenciasPorDia ?? [];
  const totalIngresos = datosIngresos.reduce((s, d) => s + d.ingresos, 0);
  const totalAsistencias = datosAsistencias.reduce((s, d) => s + d.cantidad, 0);
  const canceladas = membresiasPorEstado?.find((e) => e.estado === "Canceladas")?.cantidad ?? 0;

  const sedesOrdenadas = useMemo(
    () => [...(clientesPorSede ?? [])].sort((a, b) => b.cantidad - a.cantidad),
    [clientesPorSede]
  );
  const totalClientesSedes = sedesOrdenadas.reduce((s, x) => s + x.cantidad, 0);
  const maxClientesSede = Math.max(1, ...sedesOrdenadas.map((s) => s.cantidad));

  const datosComparacionSedes = useMemo(() => {
    if (!vistaGlobal) return [];
    const mapa = new Map<string, { sede: string; clientes: number; asistencias: number; ingresos: number }>();
    (clientesPorSede ?? []).forEach((c) => mapa.set(c.sede, { sede: c.sede, clientes: c.cantidad, asistencias: 0, ingresos: 0 }));
    (asistenciasPorSedeData ?? []).forEach((a) => {
      const e = mapa.get(a.sede_nombre) ?? { sede: a.sede_nombre, clientes: 0, asistencias: 0, ingresos: 0 };
      e.asistencias = a.cantidad;
      mapa.set(a.sede_nombre, e);
    });
    (ingresosPorSede ?? []).forEach((i) => {
      const e = mapa.get(i.sede) ?? { sede: i.sede, clientes: 0, asistencias: 0, ingresos: 0 };
      e.ingresos = i.ingresos;
      mapa.set(i.sede, e);
    });
    return Array.from(mapa.values()).sort((a, b) => b.ingresos - a.ingresos);
  }, [clientesPorSede, asistenciasPorSedeData, ingresosPorSede, vistaGlobal]);

  const ejeX = { stroke: g.grilla, tick: { fill: g.eje, fontSize: 11 }, tickLine: false } as const;
  const ejeY = { axisLine: false, tickLine: false, tick: { fill: g.eje, fontSize: 11 }, width: 52 } as const;

  const filtros = (
    <>
      {esSuperAdmin && (
        <select
          value={sedeFiltro}
          onChange={(e) => setSedeFiltro(e.target.value)}
          aria-label="Sede"
          className="h-11 rounded-xl bg-surface border border-line px-3.5 text-sm font-medium text-ink outline-none sm:w-56 focus:border-primary/70 focus:ring-2 focus:ring-primary/10"
        >
          <option value="">Todas las sedes</option>
          {sedes?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      )}
      <div className="h-11 flex items-center gap-2 rounded-xl bg-surface border border-line px-3">
        <CalendarDays className="w-4 h-4 text-muted shrink-0" />
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          aria-label="Desde"
          className="bg-transparent text-sm text-ink outline-none"
        />
        <span className="text-muted text-xs">a</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          aria-label="Hasta"
          className="bg-transparent text-sm text-ink outline-none"
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <EncabezadoTablero
        nombre={sesion?.nombre}
        subtitulo={
          esSuperAdmin
            ? sedeActivaId
              ? "Resumen de la sede seleccionada"
              : "Resumen global de todas las sedes"
            : "Resumen general de tu sede"
        }
        acciones={filtros}
      />

      {/* KPIs */}
      <AsyncState isLoading={loadingKpis} isError={errorKpis} errorMessage="No se pudieron cargar los indicadores.">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Clientes activos"
            value={String(kpis?.clientesActivos ?? 0)}
            detalle={`de ${kpis?.totalClientes ?? 0} registrados`}
            icon={Users}
            tono="primary"
          />
          <KpiCard label="Check-ins hoy" value={String(kpis?.checkinsHoy ?? 0)} detalle="Ingresos por QR" icon={ScanLine} tono="info" />
          <KpiCard
            label="Por vencer"
            value={String(kpis?.membresiasPorVencer ?? 0)}
            detalle="En los próximos 7 días"
            icon={CreditCard}
            tono="warning"
          />
          <KpiCard
            label="Ingresos del periodo"
            value={soles(kpis?.ingresosMes ?? 0)}
            detalle={`${diaCorto(desde)} – ${diaCorto(hasta)}`}
            icon={TrendingUp}
            tono="success"
          />
        </div>
        {vistaGlobal && kpis && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <KpiCard label="Sedes" value={String(kpis.totalSedes)} detalle={`${kpis.sedesActivas} activas`} icon={Building2} tono="violeta" />
            <KpiCard label="Membresías vigentes" value={String(kpis.membresiasActivas)} detalle="Con acceso habilitado" icon={Activity} tono="success" />
            <KpiCard label="Membresías vencidas" value={String(kpis.membresiasVencidas)} detalle="Pendientes de renovar" icon={AlertTriangle} tono="danger" />
          </div>
        )}
      </AsyncState>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel titulo="Ingresos" subtitulo={`${soles(totalIngresos)} cobrados en el periodo`} accion={{ texto: "Ver reportes", to: "/admin/reportes" }}>
          {datosIngresos.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={datosIngresos} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={g.grilla} />
                <XAxis dataKey="fecha" {...ejeX} tickFormatter={diaCorto} minTickGap={16} />
                <YAxis {...ejeY} tickFormatter={solesCorto} allowDecimals={false} />
                <Tooltip cursor={{ fill: g.cursor }} content={<TooltipGrafico nombre="cobrado" formato={soles} color={g.ingresos} />} />
                <Bar dataKey="ingresos" fill={g.ingresos} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <SinDatos mensaje="Sin ingresos en el periodo seleccionado" icono={BarChart3} />
          )}
        </Panel>

        <Panel titulo="Asistencias" subtitulo={`${totalAsistencias} ingresos registrados en el periodo`}>
          {datosAsistencias.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={datosAsistencias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={g.grilla} />
                <XAxis dataKey="fecha" {...ejeX} tickFormatter={diaCorto} minTickGap={16} />
                <YAxis {...ejeY} allowDecimals={false} />
                <Tooltip
                  cursor={{ stroke: g.grilla, strokeWidth: 1 }}
                  content={<TooltipGrafico nombre="ingresos" formato={(v) => String(v)} color={g.asistencias} />}
                />
                <Area
                  type="monotone"
                  dataKey="cantidad"
                  stroke={g.asistencias}
                  strokeWidth={2}
                  fill={g.asistencias}
                  fillOpacity={0.1}
                  dot={false}
                  activeDot={{ r: 5, fill: g.asistencias, fillOpacity: 1, stroke: g.superficie, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <SinDatos mensaje="Sin asistencias en el periodo seleccionado" icono={IconoLinea} />
          )}
        </Panel>

        {/* CLIENTES POR SEDE: ranking con participación de cada sede */}
        {vistaGlobal && (
          <Panel titulo="Clientes por sede" subtitulo="Participación de cada sede en el total de clientes">
            {sedesOrdenadas.length > 0 ? (
              <div className="flex flex-col h-full">
                <ul className="space-y-1">
                  {sedesOrdenadas.map((s, i) => {
                    const pct = totalClientesSedes ? Math.round((s.cantidad / totalClientesSedes) * 100) : 0;
                    return (
                      <li key={s.sede} className="flex items-center gap-3.5 rounded-xl px-2 py-2.5 -mx-2 hover:bg-ink/[0.03]">
                        <span
                          className={`w-8 h-8 rounded-lg grid place-items-center text-xs font-bold shrink-0 ${
                            i === 0 && s.cantidad > 0 ? "bg-primary text-white" : "bg-ink/5 text-ink-2"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className={`text-sm truncate ${s.cantidad ? "text-ink font-medium" : "text-muted"}`}>{s.sede}</span>
                            <span className="text-sm tabular-nums shrink-0">
                              <span className="font-bold text-ink">{s.cantidad}</span>
                              <span className="text-muted text-xs ml-1.5">{pct}%</span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-ink/5 mt-2">
                            {s.cantidad > 0 && (
                              <div
                                className="h-1.5 rounded-full bg-primary transition-[width] duration-500"
                                style={{ width: `${Math.max(4, (s.cantidad / maxClientesSede) * 100)}%` }}
                              />
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-auto pt-4 border-t border-line text-xs text-muted flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    <span className="font-semibold text-ink">{totalClientesSedes}</span> clientes en {sedesOrdenadas.length} sedes
                  </span>
                </p>
              </div>
            ) : (
              <SinDatos mensaje="Sin datos de clientes por sede" icono={Building2} />
            )}
          </Panel>
        )}

        <Panel titulo="Membresías" subtitulo="Estado actual de las membresías" accion={{ texto: "Gestionar", to: "/admin/membresias" }}>
          <EstadoMembresias
            vigentes={kpis?.membresiasActivas ?? 0}
            porVencer={kpis?.membresiasPorVencer ?? 0}
            vencidas={kpis?.membresiasVencidas ?? 0}
            canceladas={canceladas}
          />
        </Panel>

        {/* COMPARACIÓN DE SEDES */}
        {vistaGlobal && datosComparacionSedes.length > 0 && (
          <Panel titulo="Comparación de sedes" subtitulo="Clientes, asistencias e ingresos del periodo" className="xl:col-span-2" sinRelleno>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-[11px] uppercase tracking-wider bg-background/70 border-y border-line">
                    <th className="text-left font-semibold px-5 py-3">Sede</th>
                    <th className="text-right font-semibold px-5 py-3">Clientes</th>
                    <th className="text-right font-semibold px-5 py-3">Asistencias</th>
                    <th className="text-right font-semibold px-5 py-3">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {datosComparacionSedes.map((fila) => (
                    <tr key={fila.sede} className="border-b border-line last:border-b-0 hover:bg-ink/[0.03]">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-2.5 text-ink font-medium">
                          <span className="w-7 h-7 rounded-lg bg-ink/5 text-ink-2 grid place-items-center">
                            <Building2 className="w-3.5 h-3.5" />
                          </span>
                          {fila.sede}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-ink-2 tabular-nums">{fila.clientes}</td>
                      <td className="px-5 py-3.5 text-right text-ink-2 tabular-nums">{fila.asistencias}</td>
                      <td className="px-5 py-3.5 text-right text-ink font-semibold tabular-nums">{soles(fila.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
