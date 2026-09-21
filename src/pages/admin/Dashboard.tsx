import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerSedesActivas } from "@/services/sedesService";
import {
  obtenerDashboardGlobal,
  obtenerIngresosPorDia,
  obtenerClientesPorSede,
  obtenerMembresiasPorEstado,
  obtenerIngresosPorSede,
} from "@/services/dashboardService";
import {
  asistenciasAgrupadasPorDia,
  asistenciasPorSede,
} from "@/services/asistenciasService";
import {
  Users,
  CreditCard,
  ScanLine,
  TrendingUp,
  Building2,
  CalendarDays,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORES = ["#F15A24", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function primerDiaMes(): string {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n: number): string {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-surface rounded-[14px] p-5 border border-line shadow-[0_8px_25px_rgba(0,0,0,0.12)] hover:border-[#3a424a] transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-muted text-xs font-medium">{label}</p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color ?? "#F15A24"}15`, border: `1px solid ${color ?? "#F15A24"}20` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color: color ?? "#F15A24" }} />
        </div>
      </div>
      <p className="text-[28px] font-bold tracking-tight text-ink">{value}</p>
    </div>
  );
}

function GraficoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border border-line bg-background min-h-[220px] flex items-center justify-center">
      <p className="text-muted text-sm">{mensaje}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { sesion } = useAuth();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeFiltro, setSedeFiltro] = useState<string>(sesion?.sedeId ?? "");
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoyISO());

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const sedeActivaId = esSuperAdmin ? (sedeFiltro || null) : (sesion?.sedeId ?? null);

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
    enabled: esSuperAdmin && !sedeActivaId,
  });

  const { data: membresiasPorEstado } = useQuery({
    queryKey: ["dashboard-membresias-estado"],
    queryFn: obtenerMembresiasPorEstado,
  });

  const { data: ingresosPorSede } = useQuery({
    queryKey: ["dashboard-ingresos-sede", desde, hasta],
    queryFn: () => obtenerIngresosPorSede(desde, hasta),
    enabled: esSuperAdmin && !sedeActivaId,
  });

  const { data: asistenciasPorSedeData } = useQuery({
    queryKey: ["dashboard-asistencias-sede", desde, hasta],
    queryFn: () => asistenciasPorSede(desde, hasta),
    enabled: esSuperAdmin && !sedeActivaId,
  });

  const datosIngresos = useMemo(() => {
    if (ingresosPorDia && ingresosPorDia.length > 0) return ingresosPorDia;
    return [];
  }, [ingresosPorDia]);

  const datosAsistencias = useMemo(() => {
    if (asistenciasPorDia && asistenciasPorDia.length > 0) return asistenciasPorDia;
    return [];
  }, [asistenciasPorDia]);

  const datosComparacionSedes = useMemo(() => {
    if (!esSuperAdmin || sedeActivaId) return [];
    const mapa = new Map<string, { sede: string; clientes: number; asistencias: number; ingresos: number }>();

    (clientesPorSede ?? []).forEach((c) => {
      mapa.set(c.sede, { sede: c.sede, clientes: c.cantidad, asistencias: 0, ingresos: 0 });
    });

    (asistenciasPorSedeData ?? []).forEach((a) => {
      const existente = mapa.get(a.sede_nombre) ?? { sede: a.sede_nombre, clientes: 0, asistencias: 0, ingresos: 0 };
      existente.asistencias = a.cantidad;
      mapa.set(a.sede_nombre, existente);
    });

    (ingresosPorSede ?? []).forEach((i) => {
      const existente = mapa.get(i.sede) ?? { sede: i.sede, clientes: 0, asistencias: 0, ingresos: 0 };
      existente.ingresos = i.ingresos;
      mapa.set(i.sede, existente);
    });

    return Array.from(mapa.values());
  }, [clientesPorSede, asistenciasPorSedeData, ingresosPorSede, esSuperAdmin, sedeActivaId]);

  return (
    <div className="space-y-7">

      {/* CABECERA */}
      <div>
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="text-muted text-sm mt-1">
          {esSuperAdmin
            ? sedeActivaId
              ? `Resumen de la sede seleccionada`
              : "Resumen global de todas las sedes"
            : "Resumen general de tu sede"}
        </p>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">

        {esSuperAdmin && (
          <select
            value={sedeFiltro}
            onChange={(e) => setSedeFiltro(e.target.value)}
            className="h-[44px] rounded-lg bg-surface border border-line px-4 text-sm text-ink outline-none sm:w-56 focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-all"
          >
            <option value="" className="bg-surface">Todas las sedes</option>
            {sedes?.map((s) => (
              <option key={s.id} value={s.id} className="bg-surface">{s.nombre}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted shrink-0" />
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="h-[44px] rounded-lg bg-surface border border-line px-3 text-sm text-ink outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-all"
          />
          <span className="text-muted text-xs">a</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="h-[44px] rounded-lg bg-surface border border-line px-3 text-sm text-ink outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

      </div>

      {/* KPIs */}
      <AsyncState
        isLoading={loadingKpis}
        isError={errorKpis}
        emptyMessage="No hay datos para mostrar."
        errorMessage="No se pudieron cargar los indicadores."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Clientes activos"
            value={String(kpis?.clientesActivos ?? 0)}
            icon={Users}
            color="#F15A24"
          />
          <KpiCard
            label="Check-ins hoy"
            value={String(kpis?.checkinsHoy ?? 0)}
            icon={ScanLine}
            color="#3b82f6"
          />
          <KpiCard
            label="Membresías por vencer"
            value={String(kpis?.membresiasPorVencer ?? 0)}
            icon={CreditCard}
            color="#f59e0b"
          />
          <KpiCard
            label="Ingresos del mes"
            value={formatMoney(kpis?.ingresosMes ?? 0)}
            icon={TrendingUp}
            color="#10b981"
          />
        </div>
      </AsyncState>

      {/* KPIs extra  */}
      {esSuperAdmin && !sedeActivaId && kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Total sedes"
            value={String(kpis.totalSedes ?? 0)}
            icon={Building2}
            color="#8b5cf6"
          />
          <KpiCard
            label="Membresías activas"
            value={String(kpis.membresiasActivas ?? 0)}
            icon={Activity}
            color="#10b981"
          />
          <KpiCard
            label="Membresías vencidas"
            value={String(kpis.membresiasVencidas ?? 0)}
            icon={CreditCard}
            color="#ef4444"
          />
        </div>
      )}

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ingresos por periodo */}
        <div className="bg-surface rounded-[14px] border border-line overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.12)]">
          <div className="px-5 py-4 border-b border-line">
            <p className="text-sm font-semibold text-ink">Ingresos por periodo</p>
          </div>
          <div className="px-5 py-5">
            {datosIngresos.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={datosIngresos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3036" />
                  <XAxis dataKey="fecha" stroke="#8F99A3" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#8F99A3" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1A1E22", border: "1px solid #30363d", borderRadius: 8, color: "#fff" }}
                    formatter={(value: number) => [formatMoney(value), "Ingresos"]}
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Bar dataKey="ingresos" fill="#F15A24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <GraficoVacio mensaje="Sin ingresos en el periodo seleccionado" />
            )}
          </div>
        </div>

        {/* Asistencias por periodo */}
        <div className="bg-surface rounded-[14px] border border-line overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.12)]">
          <div className="px-5 py-4 border-b border-line">
            <p className="text-sm font-semibold text-ink">Asistencias por periodo</p>
          </div>
          <div className="px-5 py-5">
            {datosAsistencias.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={datosAsistencias}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3036" />
                  <XAxis dataKey="fecha" stroke="#8F99A3" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#8F99A3" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1A1E22", border: "1px solid #30363d", borderRadius: 8, color: "#fff" }}
                    formatter={(value: number) => [value, "Asistencias"]}
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Line type="monotone" dataKey="cantidad" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <GraficoVacio mensaje="Sin asistencias en el periodo seleccionado" />
            )}
          </div>
        </div>

        {/* Clientes por sede */}
        {esSuperAdmin && !sedeActivaId && (
          <div className="bg-surface rounded-[14px] border border-line overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.12)]">
            <div className="px-5 py-4 border-b border-line">
              <p className="text-sm font-semibold text-ink">Clientes por sede</p>
            </div>
            <div className="px-5 py-5">
              {clientesPorSede && clientesPorSede.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={clientesPorSede}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A3036" />
                    <XAxis dataKey="sede" stroke="#8F99A3" fontSize={11} />
                    <YAxis stroke="#8F99A3" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1A1E22", border: "1px solid #30363d", borderRadius: 8, color: "#fff" }}
                      formatter={(value: number) => [value, "Clientes"]}
                    />
                    <Bar dataKey="cantidad" fill="#F15A24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <GraficoVacio mensaje="Sin datos de clientes por sede" />
              )}
            </div>
          </div>
        )}

        {/* Membresías por estado */}
        <div className="bg-surface rounded-[14px] border border-line overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.12)]">
          <div className="px-5 py-4 border-b border-line">
            <p className="text-sm font-semibold text-ink">Membresías por estado</p>
          </div>
          <div className="px-5 py-5">
            {membresiasPorEstado && membresiasPorEstado.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={membresiasPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="cantidad"
                    nameKey="estado"
                    label={({ estado, percent }) =>
                      `${estado} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {membresiasPorEstado.map((_, index) => (
                      <Cell key={index} fill={COLORES[index % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1A1E22", border: "1px solid #30363d", borderRadius: 8, color: "#fff" }}
                    formatter={(value: number) => [value, "Membresías"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <GraficoVacio mensaje="Sin membresías registradas" />
            )}
          </div>
        </div>

        {/* Comparación de sedes */}
        {esSuperAdmin && !sedeActivaId && datosComparacionSedes.length > 0 && (
          <div className="bg-surface rounded-[14px] border border-line overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.12)] lg:col-span-2">
            <div className="px-5 py-4 border-b border-line">
              <p className="text-sm font-semibold text-ink">Comparación de sedes</p>
            </div>
            <div className="px-5 py-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Sede</th>
                      <th className="text-right px-4 py-2">Clientes</th>
                      <th className="text-right px-4 py-2">Asistencias</th>
                      <th className="text-right px-4 py-2">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosComparacionSedes.map((fila) => (
                      <tr key={fila.sede} className="border-t border-line">
                        <td className="px-4 py-3 text-ink font-medium">{fila.sede}</td>
                        <td className="px-4 py-3 text-right">{fila.clientes}</td>
                        <td className="px-4 py-3 text-right">{fila.asistencias}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(fila.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
