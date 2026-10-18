import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ChevronLeft, ChevronRight, Flame, Target, Trophy } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerSedesActivas } from "@/services/sedesService";
import { obtenerMisVisitas } from "@/services/misVisitasService";

const META_SEMANAL = 3;
const NOMBRES_DIA = ["L", "M", "M", "J", "V", "S", "D"];

function diaLima(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}
// Suma días a un YYYY-MM-DD (mediodía para evitar saltos por zona horaria).
function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}
function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima",
  });
}

export default function MisVisitas() {
  const { sesion } = useAuth();
  const clienteId = sesion?.userId ?? "";

  const hoy = diaLima(new Date());
  const [anio, setAnio] = useState(Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(Number(hoy.slice(5, 7))); // 1-12

  const visitas = useQuery({
    queryKey: ["mis-visitas", clienteId],
    queryFn: () => obtenerMisVisitas(clienteId),
    enabled: !!clienteId,
  });
  const sedes = useQuery({ queryKey: ["sedes-activas"], queryFn: obtenerSedesActivas });

  const datos = visitas.data ?? [];

  const stats = useMemo(() => {
    const dias = new Set(datos.map((v) => diaLima(v.fechaHora)));

    // Racha actual: días seguidos hasta hoy (o hasta ayer, si hoy aún no vino).
    let racha = 0;
    let cursor = dias.has(hoy) ? hoy : sumarDias(hoy, -1);
    while (dias.has(cursor)) {
      racha += 1;
      cursor = sumarDias(cursor, -1);
    }

    // Mejor racha histórica.
    const ordenados = [...dias].sort();
    let mejor = 0;
    let actual = 0;
    ordenados.forEach((d, i) => {
      actual = i > 0 && sumarDias(ordenados[i - 1], 1) === d ? actual + 1 : 1;
      mejor = Math.max(mejor, actual);
    });

    // Semana actual (lunes a domingo).
    const dow = new Date(`${hoy}T12:00:00`).getDay(); // 0 = domingo
    const lunes = sumarDias(hoy, -((dow + 6) % 7));
    const semana = [...dias].filter((d) => d >= lunes && d <= hoy).length;

    const prefijoMes = `${anio}-${String(mes).padStart(2, "0")}`;
    const delMes = [...dias].filter((d) => d.startsWith(prefijoMes));

    return { dias, racha, mejor, semana, delMes: delMes.length };
  }, [datos, hoy, anio, mes]);

  // Calendario del mes elegido (semana empieza en lunes).
  const celdas = useMemo(() => {
    const primero = new Date(anio, mes - 1, 1);
    const offset = (primero.getDay() + 6) % 7;
    const diasMes = new Date(anio, mes, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null as number | null),
      ...Array.from({ length: diasMes }, (_, i) => i + 1),
    ];
  }, [anio, mes]);

  const tituloMes = new Date(anio, mes - 1, 1).toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });
  const esMesActual = `${anio}-${String(mes).padStart(2, "0")}` === hoy.slice(0, 7);

  function cambiarMes(delta: number) {
    const f = new Date(anio, mes - 1 + delta, 1);
    setAnio(f.getFullYear());
    setMes(f.getMonth() + 1);
  }

  const nombreSede = (id: string) => sedes.data?.find((s) => s.id === id)?.nombre ?? "Sede";
  const pctSemana = Math.min(100, (stats.semana / META_SEMANAL) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl text-ink">Mis visitas</h1>
        <p className="text-muted text-sm mt-1">Tu constancia en el gimnasio, día a día.</p>
      </div>

      <AsyncState
        isLoading={visitas.isLoading}
        isError={visitas.isError}
        errorMessage="No se pudieron cargar tus visitas."
      >
        {/* Racha + meta */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-surface border border-line rounded-3xl p-5 flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl grid place-items-center shrink-0 ${
                stats.racha > 0 ? "bg-primary/15 text-primary" : "bg-background text-muted"
              }`}
            >
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <p className="text-ink text-3xl font-bold leading-none">
                {stats.racha}
                <span className="text-base font-medium text-muted ml-1.5">
                  {stats.racha === 1 ? "día seguido" : "días seguidos"}
                </span>
              </p>
              <p className="text-muted text-xs mt-2">
                {stats.racha === 0
                  ? "Entrena hoy y empieza tu racha."
                  : stats.dias.has(hoy)
                    ? "¡Hoy ya entrenaste!"
                    : "Entrena hoy para no perder tu racha."}
              </p>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink inline-flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Meta de la semana
              </p>
              <p className="text-ink text-sm font-bold">
                {Math.min(stats.semana, 99)}/{META_SEMANAL}
              </p>
            </div>
            <div className="h-2.5 rounded-full bg-background overflow-hidden mt-4">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pctSemana}%` }}
              />
            </div>
            <p className="text-muted text-xs mt-3">
              {stats.semana >= META_SEMANAL
                ? "¡Meta cumplida esta semana!"
                : `Te faltan ${META_SEMANAL - stats.semana} ${META_SEMANAL - stats.semana === 1 ? "visita" : "visitas"} para cumplirla.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Este mes", valor: stats.delMes, icono: CalendarCheck },
            { label: "Mejor racha", valor: stats.mejor, icono: Trophy },
            { label: "Total (13 meses)", valor: stats.dias.size, icono: Flame },
          ].map((k) => (
            <div key={k.label} className="gt-kpi p-4">
              <div className="flex items-center justify-between">
                <p className="text-muted text-[11px] sm:text-xs">{k.label}</p>
                <k.icono className="w-4 h-4 text-primary hidden sm:block" />
              </div>
              <p className="text-ink text-xl sm:text-2xl font-bold mt-1">{k.valor}</p>
            </div>
          ))}
        </div>

        {/* Calendario */}
        <div className="bg-surface border border-line rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              className="w-9 h-9 rounded-lg border border-line grid place-items-center text-ink-2 hover:border-line-strong"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-ink font-semibold text-sm capitalize">{tituloMes}</p>
            <button
              onClick={() => cambiarMes(1)}
              disabled={esMesActual}
              aria-label="Mes siguiente"
              className="w-9 h-9 rounded-lg border border-line grid place-items-center text-ink-2 hover:border-line-strong disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {NOMBRES_DIA.map((n, i) => (
              <span key={i} className="text-[11px] text-muted pb-1">
                {n}
              </span>
            ))}
            {celdas.map((d, i) => {
              if (d === null) return <span key={`v${i}`} />;
              const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const vino = stats.dias.has(fecha);
              const esHoy = fecha === hoy;
              const futuro = fecha > hoy;
              return (
                <div
                  key={fecha}
                  className={`aspect-square rounded-xl grid place-items-center text-sm font-medium ${
                    vino
                      ? "bg-primary text-white"
                      : futuro
                        ? "text-muted/40"
                        : "bg-background text-ink-2"
                  } ${esHoy ? "ring-2 ring-primary/60" : ""}`}
                  aria-label={vino ? `${d}: asististe` : String(d)}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimas visitas */}
        <div className="bg-surface border border-line rounded-3xl overflow-hidden">
          <p className="text-sm font-semibold text-ink px-5 py-4 border-b border-line">
            Últimas visitas
          </p>
          {datos.length === 0 ? (
            <p className="text-center text-muted text-sm py-10">
              Aún no tienes visitas. ¡Muestra tu QR en recepción y empieza!
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {datos.slice(0, 8).map((v) => (
                <li key={v.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink capitalize">
                      {new Date(v.fechaHora).toLocaleDateString("es-PE", {
                        weekday: "long",
                        day: "2-digit",
                        month: "short",
                        timeZone: "America/Lima",
                      })}
                    </p>
                    <p className="text-xs text-muted truncate">{nombreSede(v.sedeId)}</p>
                  </div>
                  <span className="text-ink font-semibold text-sm shrink-0">{hora(v.fechaHora)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AsyncState>
    </div>
  );
}