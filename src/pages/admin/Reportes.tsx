
import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { diaLima, finDiaLima, hoyLima, inicioDiaLima, primerDiaMesLima } from "@/lib/fechas";
import { descargarExcel, descargarPdf, fechaHoraTexto, type ColumnaExport, type ReporteExport } from "@/lib/exportar";
import { estadoEfectivo } from "@/lib/paginar";
import { BadgeEstadoMembresia } from "@/components/ui/BadgeEstadoMembresia";
import { obtenerSedesActivas, obtenerTodasLasSedes } from "@/services/sedesService";
import { obtenerClientes, obtenerClientesSimple } from "@/services/clientesService";
import { obtenerMembresias } from "@/services/membresiasService";
import { obtenerPagos } from "@/services/pagosService";
import { obtenerAsistencias } from "@/services/asistenciasService";
import { obtenerHistorial } from "@/services/historialService";
import {
  CalendarDays,
  Download,
  FileText,
  Users,
  CreditCard,
  ScanLine,
  Wallet,
  History,
  Loader2,
} from "lucide-react";

type ReporteTipo = "clientes" | "membresias" | "asistencias" | "pagos" | "historial";


function formatMoney(n: number): string {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ETIQUETA_ESTADO: Record<string, string> = { activa: "Activa", vencida: "Vencida", cancelada: "Cancelada" };

const minutosEntre = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);

// Fecha sin hora (YYYY-MM-DD) tal cual, sin pasar por la zona horaria del equipo.
const fechaCorta = (f: string) => f.slice(0, 10).split("-").reverse().join("/");

const TABS: { key: ReporteTipo; label: string; icon: React.ElementType }[] = [
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "membresias", label: "Membresías", icon: CreditCard },
  { key: "asistencias", label: "Asistencias", icon: ScanLine },
  { key: "pagos", label: "Pagos", icon: Wallet },
  { key: "historial", label: "Historial", icon: History },
];

const ARCHIVOS: Record<ReporteTipo, string> = {
  clientes: "reporte_clientes",
  membresias: "reporte_membresias",
  asistencias: "reporte_asistencias",
  pagos: "reporte_pagos",
  historial: "historial_operaciones",
};

const TITULOS: Record<ReporteTipo, string> = {
  clientes: "Reporte de clientes",
  membresias: "Reporte de membresías",
  asistencias: "Reporte de asistencias",
  pagos: "Reporte de pagos",
  historial: "Historial de operaciones",
};

export default function AdminReportes() {
  const { sesion } = useAuth();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [tab, setTab] = useState<ReporteTipo>("clientes");
  const [sedeFiltro, setSedeFiltro] = useState<string>(sesion?.sedeId ?? "");
  const [clienteFiltro, setClienteFiltro] = useState<string>("");
  const [desde, setDesde] = useState(primerDiaMesLima());
  const [hasta, setHasta] = useState(hoyLima());

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
  const nombreSedeActiva = sedeFiltro ? (mapaSedes.get(sedeFiltro) ?? "") : "Todas las sedes";


  // Para el filtro "Cliente" (solo en Membresías por ahora -- ver nota
  // en el mensaje: para sumarlo también en Pagos/Asistencias hace falta
  // confirmar que esos servicios exponen cliente_id).
  const { data: clientesSimple } = useQuery({
    queryKey: ["clientes-simple-filtro", sedeActivaId],
    queryFn: () => obtenerClientesSimple(sedeActivaId),
    enabled: tab === "membresias",
  });

  const { data: clientes, isLoading: loadingClientes, isError: errorClientes } = useQuery({
    queryKey: ["reporte-clientes", sedeActivaId],
    queryFn: () => obtenerClientes(sedeActivaId),
    enabled: tab === "clientes",
  });

  const { data: membresias, isLoading: loadingMembresias, isError: errorMembresias } = useQuery({
    queryKey: ["reporte-membresias", sedeActivaId],
    queryFn: () => obtenerMembresias(sedeActivaId),
    enabled: tab === "membresias",
  });

  const { data: asistencias, isLoading: loadingAsistencias, isError: errorAsistencias } = useQuery({
    queryKey: ["reporte-asistencias", sedeActivaId, desde, hasta],
    queryFn: () => obtenerAsistencias(sedeActivaId, desde, hasta),
    enabled: tab === "asistencias",
  });

  const { data: pagos, isLoading: loadingPagos, isError: errorPagos } = useQuery({
    queryKey: ["reporte-pagos", sedeActivaId, desde, hasta],
    queryFn: () => obtenerPagos(sedeActivaId, desde, hasta),
    enabled: tab === "pagos",
  });

  const { data: historial, isLoading: loadingHistorial, isError: errorHistorial } = useQuery({
    queryKey: ["reporte-historial", sedeActivaId, desde, hasta],
    queryFn: () => obtenerHistorial(sedeActivaId, inicioDiaLima(desde), finDiaLima(hasta)),
    enabled: tab === "historial",
  });

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return [];
    const hoy = hoyLima();
    return clientes
      .filter((c) => {
        const fechaCreado = diaLima(c.created_at);
        return fechaCreado >= desde && fechaCreado <= hasta;
      })
      .map((c) => ({
        ...c,
        membresiaEstado:
          c.membresiaEstado && c.membresiaFechaFin ? estadoEfectivo(c.membresiaEstado, c.membresiaFechaFin, hoy) : c.membresiaEstado,
      }));
  }, [clientes, desde, hasta]);

  const membresiasFiltradas = useMemo(() => {
    if (!membresias) return [];
    const hoy = hoyLima();
    return membresias
      .filter((m) => {
        const enRango = m.fecha_inicio >= desde && m.fecha_inicio <= hasta;
        const coincideCliente = !clienteFiltro || m.cliente_id === clienteFiltro;
        return enRango && coincideCliente;
      })
      .map((m) => ({ ...m, estado: estadoEfectivo(m.estado, m.fecha_fin, hoy) }));
  }, [membresias, desde, hasta, clienteFiltro]);

  const pagosFiltrados = pagos ?? [];

  const nombreSede = (id: string | null | undefined) => (id ? (mapaSedes.get(id) ?? "") : "");

  // Cada reporte se define una sola vez: de aquí salen el PDF y el Excel.
  function armarReporte(): ReporteExport<any> {
    const base = {
      titulo: TITULOS[tab],
      subtitulo: `${esSuperAdmin ? nombreSedeActiva : nombreSede(sesion?.sedeId)} · ${fechaCorta(desde)} al ${fechaCorta(hasta)}`,
      archivo: `${ARCHIVOS[tab]}_${desde}_${hasta}`,
    };
    const como = <T,>(columnas: ColumnaExport<T>[], filas: T[]): ReporteExport<any> => ({ ...base, columnas, filas });

    if (tab === "clientes") {
      return como<(typeof clientesFiltrados)[number]>(
        [
          { titulo: "Nombre", valor: (c) => c.nombre, ancho: 2 },
          { titulo: "Apellido", valor: (c) => c.apellido, ancho: 2 },
          { titulo: "Sede", valor: (c) => nombreSede(c.sede_id), ancho: 2.4 },
          { titulo: "Membresía", valor: (c) => (c.membresiaEstado ? ETIQUETA_ESTADO[c.membresiaEstado] : "Sin membresía"), ancho: 1.4 },
          { titulo: "Vence", valor: (c) => c.membresiaFechaFin, tipo: "fecha", ancho: 1.1 },
          { titulo: "Registrado", valor: (c) => diaLima(c.created_at), tipo: "fecha", ancho: 1.1 },
        ],
        clientesFiltrados
      );
    }
    if (tab === "membresias") {
      return como<(typeof membresiasFiltradas)[number]>(
        [
          { titulo: "Cliente", valor: (m) => m.clienteNombre, ancho: 2.6 },
          { titulo: "Plan", valor: (m) => m.planNombre, ancho: 1.6 },
          { titulo: "Estado", valor: (m) => ETIQUETA_ESTADO[m.estado] ?? m.estado, ancho: 1 },
          { titulo: "Inicio", valor: (m) => m.fecha_inicio, tipo: "fecha", ancho: 1 },
          { titulo: "Vence", valor: (m) => m.fecha_fin, tipo: "fecha", ancho: 1 },
          { titulo: "Sede", valor: (m) => nombreSede(m.sede_origen_id), ancho: 2.2 },
        ],
        membresiasFiltradas
      );
    }
    if (tab === "asistencias") {
      return como<NonNullable<typeof asistencias>[number]>(
        [
          { titulo: "Cliente", valor: (a) => a.clienteNombre, ancho: 2.6 },
          { titulo: "Sede", valor: (a) => nombreSede(a.sede_id), ancho: 2.2 },
          { titulo: "Entrada", valor: (a) => a.fecha_hora, tipo: "fechaHora", ancho: 1.4 },
          { titulo: "Salida", valor: (a) => a.salida_at, tipo: "fechaHora", ancho: 1.4 },
          { titulo: "Minutos", valor: (a) => (a.salida_at ? minutosEntre(a.fecha_hora, a.salida_at) : null), tipo: "entero", ancho: 0.7 },
        ],
        asistencias ?? []
      );
    }
    if (tab === "pagos") {
      return como<(typeof pagosFiltrados)[number]>(
        [
          { titulo: "Fecha", valor: (p) => p.fecha, tipo: "fechaHora", ancho: 1.4 },
          { titulo: "Cliente", valor: (p) => p.clienteNombre, ancho: 2.6 },
          { titulo: "Sede", valor: (p) => nombreSede(p.sede_id), ancho: 2.2 },
          { titulo: "Método", valor: (p) => p.metodo_pago, ancho: 1.1 },
          { titulo: "Monto", valor: (p) => p.monto, tipo: "moneda", total: true, ancho: 1.1 },
        ],
        pagosFiltrados
      );
    }
    return como<NonNullable<typeof historial>[number]>(
      [
        { titulo: "Fecha", valor: (h) => h.created_at, tipo: "fechaHora", ancho: 1.3 },
        { titulo: "Quién", valor: (h) => h.actorNombre ?? "Sistema", ancho: 1.7 },
        { titulo: "Acción", valor: (h) => h.descripcion, ancho: 4 },
        { titulo: "Sede", valor: (h) => h.sedeNombre, ancho: 1.7 },
      ],
      historial ?? []
    );
  }

  const exportar = useMutation({
    mutationFn: async (formato: "pdf" | "excel") => {
      const reporte = armarReporte();
      await (formato === "pdf" ? descargarPdf(reporte) : descargarExcel(reporte));
    },
  });

  const isLoading =
    (tab === "clientes" && loadingClientes) ||
    (tab === "membresias" && loadingMembresias) ||
    (tab === "asistencias" && loadingAsistencias) ||
    (tab === "pagos" && loadingPagos) ||
    (tab === "historial" && loadingHistorial);

  const hayError =
    (tab === "clientes" && errorClientes) ||
    (tab === "membresias" && errorMembresias) ||
    (tab === "asistencias" && errorAsistencias) ||
    (tab === "pagos" && errorPagos) ||
    (tab === "historial" && errorHistorial);

  const datos =
    tab === "clientes"
      ? clientesFiltrados
      : tab === "membresias"
        ? membresiasFiltradas
        : tab === "asistencias"
          ? (asistencias ?? [])
          : tab === "pagos"
            ? pagosFiltrados
            : (historial ?? []);

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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportar.mutate("pdf")}
            disabled={!datos || datos.length === 0 || exportar.isPending}
            className="bg-surface border border-line text-ink font-semibold rounded-xl h-11 px-4 text-sm inline-flex items-center gap-2 hover:bg-ink/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exportar.isPending && exportar.variables === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            PDF
          </button>
          <button
            onClick={() => exportar.mutate("excel")}
            disabled={!datos || datos.length === 0 || exportar.isPending}
            className="bg-primary text-white font-semibold rounded-xl h-11 px-4 text-sm inline-flex items-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exportar.isPending && exportar.variables === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Excel
          </button>
        </div>
      </div>

      {exportar.isError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm px-4 py-3">
          No se pudo generar el archivo. Intenta de nuevo.
        </div>
      )}

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        {esSuperAdmin && (
          <select
            value={sedeFiltro}
            onChange={(e) => setSedeFiltro(e.target.value)}
            className="h-11 rounded-lg bg-surface border border-line px-4 text-sm text-ink outline-none sm:w-56 focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
          >
            <option value="">Todas las sedes</option>
            {sedes?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        )}

        {tab === "membresias" && (
          <select
            value={clienteFiltro}
            onChange={(e) => setClienteFiltro(e.target.value)}
            className="h-11 rounded-lg bg-surface border border-line px-4 text-sm text-ink outline-none sm:w-56 focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
          >
            <option value="">Todos los clientes</option>
            {clientesSimple?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted shrink-0" />
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="h-11 rounded-lg bg-surface border border-line px-3 text-sm text-ink outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
          />
          <span className="text-muted text-xs">a</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="h-11 rounded-lg bg-surface border border-line px-3 text-sm text-ink outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/10 transition-colors"
          />
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 border border-line overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? "bg-primary text-white" : "text-muted hover:text-ink hover:bg-ink/5"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div>
        <AsyncState
          isLoading={isLoading}
          isError={!!hayError}
          errorMessage="No se pudo cargar el reporte."
          isEmpty={!datos || datos.length === 0}
          emptyMessage={`No hay ${tab === "historial" ? "operaciones" : tab} para mostrar en el periodo seleccionado.`}
        >
          {/* TABLA DESKTOP */}
          <div className="hidden md:block bg-surface rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/70 text-muted text-xs uppercase tracking-wide">
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
                      <th className="text-left px-5 py-4 font-semibold">Entrada</th>
                      <th className="text-left px-5 py-4 font-semibold">Salida</th>
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
                  {tab === "historial" && (
                    <>
                      <th className="text-left px-5 py-4 font-semibold">Fecha</th>
                      <th className="text-left px-5 py-4 font-semibold">Quién</th>
                      <th className="text-left px-5 py-4 font-semibold">Acción</th>
                      <th className="text-left px-5 py-4 font-semibold">Sede</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {tab === "clientes" &&
                  clientesFiltrados.map((c) => (
                    <tr key={c.id} className="border-t border-line hover:bg-ink/[0.03] transition-colors">
                      <td className="px-5 py-4 text-ink font-medium">
                        {c.nombre} {c.apellido}
                      </td>
                      <td className="px-5 py-4">
                        <BadgeEstadoMembresia estado={c.membresiaEstado} />
                      </td>
                      <td className="px-5 py-4 text-muted text-xs">
                        {c.membresiaFechaFin
                          ? fechaCorta(c.membresiaFechaFin)
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-muted text-xs">
                        {fechaCorta(diaLima(c.created_at))}
                      </td>
                    </tr>
                  ))}

                {tab === "membresias" &&
                  membresiasFiltradas.map((m) => (
                    <tr key={m.id} className="border-t border-line hover:bg-ink/[0.03] transition-colors">
                      <td className="px-5 py-4 text-ink font-medium">{m.clienteNombre}</td>
                      <td className="px-5 py-4 text-ink-2">{m.planNombre}</td>
                      <td className="px-5 py-4">
                        <BadgeEstadoMembresia estado={m.estado} />
                      </td>
                      <td className="px-5 py-4 text-muted text-xs">{fechaCorta(m.fecha_inicio)}</td>
                      <td className="px-5 py-4 text-muted text-xs">{fechaCorta(m.fecha_fin)}</td>
                    </tr>
                  ))}

                {tab === "asistencias" &&
                  (asistencias ?? []).map((a) => (
                    <tr key={a.id} className="border-t border-line hover:bg-ink/[0.03] transition-colors">
                      <td className="px-5 py-4 text-ink font-medium">{a.clienteNombre}</td>
                      <td className="px-5 py-4 text-muted text-xs">
                        {mapaSedes.get(a.sede_id) ?? a.sede_id}
                      </td>
                      <td className="px-5 py-4 text-muted text-xs">
                        {fechaHoraTexto(a.fecha_hora)}
                      </td>
                      <td className="px-5 py-4 text-muted text-xs">
                        {a.salida_at ? fechaHoraTexto(a.salida_at) : "—"}
                      </td>
                    </tr>
                  ))}

                {tab === "pagos" &&
                  pagosFiltrados.map((p) => (
                    <tr key={p.id} className="border-t border-line hover:bg-ink/[0.03] transition-colors">
                      <td className="px-5 py-4 text-ink font-medium">{p.clienteNombre}</td>
                      <td className="px-5 py-4 text-muted text-xs">
                        {mapaSedes.get(p.sede_id) ?? p.sede_id}
                      </td>
                      <td className="px-5 py-4 text-right text-ink font-medium">
                        {formatMoney(p.monto)}
                      </td>
                      <td className="px-5 py-4 text-ink-2">{p.metodo_pago}</td>
                      <td className="px-5 py-4 text-muted text-xs">
                        {fechaHoraTexto(p.fecha)}
                      </td>
                    </tr>
                  ))}

                {tab === "historial" &&
                  (historial ?? []).map((h) => (
                    <tr key={h.id} className="border-t border-line hover:bg-ink/[0.03] transition-colors">
                      <td className="px-5 py-4 text-muted text-xs whitespace-nowrap">
                        {fechaHoraTexto(h.created_at)}
                      </td>
                      <td className="px-5 py-4 text-ink-2">{h.actorNombre}</td>
                      <td className="px-5 py-4 text-ink">{h.descripcion}</td>
                      <td className="px-5 py-4 text-muted text-xs">{h.sedeNombre ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* CARDS MÓVIL */}
          <div className="md:hidden space-y-3">
            {tab === "clientes" &&
              clientesFiltrados.map((c) => (
                <div key={c.id} className="bg-surface rounded-xl p-4 border border-line space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm text-ink">
                      {c.nombre} {c.apellido}
                    </p>
                    <BadgeEstadoMembresia estado={c.membresiaEstado} />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-line text-muted">
                    <span>Registrado {fechaCorta(diaLima(c.created_at))}</span>
                    {c.membresiaFechaFin && (
                      <span>Vence {fechaCorta(c.membresiaFechaFin)}</span>
                    )}
                  </div>
                </div>
              ))}

            {tab === "membresias" &&
              membresiasFiltradas.map((m) => (
                <div key={m.id} className="bg-surface rounded-xl p-4 border border-line space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-ink">{m.clienteNombre}</p>
                      <p className="text-muted text-xs mt-1">{m.planNombre}</p>
                    </div>
                    <BadgeEstadoMembresia estado={m.estado} />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-line text-muted">
                    <span>{fechaCorta(m.fecha_inicio)}</span>
                    <span>{fechaCorta(m.fecha_fin)}</span>
                  </div>
                </div>
              ))}

            {tab === "asistencias" &&
              (asistencias ?? []).map((a) => (
                <div key={a.id} className="bg-surface rounded-xl p-4 border border-line">
                  <p className="font-medium text-sm text-ink">{a.clienteNombre}</p>
                  <p className="text-muted text-xs mt-1">
                    {fechaHoraTexto(a.fecha_hora)}
                  </p>
                </div>
              ))}

            {tab === "pagos" &&
              pagosFiltrados.map((p) => (
                <div key={p.id} className="bg-surface rounded-xl p-4 border border-line space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm text-ink">{p.clienteNombre}</p>
                    <p className="font-medium text-sm text-primary">{formatMoney(p.monto)}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{p.metodo_pago}</span>
                    <span>{fechaHoraTexto(p.fecha)}</span>
                  </div>
                  <p className="text-muted text-xs">{mapaSedes.get(p.sede_id) ?? p.sede_id}</p>
                </div>
              ))}

            {tab === "historial" &&
              (historial ?? []).map((h) => (
                <div key={h.id} className="bg-surface rounded-xl p-4 border border-line space-y-2">
                  <p className="text-sm text-ink">{h.descripcion}</p>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{h.actorNombre}</span>
                    <span>{fechaHoraTexto(h.created_at)}</span>
                  </div>
                  {h.sedeNombre && <p className="text-muted text-xs">{h.sedeNombre}</p>}
                </div>
              ))}
          </div>
        </AsyncState>
      </div>
    </div>
  );
}