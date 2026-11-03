import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, MinusCircle } from "lucide-react";

import { fechaLargaLima, saludoLima } from "@/lib/fechas";

// Piezas comunes de los paneles (admin, recepción): mismo encabezado, mismas
// tarjetas y mismos paneles para que toda la app se vea consistente.

export const TONOS = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  violeta: "bg-violet-500/10 text-violet-500",
  neutro: "bg-ink/5 text-ink-2",
} as const;
export type Tono = keyof typeof TONOS;

/* ------------------------------------------------------------ encabezado */

export function EncabezadoTablero({
  nombre,
  subtitulo,
  acciones,
}: {
  nombre?: string;
  subtitulo: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{fechaLargaLima()}</p>
        <h1 className="text-2xl md:text-[28px] text-ink mt-1.5">
          {saludoLima()}
          {nombre ? `, ${nombre}` : ""}
        </h1>
        <p className="text-muted text-sm mt-1">{subtitulo}</p>
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2.5">{acciones}</div>}
    </div>
  );
}

const botonBase = "inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold transition-colors";

export function BotonAccion({
  to,
  icono: Icono,
  children,
  principal = false,
}: {
  to: string;
  icono: React.ElementType;
  children: ReactNode;
  principal?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`${botonBase} ${
        principal
          ? "bg-primary text-white hover:bg-primary-dark shadow-sm shadow-primary/20"
          : "bg-surface border border-line text-ink hover:border-line-strong hover:bg-ink/[0.03]"
      }`}
    >
      <Icono className="w-4 h-4" />
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------ tarjetas */

export function KpiCard({
  label,
  value,
  detalle,
  icon: Icon,
  tono,
}: {
  label: string;
  value: string;
  detalle?: string;
  icon: React.ElementType;
  tono: Tono;
}) {
  return (
    <div className="bg-surface rounded-2xl p-5 border border-line flex items-start gap-4 transition-colors hover:border-line-strong">
      <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${TONOS[tono]}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-muted text-[13px] font-medium">{label}</p>
        <p className="text-[26px] leading-tight font-bold tracking-tight text-ink mt-0.5">{value}</p>
        {detalle && <p className="text-muted text-xs mt-0.5 truncate">{detalle}</p>}
      </div>
    </div>
  );
}

export function Panel({
  titulo,
  subtitulo,
  accion,
  children,
  className = "",
  sinRelleno = false,
}: {
  titulo: string;
  subtitulo?: string;
  accion?: { texto: string; to: string };
  children: ReactNode;
  className?: string;
  sinRelleno?: boolean;
}) {
  return (
    <section className={`bg-surface rounded-2xl border border-line overflow-hidden flex flex-col ${className}`}>
      <header className="px-5 pt-5 pb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] text-ink">{titulo}</h2>
          {subtitulo && <p className="text-muted text-xs mt-1">{subtitulo}</p>}
        </div>
        {accion && (
          <Link
            to={accion.to}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark"
          >
            {accion.texto}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </header>
      <div className={sinRelleno ? "pt-3 flex-1" : "px-5 pb-5 pt-3 flex-1"}>{children}</div>
    </section>
  );
}

export function SinDatos({ mensaje, icono: Icono }: { mensaje: string; icono?: React.ElementType }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong min-h-[200px] flex flex-col items-center justify-center gap-2 px-6 text-center">
      {Icono && <Icono className="w-6 h-6 text-muted/70" />}
      <p className="text-muted text-sm">{mensaje}</p>
    </div>
  );
}

/* ------------------------------------------------------------ estado de membresías */

// Barra segmentada + estados en cuadrícula. Cada estado lleva icono y nombre
// (nunca solo color) y en la barra el verde y el rojo nunca quedan juntos.
export function EstadoMembresias({
  vigentes,
  porVencer,
  vencidas,
  canceladas,
}: {
  vigentes: number;
  porVencer: number;
  vencidas: number;
  canceladas: number;
}) {
  const total = vigentes + vencidas + canceladas;
  if (total === 0) return <SinDatos mensaje="Aún no hay membresías registradas" />;

  const pct = (n: number) => Math.round((n / total) * 100);
  const segmentos = [
    { n: vigentes - Math.min(porVencer, vigentes), clase: "bg-success" },
    { n: Math.min(porVencer, vigentes), clase: "bg-warning" },
    { n: canceladas, clase: "bg-muted/40" },
    { n: vencidas, clase: "bg-danger" },
  ].filter((s) => s.n > 0);

  const estados = [
    { nombre: "Vigentes", n: vigentes, icono: CheckCircle2, tono: "success" as Tono },
    { nombre: "Por vencer (7 días)", n: porVencer, icono: Clock, tono: "warning" as Tono },
    { nombre: "Vencidas", n: vencidas, icono: AlertTriangle, tono: "danger" as Tono },
    { nombre: "Canceladas", n: canceladas, icono: MinusCircle, tono: "neutro" as Tono },
  ];

  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className="text-[34px] leading-none font-bold tracking-tight text-ink">{pct(vigentes)}%</span>
        <span className="text-sm text-muted">de las membresías está vigente</span>
      </p>

      <div
        className="flex gap-[3px] h-2.5 mt-5 rounded-full overflow-hidden bg-ink/5"
        role="img"
        aria-label={estados.map((e) => `${e.nombre}: ${e.n}`).join(", ")}
      >
        {segmentos.map((s, i) => (
          <div key={i} className={s.clase} style={{ flexGrow: s.n }} />
        ))}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
        {estados.map(({ nombre, n, icono: Icono, tono }) => (
          <li key={nombre} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${TONOS[tono]}`}>
              <Icono className="w-4 h-4" />
            </span>
            <span className="text-[13px] text-ink-2 flex-1 leading-tight">{nombre}</span>
            <span className="text-base font-bold text-ink tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
