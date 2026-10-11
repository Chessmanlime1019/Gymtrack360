import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Banknote,
  CreditCard,
  Landmark,
  ScanLine,
  Smartphone,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerDashboardGlobal } from "@/services/dashboardService";
import { obtenerAsistencias } from "@/services/asistenciasService";
import { obtenerPagos } from "@/services/pagosService";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function formatMoney(n: number): string {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ICONO_METODO: Record<string, React.ElementType> = {
  Efectivo: Banknote,
  Yape: Smartphone,
  Plin: Smartphone,
  Transferencia: Landmark,
};

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-surface rounded-xl p-5 border border-line">
      <div className="flex items-center justify-between mb-3">
        <p className="text-muted text-xs font-medium">{label}</p>
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-ink">{value}</p>
    </div>
  );
}

export default function RecepcionDashboard() {
  const { sesion } = useAuth();
  const sedeId = sesion?.sedeId ?? null;
  const hoy = hoyISO();

  const {
    data: kpis,
    isLoading: cargandoKpis,
    isError: errorKpis,
  } = useQuery({
    queryKey: ["recepcion-dashboard-kpis", sedeId, hoy],
    queryFn: () => obtenerDashboardGlobal(sedeId, hoy, hoy),
    enabled: !!sedeId,
  });

  const { data: accesosHoy, isLoading: cargandoAccesos } = useQuery({
    queryKey: ["recepcion-dashboard-accesos", sedeId, hoy],
    queryFn: () => obtenerAsistencias(sedeId, hoy, hoy),
    enabled: !!sedeId,
  });

  const { data: pagos } = useQuery({
    queryKey: ["recepcion-dashboard-pagos", sedeId],
    queryFn: () => obtenerPagos(sedeId),
    enabled: !!sedeId,
  });

  const pagosHoy = useMemo(() => {
    if (!pagos) return [];
    return pagos.filter((p) => p.fecha.slice(0, 10) === hoy);
  }, [pagos, hoy]);

  const resumenPorMetodo = useMemo(() => {
    const mapa = new Map<string, { cantidad: number; monto: number }>();
    pagosHoy.forEach((p) => {
      const actual = mapa.get(p.metodo_pago) ?? { cantidad: 0, monto: 0 };
      actual.cantidad += 1;
      actual.monto += p.monto;
      mapa.set(p.metodo_pago, actual);
    });
    const montoMaximo = Math.max(1, ...Array.from(mapa.values()).map((v) => v.monto));
    return Array.from(mapa.entries())
      .map(([metodo, v]) => ({ metodo, ...v, porcentaje: (v.monto / montoMaximo) * 100 }))
      .sort((a, b) => b.monto - a.monto);
  }, [pagosHoy]);

  const montoTotalHoy = pagosHoy.reduce((suma, p) => suma + p.monto, 0);

  if (!sedeId) {
    return (
      <div className="bg-surface rounded-xl p-10 text-center text-muted text-sm border border-line">
        Tu cuenta no tiene una sede asignada. Pídele a tu Admin de Sede que te la asigne
        desde el módulo de Usuarios.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink">Panel de Recepción</h1>
        <p className="text-muted text-sm mt-1">Resumen de hoy en tu sede</p>
      </div>

      {/* ================= ACCESOS RÁPIDOS ================= */}
      <div className="flex flex-wrap gap-2">
        <Link
          to="/recepcion/control-acceso"
          className="inline-flex items-center gap-2 bg-primary text-ink font-semibold rounded-lg h-10 px-4 text-sm hover:bg-primary-dark transition-colors"
        >
          <ScanLine className="w-4 h-4" />
          Control de acceso
        </Link>
        <Link
          to="/recepcion/buscar-cliente"
          className="inline-flex items-center gap-2 bg-surface border border-line text-ink font-medium rounded-lg h-10 px-4 text-sm hover:bg-white/5 transition-colors"
        >
          <UserRound className="w-4 h-4" />
          Buscar cliente
        </Link>
        <Link
          to="/recepcion/registrar-pago"
          className="inline-flex items-center gap-2 bg-surface border border-line text-ink font-medium rounded-lg h-10 px-4 text-sm hover:bg-white/5 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Registrar pago
        </Link>
      </div>

      {/* ================= KPIs ================= */}
      <AsyncState
        isLoading={cargandoKpis}
        isError={errorKpis}
        errorMessage="No se pudieron cargar los indicadores."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Check-ins hoy" value={String(kpis?.checkinsHoy ?? 0)} icon={ScanLine} />
          <KpiCard label="Clientes activos" value={String(kpis?.clientesActivos ?? 0)} icon={Users} />
          <KpiCard
            label="Membresías por vencer"
            value={String(kpis?.membresiasPorVencer ?? 0)}
            icon={CreditCard}
          />
          <KpiCard label="Ingresos de hoy" value={formatMoney(montoTotalHoy)} icon={TrendingUp} />
        </div>
      </AsyncState>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ================= PAGOS DE HOY POR MÉTODO ================= */}
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <p className="text-sm font-semibold text-ink">Pagos de hoy por método</p>
          </div>
          <div className="p-5">
            {resumenPorMetodo.length === 0 ? (
              <p className="text-muted text-sm text-center py-6">
                Todavía no se registró ningún pago hoy.
              </p>
            ) : (
              <div className="space-y-4">
                {resumenPorMetodo.map((r) => {
                  const Icono = ICONO_METODO[r.metodo] ?? Wallet;
                  return (
                    <div key={r.metodo}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-2 text-ink-2">
                          <Icono className="w-4 h-4 text-muted" />
                          {r.metodo} <span className="text-muted">({r.cantidad})</span>
                        </span>
                        <span className="text-ink font-medium">{formatMoney(r.monto)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-background overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${r.porcentaje}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ================= RESUMEN DEL DÍA ================= */}
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <p className="text-sm font-semibold text-ink">Resumen del día</p>
          </div>
          <div className="divide-y divide-line">
            <FilaResumen label="Check-ins hoy" valor={String(kpis?.checkinsHoy ?? 0)} />
            <FilaResumen label="Pagos registrados hoy" valor={String(pagosHoy.length)} />
            <FilaResumen label="Monto cobrado hoy" valor={formatMoney(montoTotalHoy)} />
            <FilaResumen
              label="Membresías por vencer"
              valor={String(kpis?.membresiasPorVencer ?? 0)}
            />
            <FilaResumen
              label="Membresías vencidas"
              valor={String(kpis?.membresiasVencidas ?? 0)}
            />
          </div>
        </div>
      </div>

      {/* ================= ÚLTIMOS ACCESOS DE HOY ================= */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Últimos accesos de hoy</p>
          <Link to="/recepcion/control-acceso" className="text-xs text-primary hover:text-primary-dark font-medium">
            Ver control de acceso
          </Link>
        </div>

        <AsyncState
          isLoading={cargandoAccesos}
          isError={false}
          isEmpty={!accesosHoy || accesosHoy.length === 0}
          emptyMessage="Aún no hay accesos registrados hoy."
        >
          <table className="w-full text-sm">
            <thead className="bg-black/20 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Cliente</th>
                <th className="text-right px-5 py-3 font-semibold">Hora</th>
              </tr>
            </thead>
            <tbody>
              {(accesosHoy ?? []).slice(0, 8).map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-5 py-3 text-ink">{a.clienteNombre}</td>
                  <td className="px-5 py-3 text-right text-muted text-xs">
                    {new Date(a.fecha_hora).toLocaleTimeString("es-PE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AsyncState>
      </div>
    </div>
  );
}

function FilaResumen({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 text-sm">
      <span className="text-ink-2">{label}</span>
      <span className="text-ink font-semibold">{valor}</span>
    </div>
  );
}