import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { BadgeEstadoMembresia } from "@/components/ui/BadgeEstadoMembresia";
import { obtenerSedesActivas, obtenerTodasLasSedes } from "@/services/sedesService";
import { obtenerClientes } from "@/services/clientesService";
import { obtenerMembresias } from "@/services/membresiasService";
import { obtenerPagos } from "@/services/pagosService";
import { obtenerAsistencias } from "@/services/asistenciasService";
import {
  CalendarDays,
  Download,
  Users,
  CreditCard,
  ScanLine,
  Wallet,
} from "lucide-react";

type ReporteTipo = "clientes" | "membresias" | "asistencias" | "pagos";

function primerDiaMes(): string {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n: number): string {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function exportarCSV(encabezados: string[], filas: string[][], nombreArchivo: string) {
  const csvContent = [
    encabezados.join(","),
    ...filas.map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nombreArchivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const TABS: { key: ReporteTipo; label: string; icon: React.ElementType }[] = [
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "membresias", label: "Membresías", icon: CreditCard },
  { key: "asistencias", label: "Asistencias", icon: ScanLine },
  { key: "pagos", label: "Pagos", icon: Wallet },
];

export default function AdminReportes() {
  const { sesion } = useAuth();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [tab, setTab] = useState<ReporteTipo>("clientes");
  const [sedeFiltro, setSedeFiltro] = useState<string>(sesion?.sedeId ?? "");
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoyISO());

  const { data: sedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const { data: todasLasSedes } = useQuery({
    queryKey: ["todas-las-sedes-nombres"],
    queryFn: obtenerTodasLasSedes,
  });

  const mapaSedes = useMemo(() => {
    return new Map((todasLasSedes ?? []).map((s) => [s.id, s.nombre]));
  }, [todasLasSedes]);

  const sedeActivaId = esSuperAdmin ? (sedeFiltro || null) : (sesion?.sedeId ?? null);

  const hastaFinal = useMemo(() => {
    const d = new Date(hasta);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [hasta]);

  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ["reporte-clientes", sedeActivaId],
    queryFn: () => obtenerClientes(sedeActivaId),
    enabled: tab === "clientes",
  });

  const { data: membresias, isLoading: loadingMembresias } = useQuery({
    queryKey: ["reporte-membresias", sedeActivaId],
    queryFn: () => obtenerMembresias(sedeActivaId),
    enabled: tab === "membresias",
  });

  const { data: asistencias, isLoading: loadingAsistencias } = useQuery({
    queryKey: ["reporte-asistencias", sedeActivaId, desde, hasta],
    queryFn: () => obtenerAsistencias(sedeActivaId, desde, hastaFinal),
    enabled: tab === "asistencias",
  });

  const { data: pagos, isLoading: loadingPagos } = useQuery({
    queryKey: ["reporte-pagos", sedeActivaId],
    queryFn: () => obtenerPagos(sedeActivaId),
    enabled: tab === "pagos",
  });

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return [];
    return clientes.filter((c) => {
      const fechaCreado = c.created_at.slice(0, 10);
      return fechaCreado >= desde && fechaCreado <= hasta;
    });
  }, [clientes, desde, hasta]);

  const membresiasFiltradas = useMemo(() => {
    if (!membresias) return [];
    return membresias.filter((m) => {
      return m.fecha_inicio >= desde && m.fecha_inicio <= hasta;
    });
  }, [membresias, desde, hasta]);

  const pagosFiltrados = useMemo(() => {
    if (!pagos) return [];
    return pagos.filter((p) => {
      const fechaPago = p.fecha.slice(0, 10);
      return fechaPago >= desde && fechaPago <= hasta;
    });
  }, [pagos, desde, hasta]);

  function exportar() {
    if (tab === "clientes") {
      exportarCSV(
        ["Nombre", "Apellido", "Sede", "Membresía", "Vence", "Registrado"],
        clientesFiltrados.map((c) => [
          c.nombre,
          c.apellido,
          mapaSedes.get(c.sede_id ?? "") ?? c.sede_id ?? "",
          c.membresiaEstado ?? "Sin membresía",
          c.membresiaFechaFin ?? "",
          new Date(c.created_at).toLocaleDateString("es-PE"),
        ]),
        `reporte_clientes_${desde}_${hasta}`
      );
    } else if (tab === "membresias") {
      exportarCSV(
        ["Cliente", "Plan", "Estado", "Inicio", "Vence", "Sede"],
        membresiasFiltradas.map((m) => [
          m.clienteNombre,
          m.planNombre,
          m.estado,
          m.fecha_inicio,
          m.fecha_fin,
          mapaSedes.get(m.sede_origen_id) ?? m.sede_origen_id,
        ]),
        `reporte_membresias_${desde}_${hasta}`
      );
    } else if (tab === "asistencias") {
      exportarCSV(
        ["Cliente", "Sede", "Fecha/Hora"],
        (asistencias ?? []).map((a) => [
          a.clienteNombre,
          mapaSedes.get(a.sede_id) ?? a.sede_id,
          new Date(a.fecha_hora).toLocaleString("es-PE"),
        ]),
        `reporte_asistencias_${desde}_${hasta}`
      );
    } else if (tab === "pagos") {
      exportarCSV(
        ["Cliente", "Monto", "Método", "Fecha", "Sede"],
        pagosFiltrados.map((p) => [
          p.clienteNombre,
          String(p.monto),
          p.metodo_pago,
          new Date(p.fecha).toLocaleString("es-PE"),
          mapaSedes.get(p.sede_id) ?? p.sede_id,
        ]),
        `reporte_pagos_${desde}_${hasta}`
      );
    }
  }

  const isLoading =
    (tab === "clientes" && loadingClientes) ||
    (tab === "membresias" && loadingMembresias) ||
    (tab === "asistencias" && loadingAsistencias) ||
    (tab === "pagos" && loadingPagos);

  const datos = tab === "clientes"
    ? clientesFiltrados
    : tab === "membresias"
    ? membresiasFiltradas
    : tab === "asistencias"
    ? asistencias ?? []
    : pagosFiltrados;

  return (
    <div className="space-y-6">

      {/* CABECERA */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink">Reportes</h1>
          <p className="text-muted text-sm">
            {esSuperAdmin ? "Reportes globales de todas las sedes" : "Reportes de tu sede"}
          </p>
        </div>
        <button
          onClick={exportar}
          disabled={!datos || datos.length === 0}
          className="shrink-0 bg-primary text-white font-semibold rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
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

      {/* TABS */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 border border-line overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-ink hover:bg-black/5"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <AsyncState
        isLoading={isLoading}
        isError={false}
        isEmpty={!datos || datos.length === 0}
        emptyMessage={`No hay ${tab} para mostrar en el periodo seleccionado.`}
      >
        {/* TABLA DESKTOP */}
        <div className="hidden md:block bg-surface rounded-[14px] border border-line overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] text-muted text-[11px] uppercase tracking-[0.08em]">
              <tr>
                {tab === "clientes" && (
                  <>
                    <th className="text-left px-5 py-4 font-semibold">Nombre</th>
                    <th className="text-left px-5 py-4 font-semibold">Membresía</th>
                    <th className="text-left px-5 py-4 font-semibold">Vence</th>
                    <th className="text-left px-5 py-4 font-semibold">Registrado</th>
                  </>
                )}
                {tab === "membresias" && (
                  <>
                    <th className="text-left px-5 py-4 font-semibold">Cliente</th>
                    <th className="text-left px-5 py-4 font-semibold">Plan</th>
                    <th className="text-left px-5 py-4 font-semibold">Estado</th>
                    <th className="text-left px-5 py-4 font-semibold">Inicio</th>
                    <th className="text-left px-5 py-4 font-semibold">Vence</th>
                  </>
                )}
                {tab === "asistencias" && (
                  <>
                    <th className="text-left px-5 py-4 font-semibold">Cliente</th>
                    <th className="text-left px-5 py-4 font-semibold">Sede</th>
                    <th className="text-left px-5 py-4 font-semibold">Fecha/Hora</th>
                  </>
                )}
                {tab === "pagos" && (
                  <>
                    <th className="text-left px-5 py-4 font-semibold">Cliente</th>
                    <th className="text-left px-5 py-4 font-semibold">Sede</th>
                    <th className="text-right px-5 py-4 font-semibold">Monto</th>
                    <th className="text-left px-5 py-4 font-semibold">Método</th>
                    <th className="text-left px-5 py-4 font-semibold">Fecha</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tab === "clientes" &&
                clientesFiltrados.map((c) => (
                  <tr key={c.id} className="border-t border-line hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-4 text-ink font-medium">{c.nombre} {c.apellido}</td>
                    <td className="px-5 py-4"><BadgeEstadoMembresia estado={c.membresiaEstado} /></td>
                    <td className="px-5 py-4 text-muted text-xs">
                      {c.membresiaFechaFin ? new Date(c.membresiaFechaFin).toLocaleDateString("es-PE") : "—"}
                    </td>
                    <td className="px-5 py-4 text-muted text-xs">
                      {new Date(c.created_at).toLocaleDateString("es-PE")}
                    </td>
                  </tr>
                ))}

              {tab === "membresias" &&
                membresiasFiltradas.map((m) => (
                  <tr key={m.id} className="border-t border-line hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-4 text-ink font-medium">{m.clienteNombre}</td>
                    <td className="px-5 py-4 text-muted">{m.planNombre}</td>
                    <td className="px-5 py-4"><BadgeEstadoMembresia estado={m.estado} /></td>
                    <td className="px-5 py-4 text-muted text-xs">{m.fecha_inicio}</td>
                    <td className="px-5 py-4 text-muted text-xs">{m.fecha_fin}</td>
                  </tr>
                ))}

              {tab === "asistencias" &&
                (asistencias ?? []).map((a) => (
                  <tr key={a.id} className="border-t border-line hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-4 text-ink font-medium">{a.clienteNombre}</td>
                    <td className="px-5 py-4 text-muted text-xs">{mapaSedes.get(a.sede_id) ?? a.sede_id}</td>
                    <td className="px-5 py-4 text-muted text-xs">
                      {new Date(a.fecha_hora).toLocaleString("es-PE")}
                    </td>
                  </tr>
                ))}

              {tab === "pagos" &&
                pagosFiltrados.map((p) => (
                  <tr key={p.id} className="border-t border-line hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-4 text-ink font-medium">{p.clienteNombre}</td>
                    <td className="px-5 py-4 text-muted text-xs">{mapaSedes.get(p.sede_id) ?? p.sede_id}</td>
                    <td className="px-5 py-4 text-right font-medium">{formatMoney(p.monto)}</td>
                    <td className="px-5 py-4 text-muted">{p.metodo_pago}</td>
                    <td className="px-5 py-4 text-muted text-xs">
                      {new Date(p.fecha).toLocaleString("es-PE")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* CARDS MOVIL */}
        <div className="md:hidden space-y-3">
          {tab === "clientes" &&
            clientesFiltrados.map((c) => (
              <div key={c.id} className="bg-surface rounded-[14px] p-4 border border-line space-y-3">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm text-ink">{c.nombre} {c.apellido}</p>
                  <BadgeEstadoMembresia estado={c.membresiaEstado} />
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-line text-muted">
                  <span>Registrado {new Date(c.created_at).toLocaleDateString("es-PE")}</span>
                  {c.membresiaFechaFin && <span>Vence {new Date(c.membresiaFechaFin).toLocaleDateString("es-PE")}</span>}
                </div>
              </div>
            ))}

          {tab === "membresias" &&
            membresiasFiltradas.map((m) => (
              <div key={m.id} className="bg-surface rounded-[14px] p-4 border border-line space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm text-ink">{m.clienteNombre}</p>
                    <p className="text-muted text-xs mt-1">{m.planNombre}</p>
                  </div>
                  <BadgeEstadoMembresia estado={m.estado} />
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-line text-muted">
                  <span>{m.fecha_inicio}</span>
                  <span>{m.fecha_fin}</span>
                </div>
              </div>
            ))}

          {tab === "asistencias" &&
            (asistencias ?? []).map((a) => (
              <div key={a.id} className="bg-surface rounded-[14px] p-4 border border-line">
                <p className="font-medium text-sm text-ink">{a.clienteNombre}</p>
                <p className="text-muted text-xs mt-1">
                  {new Date(a.fecha_hora).toLocaleString("es-PE")}
                </p>
              </div>
            ))}

          {tab === "pagos" &&
            pagosFiltrados.map((p) => (
              <div key={p.id} className="bg-surface rounded-[14px] p-4 border border-line space-y-2">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm text-ink">{p.clienteNombre}</p>
                  <p className="font-medium text-sm text-primary">{formatMoney(p.monto)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{p.metodo_pago}</span>
                  <span>{new Date(p.fecha).toLocaleString("es-PE")}</span>
                </div>
                <p className="text-muted text-xs">{mapaSedes.get(p.sede_id) ?? p.sede_id}</p>
              </div>
            ))}
        </div>
      </AsyncState>

    </div>
  );
}
