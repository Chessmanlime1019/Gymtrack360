import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Landmark, Printer, Smartphone, Wallet } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { SelectorDia } from "@/components/ui/SelectorDia";
import { obtenerSedesActivas } from "@/services/sedesService";
import { hoyLima, obtenerPagosDelDia } from "@/services/recepcionService";

const METODOS = ["Efectivo", "Yape", "Plin", "Transferencia"] as const;
const ICONO: Record<(typeof METODOS)[number], React.ElementType> = {
  Efectivo: Banknote,
  Yape: Smartphone,
  Plin: Smartphone,
  Transferencia: Landmark,
};

const input =
  "w-full h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

function soles(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima",
  });
}

export default function Caja() {
  const { sesion } = useAuth();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeSel, setSedeSel] = useState<string>(sesion?.sedeId ?? "");
  const sedeId = esSuperAdmin ? sedeSel : (sesion?.sedeId ?? "");
  const [fecha, setFecha] = useState<string>(hoyLima());

  const sedes = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const pagos = useQuery({
    queryKey: ["recepcion-caja", sedeId, fecha],
    queryFn: () => obtenerPagosDelDia(sedeId, fecha),
    enabled: !!sedeId,
    // Los pagos de hoy se refrescan solos cada 30 s.
    refetchInterval: fecha === hoyLima() ? 30_000 : false,
  });

  const datos = pagos.data ?? [];

  const resumen = useMemo(() => {
    const total = datos.reduce((s, p) => s + p.monto, 0);
    const porMetodo = METODOS.map((m) => {
      const filas = datos.filter((p) => p.metodo === m);
      return { metodo: m, cantidad: filas.length, monto: filas.reduce((s, p) => s + p.monto, 0) };
    });
    const efectivo = porMetodo[0].monto;
    return { total, porMetodo, efectivo, digital: total - efectivo };
  }, [datos]);

  const sedeNombre = esSuperAdmin
    ? (sedes.data?.find((s) => s.id === sedeSel)?.nombre ?? "")
    : "Tu sede";
  const fechaLarga = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cierre-caja, #cierre-caja * { visibility: visible !important; }
          #cierre-caja { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 24px; }
          #cierre-caja .gt-kpi, #cierre-caja [class*="bg-"] { background: #fff !important; border-color: #ccc !important; }
          #cierre-caja * { color: #000 !important; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">Caja del día</h1>
          <p className="text-muted text-sm mt-1">
            Lo cobrado por método de pago, para cuadrar al terminar el turno.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SelectorDia value={fecha} onChange={setFecha} />
          <button
            onClick={() => window.print()}
            disabled={datos.length === 0}
            className="h-11 px-4 rounded-xl border border-line text-ink text-sm font-medium hover:border-line-strong inline-flex items-center gap-2 disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir cierre</span>
          </button>
        </div>
      </div>

      {esSuperAdmin && (
        <div className="max-w-xs">
          <label htmlFor="sede" className="block text-xs text-muted mb-1.5">
            Sede con la que operas
          </label>
          <select
            id="sede"
            value={sedeSel}
            onChange={(e) => setSedeSel(e.target.value)}
            className={input}
          >
            <option value="" disabled>
              Selecciona una sede
            </option>
            {sedes.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {!sedeId ? (
        <div className="bg-surface rounded-2xl p-10 text-center text-muted text-sm border border-line">
          {esSuperAdmin ? "Selecciona una sede." : "Tu cuenta no tiene una sede asignada."}
        </div>
      ) : (
        <AsyncState isLoading={pagos.isLoading} isError={pagos.isError}>
          <div id="cierre-caja" className="space-y-5">
            <div className="hidden print:block">
              <p className="text-lg font-bold">GYMTRACK 360 · Cierre de caja</p>
              <p className="text-sm capitalize">
                {sedeNombre} · {fechaLarga}
              </p>
            </div>

            {/* Totales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="gt-kpi p-4 col-span-2 lg:col-span-1 border-primary/40">
                <p className="text-muted text-xs">Total del día</p>
                <p className="text-ink text-2xl font-bold mt-1">{soles(resumen.total)}</p>
                <p className="text-muted text-xs mt-1">{datos.length} pagos</p>
              </div>
              <div className="gt-kpi p-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted text-xs">Efectivo en caja</p>
                  <Banknote className="w-4 h-4 text-primary" />
                </div>
                <p className="text-ink text-xl font-bold mt-1">{soles(resumen.efectivo)}</p>
                <p className="text-muted text-xs mt-1">Debe haber este monto</p>
              </div>
              <div className="gt-kpi p-4 col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted text-xs">Digital (Yape, Plin, transferencia)</p>
                  <Smartphone className="w-4 h-4 text-primary" />
                </div>
                <p className="text-ink text-xl font-bold mt-1">{soles(resumen.digital)}</p>
                <p className="text-muted text-xs mt-1">Revisa tu app o tu banco</p>
              </div>
            </div>

            {/* Por método */}
            <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 space-y-4">
              <p className="text-sm font-semibold text-ink">Por método de pago</p>
              {resumen.porMetodo.map((m) => {
                const Icono = ICONO[m.metodo];
                const pct = resumen.total > 0 ? (m.monto / resumen.total) * 100 : 0;
                return (
                  <div key={m.metodo}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="inline-flex items-center gap-2 text-ink-2">
                        <Icono className="w-4 h-4 text-primary" />
                        {m.metodo}
                        <span className="text-muted text-xs">
                          {m.cantidad} {m.cantidad === 1 ? "pago" : "pagos"}
                        </span>
                      </span>
                      <span className="text-ink font-semibold">{soles(m.monto)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-background overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detalle */}
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b border-line flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-ink">Detalle de pagos</p>
              </div>
              {datos.length === 0 ? (
                <p className="text-center text-muted text-sm py-10">No hay pagos en este día.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {datos.map((p) => (
                    <li key={p.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                      <span className="text-ink font-bold text-sm w-12 shrink-0">{hora(p.fecha)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink truncate">{p.clienteNombre}</p>
                        <p className="text-xs text-muted truncate">
                          {p.planNombre ?? "Pago"} · {p.metodo}
                        </p>
                      </div>
                      <span className="text-ink font-semibold text-sm shrink-0">{soles(p.monto)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </AsyncState>
      )}
    </div>
  );
}