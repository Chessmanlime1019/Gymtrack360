import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import {
  crearMedicion,
  eliminarMedicion,
  obtenerMediciones,
  type CampoMedicion,
  type Medicion,
} from "@/services/medicionesService";

interface Props {
  clienteId: string;
  puedeRegistrar?: boolean;
}

const METRICAS: { id: CampoMedicion; label: string; unidad: string }[] = [
  { id: "pesoKg", label: "Peso", unidad: "kg" },
  { id: "grasaPct", label: "Grasa", unidad: "%" },
  { id: "cinturaCm", label: "Cintura", unidad: "cm" },
  { id: "pechoCm", label: "Pecho", unidad: "cm" },
  { id: "caderaCm", label: "Cadera", unidad: "cm" },
  { id: "brazoCm", label: "Brazo", unidad: "cm" },
  { id: "piernaCm", label: "Pierna", unidad: "cm" },
];

const input =
  "w-full h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

function hoyLima(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}
function fmt(n: number): string {
  return n.toLocaleString("es-PE", { maximumFractionDigits: 1 });
}
function fechaCorta(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}
function fechaLarga(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ---------------- Gráfico de línea (SVG, sin librerías) ---------------- */
function Grafico({ puntos, unidad }: { puntos: { fecha: string; valor: number }[]; unidad: string }) {
  const W = 320;
  const H = 130;
  const PX = 14;
  const PY = 18;

  const valores = puntos.map((p) => p.valor);
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const colchon = (max - min) * 0.15;
  min -= colchon;
  max += colchon;

  const tiempos = puntos.map((p) => new Date(`${p.fecha}T12:00:00`).getTime());
  const t0 = Math.min(...tiempos);
  const t1 = Math.max(...tiempos);

  const x = (t: number) => (t1 === t0 ? W / 2 : PX + ((t - t0) / (t1 - t0)) * (W - PX * 2));
  const y = (v: number) => PY + (1 - (v - min) / (max - min)) * (H - PY * 2);

  const coords = puntos.map((p, i) => ({ x: x(tiempos[i]), y: y(p.valor), ...p }));
  const linea = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${linea} L${coords[coords.length - 1].x.toFixed(1)},${H - PY} L${coords[0].x.toFixed(1)},${H - PY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Evolución">
      {coords.length > 1 && <path d={area} className="fill-primary/10" />}
      {coords.length > 1 && (
        <path d={linea} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {coords.map((c, i) => {
        const ultimo = i === coords.length - 1;
        const mostrar = ultimo || i === 0;
        return (
          <g key={c.fecha + i}>
            <circle cx={c.x} cy={c.y} r={ultimo ? 5 : 3.5} className={ultimo ? "fill-primary" : "fill-surface stroke-primary"} strokeWidth="2" />
            {mostrar && (
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor={i === 0 && coords.length > 1 ? "start" : ultimo && coords.length > 1 ? "end" : "middle"}
                className="fill-ink text-[11px] font-semibold"
              >
                {fmt(c.valor)} {unidad}
              </text>
            )}
          </g>
        );
      })}
      <text x={PX} y={H - 2} className="fill-muted text-[10px]">
        {fechaCorta(puntos[0].fecha)}
      </text>
      {puntos.length > 1 && (
        <text x={W - PX} y={H - 2} textAnchor="end" className="fill-muted text-[10px]">
          {fechaCorta(puntos[puntos.length - 1].fecha)}
        </text>
      )}
    </svg>
  );
}

export function ProgresoCliente({ clienteId, puedeRegistrar = false }: Props) {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();

  const [metrica, setMetrica] = useState<CampoMedicion>("pesoKg");
  const [formAbierto, setFormAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoyLima());
  const [valores, setValores] = useState<Partial<Record<CampoMedicion, string>>>({});
  const [nota, setNota] = useState("");
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["mediciones", clienteId],
    queryFn: () => obtenerMediciones(clienteId),
    enabled: !!clienteId,
  });
  const datos = q.data ?? [];

  const disponibles = useMemo(
    () => METRICAS.filter((m) => datos.some((d) => d[m.id] !== null)),
    [datos]
  );
  const metricaActiva = disponibles.some((m) => m.id === metrica) ? metrica : (disponibles[0]?.id ?? "pesoKg");
  const def = METRICAS.find((m) => m.id === metricaActiva)!;

  const serie = useMemo(
    () =>
      datos
        .filter((d) => d[metricaActiva] !== null)
        .map((d) => ({ fecha: d.fecha, valor: d[metricaActiva] as number })),
    [datos, metricaActiva]
  );
  const primero = serie[0]?.valor ?? null;
  const ultimo = serie[serie.length - 1]?.valor ?? null;
  const delta = primero !== null && ultimo !== null ? ultimo - primero : null;

  const guardar = useMutation({
    mutationFn: async () => {
      const parsed: Partial<Record<CampoMedicion, number>> = {};
      for (const m of METRICAS) {
        const crudo = (valores[m.id] ?? "").trim().replace(",", ".");
        if (!crudo) continue;
        const n = Number(crudo);
        if (!Number.isFinite(n) || n <= 0) throw new Error(`Valor no válido en ${m.label}.`);
        parsed[m.id] = n;
      }
      if (Object.keys(parsed).length === 0) throw new Error("Ingresa al menos un valor.");
      if (fecha > hoyLima()) throw new Error("La fecha no puede ser futura.");
      await crearMedicion({ clienteId, fecha, nota, ...parsed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mediciones", clienteId] });
      setValores({});
      setNota("");
      setFecha(hoyLima());
      setErrorForm(null);
      setFormAbierto(false);
    },
    onError: (e) => setErrorForm(e instanceof Error ? e.message : "No se pudo guardar."),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => eliminarMedicion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mediciones", clienteId] }),
  });

  const historial: Medicion[] = [...datos].reverse().slice(0, 6);

  return (
    <div className="space-y-4">
      {puedeRegistrar && (
        <>
          {!formAbierto ? (
            <button
              onClick={() => setFormAbierto(true)}
              className="w-full h-12 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nueva medición
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setErrorForm(null);
                guardar.mutate();
              }}
              className="bg-surface border border-line rounded-3xl p-5 space-y-4"
              noValidate
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Nueva medición</p>
                <button
                  type="button"
                  onClick={() => setFormAbierto(false)}
                  aria-label="Cerrar"
                  className="w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-ink"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label htmlFor="med-fecha" className="block text-xs text-muted mb-1.5">
                  Fecha
                </label>
                <input
                  id="med-fecha"
                  type="date"
                  value={fecha}
                  max={hoyLima()}
                  onChange={(e) => setFecha(e.target.value)}
                  className={input}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {METRICAS.map((m) => (
                  <div key={m.id}>
                    <label htmlFor={`med-${m.id}`} className="block text-xs text-muted mb-1.5">
                      {m.label} ({m.unidad})
                    </label>
                    <input
                      id={`med-${m.id}`}
                      inputMode="decimal"
                      autoComplete="off"
                      value={valores[m.id] ?? ""}
                      onChange={(e) => setValores({ ...valores, [m.id]: e.target.value })}
                      className={input}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="med-nota" className="block text-xs text-muted mb-1.5">
                  Nota (opcional)
                </label>
                <input
                  id="med-nota"
                  maxLength={300}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: en ayunas, después de entrenar…"
                  className={input}
                />
              </div>

              <p className="text-muted text-xs">Llena solo lo que mediste; no hace falta todo.</p>

              {errorForm && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3">
                  {errorForm}
                </div>
              )}

              <button
                type="submit"
                disabled={guardar.isPending}
                className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-50"
              >
                {guardar.isPending ? "Guardando..." : "Guardar medición"}
              </button>
            </form>
          )}
        </>
      )}

      <AsyncState
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage="No se pudo cargar el progreso."
      >
        {datos.length === 0 ? (
          <div className="bg-surface border border-dashed border-line rounded-3xl p-8 text-center">
            <p className="text-ink font-semibold">Aún no hay mediciones</p>
            <p className="text-muted text-sm mt-1">
              {puedeRegistrar
                ? "Registra tu primera medición para empezar a ver tu evolución."
                : "Todavía no se registró ninguna medición."}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-surface border border-line rounded-3xl p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {disponibles.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetrica(m.id)}
                    aria-pressed={metricaActiva === m.id}
                    className={`h-8 px-3.5 rounded-full text-xs font-medium border transition-colors ${
                      metricaActiva === m.id
                        ? "bg-primary border-primary text-white"
                        : "border-line text-ink-2 hover:border-line-strong"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-muted text-xs">{def.label} actual</p>
                  <p className="text-ink text-3xl font-bold leading-none mt-1">
                    {ultimo !== null ? fmt(ultimo) : "—"}
                    <span className="text-base font-medium text-muted ml-1">{def.unidad}</span>
                  </p>
                </div>
                {delta !== null && serie.length > 1 && (
                  <div className="text-right">
                    <p className="text-muted text-xs">Desde el inicio</p>
                    <p className="text-ink font-semibold inline-flex items-center gap-1 mt-1">
                      {delta > 0 ? (
                        <TrendingUp className="w-4 h-4 text-primary" />
                      ) : delta < 0 ? (
                        <TrendingDown className="w-4 h-4 text-primary" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted" />
                      )}
                      {delta > 0 ? "+" : ""}
                      {fmt(delta)} {def.unidad}
                    </p>
                  </div>
                )}
              </div>

              {serie.length > 0 && <Grafico puntos={serie} unidad={def.unidad} />}
            </div>

            <div className="bg-surface border border-line rounded-3xl overflow-hidden">
              <p className="text-sm font-semibold text-ink px-5 py-4 border-b border-line">
                Historial
              </p>
              <ul className="divide-y divide-line">
                {historial.map((d) => {
                  const resumen = METRICAS.filter((m) => d[m.id] !== null)
                    .map((m) => `${m.label} ${fmt(d[m.id] as number)} ${m.unidad}`)
                    .join(" · ");
                  const mia = d.registradoPor === sesion?.userId;
                  return (
                    <li key={d.id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-ink font-medium">{fechaLarga(d.fecha)}</p>
                        <p className="text-xs text-muted mt-0.5">{resumen}</p>
                        {d.nota && <p className="text-xs text-ink-2 mt-1 italic">“{d.nota}”</p>}
                      </div>
                      {mia && (
                        <button
                          onClick={() => borrar.mutate(d.id)}
                          disabled={borrar.isPending}
                          aria-label="Eliminar medición"
                          className="w-9 h-9 shrink-0 rounded-lg border border-line grid place-items-center text-muted hover:text-danger hover:border-danger/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </AsyncState>
    </div>
  );
}