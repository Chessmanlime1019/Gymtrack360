import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CreditCard, Landmark, ScanLine, Smartphone, TrendingUp, UserRound, Users, Wallet } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { PanelAforo } from "@/components/aforo/Aforo";
import { BotonAccion, EncabezadoTablero, EstadoMembresias, KpiCard, Panel, SinDatos } from "@/components/ui/Tablero";
import { diaLima, hoyLima } from "@/lib/fechas";
import { obtenerDashboardGlobal, obtenerMembresiasPorEstado } from "@/services/dashboardService";
import { obtenerAsistencias } from "@/services/asistenciasService";
import { obtenerPagos } from "@/services/pagosService";

function formatMoney(n: number): string {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const horaCorta = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const ICONO_METODO: Record<string, React.ElementType> = {
  Efectivo: Banknote,
  Yape: Smartphone,
  Plin: Smartphone,
  Transferencia: Landmark,
};

export default function RecepcionDashboard() {
  const { sesion } = useAuth();
  const sedeId = sesion?.sedeId ?? null;
  const hoy = hoyLima();

  const { data: kpis, isLoading: cargandoKpis, isError: errorKpis } = useQuery({
    queryKey: ["recepcion-dashboard-kpis", sedeId, hoy],
    queryFn: () => obtenerDashboardGlobal(sedeId, hoy, hoy),
    enabled: !!sedeId,
  });

  const { data: estados } = useQuery({
    queryKey: ["recepcion-dashboard-estados", sedeId],
    queryFn: () => obtenerMembresiasPorEstado(sedeId),
    enabled: !!sedeId,
  });

  const { data: accesosHoy, isLoading: cargandoAccesos } = useQuery({
    queryKey: ["recepcion-dashboard-accesos", sedeId, hoy],
    queryFn: () => obtenerAsistencias(sedeId, hoy, hoy),
    enabled: !!sedeId,
    refetchInterval: 30_000,
  });

  const { data: pagos } = useQuery({
    queryKey: ["recepcion-dashboard-pagos", sedeId, hoy],
    queryFn: () => obtenerPagos(sedeId, hoy, hoy),
    enabled: !!sedeId,
  });

  const pagosHoy = useMemo(() => (pagos ?? []).filter((p) => diaLima(p.fecha) === hoy), [pagos, hoy]);
  const montoTotalHoy = pagosHoy.reduce((suma, p) => suma + p.monto, 0);

  const resumenPorMetodo = useMemo(() => {
    const mapa = new Map<string, { cantidad: number; monto: number }>();
    pagosHoy.forEach((p) => {
      const actual = mapa.get(p.metodo_pago) ?? { cantidad: 0, monto: 0 };
      actual.cantidad += 1;
      actual.monto += p.monto;
      mapa.set(p.metodo_pago, actual);
    });
    return Array.from(mapa.entries())
      .map(([metodo, v]) => ({ metodo, ...v, porcentaje: montoTotalHoy ? (v.monto / montoTotalHoy) * 100 : 0 }))
      .sort((a, b) => b.monto - a.monto);
  }, [pagosHoy, montoTotalHoy]);

  if (!sedeId) {
    return (
      <div className="bg-surface rounded-2xl p-10 text-center text-muted text-sm border border-line">
        Tu cuenta no tiene una sede asignada. Pídele a tu Admin de Sede que te la asigne desde el módulo de Usuarios.
      </div>
    );
  }

  const canceladas = estados?.find((e) => e.estado === "Canceladas")?.cantidad ?? 0;

  return (
    <div className="space-y-6">
      <EncabezadoTablero
        nombre={sesion?.nombre}
        subtitulo="Resumen de hoy en tu sede"
        acciones={
          <>
            <BotonAccion to="/recepcion/buscar-cliente" icono={UserRound}>
              Buscar cliente
            </BotonAccion>
            <BotonAccion to="/recepcion/registrar-pago" icono={Wallet}>
              Registrar pago
            </BotonAccion>
            <BotonAccion to="/recepcion/control-acceso" icono={ScanLine} principal>
              Control de acceso
            </BotonAccion>
          </>
        }
      />

      <AsyncState isLoading={cargandoKpis} isError={errorKpis} errorMessage="No se pudieron cargar los indicadores.">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Check-ins hoy" value={String(kpis?.checkinsHoy ?? 0)} detalle="Ingresos por QR" icon={ScanLine} tono="info" />
          <KpiCard
            label="Clientes activos"
            value={String(kpis?.clientesActivos ?? 0)}
            detalle={`de ${kpis?.totalClientes ?? 0} registrados`}
            icon={Users}
            tono="primary"
          />
          <KpiCard
            label="Por vencer"
            value={String(kpis?.membresiasPorVencer ?? 0)}
            detalle="En los próximos 7 días"
            icon={CreditCard}
            tono="warning"
          />
          <KpiCard
            label="Ingresos de hoy"
            value={formatMoney(montoTotalHoy)}
            detalle={`${pagosHoy.length} ${pagosHoy.length === 1 ? "pago" : "pagos"} registrados`}
            icon={TrendingUp}
            tono="success"
          />
        </div>
      </AsyncState>

      <PanelAforo sedeId={sedeId} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel
          titulo="Pagos de hoy por método"
          subtitulo={`${formatMoney(montoTotalHoy)} cobrados hoy`}
          accion={{ texto: "Caja del día", to: "/recepcion/caja" }}
        >
          {resumenPorMetodo.length === 0 ? (
            <SinDatos mensaje="Todavía no se registró ningún pago hoy" icono={Wallet} />
          ) : (
            <ul className="space-y-1">
              {resumenPorMetodo.map((r) => {
                const Icono = ICONO_METODO[r.metodo] ?? Wallet;
                return (
                  <li key={r.metodo} className="flex items-center gap-3.5 rounded-xl px-2 py-2.5 -mx-2">
                    <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-ink/5 text-ink-2">
                      <Icono className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-ink font-medium">
                          {r.metodo}
                          <span className="text-muted text-xs font-normal ml-1.5">
                            {r.cantidad} {r.cantidad === 1 ? "pago" : "pagos"}
                          </span>
                        </span>
                        <span className="text-sm font-bold text-ink tabular-nums">{formatMoney(r.monto)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink/5 mt-2">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(4, r.porcentaje)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel titulo="Membresías de tu sede" subtitulo="Estado actual" accion={{ texto: "Ver membresías", to: "/recepcion/membresias" }}>
          <EstadoMembresias
            vigentes={kpis?.membresiasActivas ?? 0}
            porVencer={kpis?.membresiasPorVencer ?? 0}
            vencidas={kpis?.membresiasVencidas ?? 0}
            canceladas={canceladas}
          />
        </Panel>
      </div>

      <Panel
        titulo="Últimos accesos de hoy"
        subtitulo={`${accesosHoy?.length ?? 0} ingresos registrados`}
        accion={{ texto: "Control de acceso", to: "/recepcion/control-acceso" }}
        sinRelleno
      >
        <AsyncState
          isLoading={cargandoAccesos}
          isError={false}
          isEmpty={!accesosHoy || accesosHoy.length === 0}
          emptyMessage="Aún no hay accesos registrados hoy."
        >
          <ul className="divide-y divide-line border-t border-line">
            {(accesosHoy ?? []).slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-ink/[0.03]">
                <span className="w-9 h-9 rounded-full grid place-items-center shrink-0 bg-primary/10 text-primary text-xs font-bold">
                  {iniciales(a.clienteNombre)}
                </span>
                <span className="flex-1 min-w-0 text-sm text-ink font-medium truncate">{a.clienteNombre}</span>
                <span className="text-xs font-medium text-ink-2 tabular-nums bg-ink/5 rounded-full px-2.5 py-1">
                  {horaCorta(a.fecha_hora)}
                </span>
              </li>
            ))}
          </ul>
        </AsyncState>
      </Panel>
    </div>
  );
}
