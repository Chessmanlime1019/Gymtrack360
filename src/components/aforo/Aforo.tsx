import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, DoorOpen, Gauge, LogOut, TriangleAlert, Users } from "lucide-react";

import { Panel, SinDatos } from "@/components/ui/Tablero";
import { useAforo } from "@/hooks/useAforo";
import {
  obtenerPersonasDentro,
  registrarSalida,
  type AforoSede,
} from "@/services/aforoService";

// Nivel de ocupación. Siempre se muestra con icono y texto, nunca solo color.
export function nivelAforo(dentro: number, maximo: number | null) {
  if (!maximo) return null;
  const pct = Math.round((dentro / maximo) * 100);
  if (pct >= 100) return { pct, texto: "Lleno", clase: "bg-danger/10 text-danger", barra: "bg-danger", icono: TriangleAlert };
  if (pct >= 85) return { pct, texto: "Casi lleno", clase: "bg-danger/10 text-danger", barra: "bg-danger", icono: TriangleAlert };
  if (pct >= 60) return { pct, texto: "Moderado", clase: "bg-warning/10 text-warning", barra: "bg-warning", icono: Gauge };
  return { pct, texto: "Tranquilo", clase: "bg-success/10 text-success", barra: "bg-success", icono: CheckCircle2 };
}

function EnVivo() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
      <span className="relative flex w-2 h-2">
        <span className="absolute inset-0 rounded-full bg-success opacity-60 animate-ping" />
        <span className="relative w-2 h-2 rounded-full bg-success" />
      </span>
      En vivo
    </span>
  );
}

function Medidor({ pct, barra }: { pct: number; barra: string }) {
  return (
    <div className="h-2.5 rounded-full bg-ink/5 overflow-hidden" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${barra}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function Cifra({ a }: { a: AforoSede }) {
  const nivel = nivelAforo(a.dentro, a.aforoMaximo);
  const Icono = nivel?.icono;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="leading-none">
          <span className="text-[40px] font-bold tracking-tight text-ink tabular-nums">{a.dentro}</span>
          {a.aforoMaximo && <span className="text-lg text-muted font-medium tabular-nums"> / {a.aforoMaximo}</span>}
          <span className="block text-xs text-muted mt-1.5">{a.dentro === 1 ? "persona dentro" : "personas dentro"}</span>
        </p>
        {nivel && Icono && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${nivel.clase}`}>
            <Icono className="w-3.5 h-3.5" />
            {nivel.texto}
          </span>
        )}
      </div>
      {nivel ? (
        <div className="mt-3.5">
          <Medidor pct={nivel.pct} barra={nivel.barra} />
          <p className="text-[11px] text-muted mt-1.5 tabular-nums">{nivel.pct}% del aforo</p>
        </div>
      ) : (
        <p className="text-[11px] text-muted mt-3">El Super Admin puede definir el aforo máximo en Sedes.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ panel de una sede */

function minutosDesde(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "Ahora";
  if (m < 60) return `Hace ${m} min`;
  return `Hace ${Math.floor(m / 60)} h ${m % 60} min`;
}

const iniciales = (n: string) =>
  n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function PanelAforo({ sedeId, className = "" }: { sedeId: string; className?: string }) {
  const queryClient = useQueryClient();
  const aforo = useAforo();
  const personas = useQuery({
    queryKey: ["personas-dentro", sedeId],
    queryFn: () => obtenerPersonasDentro(sedeId),
    refetchInterval: 60_000,
  });

  const salida = useMutation({
    mutationFn: registrarSalida,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["personas-dentro"] });
      queryClient.invalidateQueries({ queryKey: ["aforo-sedes"] });
    },
  });

  const sede = aforo.data?.find((a) => a.sedeId === sedeId);
  const lista = personas.data ?? [];

  return (
    <Panel titulo="Aforo" subtitulo={sede?.nombre ?? "Personas dentro del local ahora"} className={className}>
      {aforo.isError ? (
        <SinDatos mensaje="No se pudo cargar el aforo" icono={Users} />
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr]">
          <div>
            <div className="mb-3">
              <EnVivo />
            </div>
            {sede && <Cifra a={sede} />}
          </div>

          <div className="min-w-0 md:border-l md:border-line md:pl-6">
            <p className="text-xs font-semibold text-ink-2 mb-2">Dentro ahora</p>
            {lista.length === 0 ? (
              <p className="text-muted text-sm py-6 text-center">No hay nadie dentro en este momento.</p>
            ) : (
              <ul className="divide-y divide-line max-h-64 overflow-y-auto -mr-2 pr-2">
                {lista.map((p) => (
                  <li key={p.asistenciaId} className="flex items-center gap-3 py-2">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center text-[11px] font-bold shrink-0 overflow-hidden">
                      {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : iniciales(p.cliente)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium truncate">{p.cliente}</p>
                      <p className="text-[11px] text-muted">{minutosDesde(p.fechaHora)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => salida.mutate(p.asistenciaId)}
                      disabled={salida.isPending}
                      className="shrink-0 h-8 px-2.5 rounded-lg border border-line text-ink-2 text-xs font-medium inline-flex items-center gap-1.5 hover:border-line-strong hover:text-ink disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Marcar salida
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-muted mt-2">Quien no registra su salida deja de contar a las 3 horas.</p>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------ todas las sedes */

export function AforoSedes({ className = "" }: { className?: string }) {
  const aforo = useAforo();
  const sedes = aforo.data ?? [];
  const total = sedes.reduce((s, a) => s + a.dentro, 0);

  return (
    <Panel titulo="Aforo por sede" subtitulo={`${total} ${total === 1 ? "persona dentro" : "personas dentro"} en total`} className={className}>
      {aforo.isError ? (
        <SinDatos mensaje="No se pudo cargar el aforo" icono={Users} />
      ) : (
        <>
          <div className="mb-3">
            <EnVivo />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {sedes.map((a) => (
              <div key={a.sedeId} className="rounded-xl border border-line p-4">
                <p className="text-sm font-medium text-ink truncate mb-3">{a.nombre}</p>
                <Cifra a={a} />
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------ escáner y cliente */

export function AforoCompacto({ sedeId }: { sedeId: string }) {
  const aforo = useAforo();
  const a = aforo.data?.find((x) => x.sedeId === sedeId);
  if (!a) return null;
  const nivel = nivelAforo(a.dentro, a.aforoMaximo);
  const Icono = nivel?.icono;
  return (
    <div className="bg-surface rounded-xl border border-line px-5 py-4 flex items-center gap-4">
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <DoorOpen className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink">
            <span className="text-xl font-bold tabular-nums">{a.dentro}</span>
            {a.aforoMaximo && <span className="text-muted tabular-nums"> / {a.aforoMaximo}</span>}
            <span className="text-muted"> {a.dentro === 1 ? "persona dentro" : "personas dentro"}</span>
          </p>
          {nivel && Icono ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${nivel.clase}`}>
              <Icono className="w-3.5 h-3.5" />
              {nivel.texto}
            </span>
          ) : (
            <EnVivo />
          )}
        </div>
        {nivel && (
          <div className="mt-2">
            <Medidor pct={nivel.pct} barra={nivel.barra} />
          </div>
        )}
      </div>
    </div>
  );
}

// Para el cliente: ¿conviene ir ahora? Solo cifras, sin nombres.
export function AforoCliente({ sedeId }: { sedeId: string }) {
  const aforo = useAforo(false);
  const a = aforo.data?.find((x) => x.sedeId === sedeId);
  if (!a) return null;
  const nivel = nivelAforo(a.dentro, a.aforoMaximo);
  const Icono = nivel?.icono ?? Users;
  return (
    <div className="bg-surface rounded-2xl border border-line p-5 flex items-center gap-4">
      <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${nivel?.clase ?? "bg-primary/10 text-primary"}`}>
        <Icono className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-muted text-[13px] font-medium">Ahora en tu sede</p>
        <p className="text-ink font-semibold mt-0.5">
          {a.dentro} {a.dentro === 1 ? "persona" : "personas"}
          {nivel && <span className="text-muted font-normal"> · {nivel.texto}</span>}
        </p>
        {nivel && (
          <div className="mt-2">
            <Medidor pct={nivel.pct} barra={nivel.barra} />
          </div>
        )}
      </div>
    </div>
  );
}
