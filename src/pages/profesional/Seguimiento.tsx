import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BellRing, CalendarX2, CheckCircle2, ClipboardX, Clock, Dumbbell, Users } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerMiPerfil } from "@/services/perfilService";
import { obtenerResumenProfesional, type ClienteResumen } from "@/services/dashboardProfesionalService";
import { recordarCliente, type MotivoRecordatorio } from "@/services/seguimientoService";

type Grupo = "vencida" | "por_vencer" | "sin_venir" | "sin_rutina";

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(iso);
  f.setHours(0, 0, 0, 0);
  return Math.round((hoy.getTime() - f.getTime()) / 86_400_000);
}

const iniciales = (c: { nombre: string; apellido: string }) =>
  `${c.nombre[0] ?? ""}${c.apellido[0] ?? ""}`.toUpperCase();

const vigente = (c: ClienteResumen) => c.diasMembresia !== null && c.diasMembresia >= 0;

// Un cliente puede caer en varios grupos a la vez.
function gruposDe(c: ClienteResumen): Grupo[] {
  const g: Grupo[] = [];
  if (c.diasMembresia !== null && c.diasMembresia < 0) g.push("vencida");
  if (vigente(c) && c.diasMembresia! <= 7) g.push("por_vencer");
  if (vigente(c)) {
    const d = diasDesde(c.ultimaVisita);
    if (d === null || d >= 7) g.push("sin_venir");
  }
  if (vigente(c) && !c.rutinaActiva) g.push("sin_rutina");
  return g;
}

const GRUPOS: { id: Grupo; titulo: string; ayuda: string; icono: typeof Clock; color: string }[] = [
  { id: "vencida", titulo: "Membresía vencida", ayuda: "Ya no pueden entrar. Avisa a recepción o anímalos a renovar.", icono: CalendarX2, color: "text-danger bg-danger/10" },
  { id: "por_vencer", titulo: "Por vencer (7 días)", ayuda: "Es el mejor momento para recordarles renovar.", icono: Clock, color: "text-warning bg-warning/10" },
  { id: "sin_venir", titulo: "Sin venir hace 7+ días", ayuda: "Un mensaje a tiempo evita que abandonen.", icono: BellRing, color: "text-primary bg-primary/10" },
  { id: "sin_rutina", titulo: "Sin rutina activa", ayuda: "Tienen plan vigente pero nada que entrenar.", icono: ClipboardX, color: "text-ink-2 bg-muted/15" },
];

function textoVisita(iso: string | null) {
  const d = diasDesde(iso);
  if (d === null) return "Sin visitas en 30 días";
  if (d === 0) return "Vino hoy";
  if (d === 1) return "Vino ayer";
  return `Última visita hace ${d} días`;
}

function textoMembresia(dias: number | null) {
  if (dias === null) return "Sin membresía";
  if (dias < 0) return `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
}

export default function Seguimiento() {
  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
  const profesionalId = perfil.data?.id;
  const resumen = useQuery({
    queryKey: ["resumen-profesional", profesionalId],
    queryFn: () => obtenerResumenProfesional(profesionalId!),
    enabled: !!profesionalId,
  });

  // "clienteId:motivo" -> estado del envío
  const [enviados, setEnviados] = useState<Record<string, "enviado" | "repetido">>({});
  const [error, setError] = useState<string | null>(null);

  const recordar = useMutation({
    mutationFn: (p: { id: string; motivo: MotivoRecordatorio }) => recordarCliente(p.id, p.motivo),
    onSuccess: (r, p) => {
      setError(null);
      setEnviados((prev) => ({ ...prev, [`${p.id}:${p.motivo}`]: r }));
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo enviar el recordatorio."),
  });

  const clientes = resumen.data?.clientes ?? [];
  const porGrupo = useMemo(() => {
    const mapa: Record<Grupo, ClienteResumen[]> = { vencida: [], por_vencer: [], sin_venir: [], sin_rutina: [] };
    for (const c of clientes) for (const g of gruposDe(c)) mapa[g].push(c);
    mapa.por_vencer.sort((a, b) => (a.diasMembresia ?? 0) - (b.diasMembresia ?? 0));
    mapa.vencida.sort((a, b) => (b.diasMembresia ?? 0) - (a.diasMembresia ?? 0));
    mapa.sin_venir.sort((a, b) => (diasDesde(b.ultimaVisita) ?? 999) - (diasDesde(a.ultimaVisita) ?? 999));
    return mapa;
  }, [clientes]);

  const conAlerta = useMemo(() => new Set(clientes.filter((c) => gruposDe(c).length > 0).map((c) => c.id)).size, [clientes]);
  const alDia = clientes.length - conAlerta;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl text-ink">Seguimiento</h1>
        <p className="text-muted text-sm mt-1">Los clientes que necesitan tu atención hoy, ordenados por urgencia.</p>
      </div>

      <AsyncState
        isLoading={perfil.isLoading || resumen.isLoading}
        isError={resumen.isError}
        isEmpty={clientes.length === 0}
        emptyMessage="Aún no atiendes clientes. Toma a cargo clientes desde “Mis Clientes”."
      >
        <div className="grid grid-cols-3 gap-3">
          <Kpi icono={<Users className="w-4 h-4" />} valor={clientes.length} etiqueta="Mis clientes" />
          <Kpi icono={<BellRing className="w-4 h-4" />} valor={conAlerta} etiqueta="Con alertas" tono="text-warning" />
          <Kpi icono={<CheckCircle2 className="w-4 h-4" />} valor={alDia} etiqueta="Al día" tono="text-success" />
        </div>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm px-4 py-3">{error}</div>
        )}

        {conAlerta === 0 && (
          <div className="rounded-2xl border border-success/30 bg-success/10 text-success text-sm px-4 py-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> Todos tus clientes están al día. ¡Buen trabajo!
          </div>
        )}

        {GRUPOS.map((g) => {
          const lista = porGrupo[g.id];
          if (lista.length === 0) return null;
          const Icono = g.icono;
          const motivo: MotivoRecordatorio | null =
            g.id === "por_vencer" ? "por_vencer" : g.id === "sin_venir" ? "sin_venir" : null;
          return (
            <section key={g.id} className="bg-surface border border-line rounded-2xl overflow-hidden">
              <header className="flex items-start gap-3 px-4 py-3 border-b border-line">
                <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${g.color}`}>
                  <Icono className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-ink font-semibold text-sm">
                    {g.titulo} <span className="text-muted font-normal">· {lista.length}</span>
                  </h2>
                  <p className="text-muted text-xs mt-0.5">{g.ayuda}</p>
                </div>
              </header>
              <ul className="divide-y divide-line">
                {lista.map((c) => {
                  const estado = motivo ? enviados[`${c.id}:${motivo}`] : undefined;
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-10 h-10 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold shrink-0">
                        {iniciales(c)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink text-sm font-medium truncate">
                          {c.nombre} {c.apellido}
                        </p>
                        <p className="text-muted text-xs truncate">
                          {g.id === "sin_rutina" ? textoMembresia(c.diasMembresia) : g.id === "sin_venir" ? textoVisita(c.ultimaVisita) : textoMembresia(c.diasMembresia)}
                        </p>
                      </div>
                      {motivo ? (
                        estado ? (
                          <span className="text-xs text-success inline-flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-4 h-4" /> {estado === "enviado" ? "Enviado" : "Ya enviado hoy"}
                          </span>
                        ) : (
                          <button
                            onClick={() => recordar.mutate({ id: c.id, motivo })}
                            disabled={recordar.isPending}
                            className="h-9 px-3 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                          >
                            <BellRing className="w-3.5 h-3.5" /> Recordar
                          </button>
                        )
                      ) : g.id === "sin_rutina" ? (
                        <Link
                          to={`/profesional/rutinas?cliente=${c.id}`}
                          className="h-9 px-3 rounded-lg bg-primary text-white hover:bg-primary-dark text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                        >
                          <Dumbbell className="w-3.5 h-3.5" /> Crear rutina
                        </Link>
                      ) : (
                        <span className="text-[11px] text-muted shrink-0 hidden sm:block">Avisar a recepción</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </AsyncState>
    </div>
  );
}

function Kpi({ icono, valor, etiqueta, tono = "text-ink" }: { icono: ReactNode; valor: number; etiqueta: string; tono?: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4">
      <div className="text-muted mb-2">{icono}</div>
      <p className={`text-2xl font-semibold ${tono}`}>{valor}</p>
      <p className="text-muted text-xs mt-0.5">{etiqueta}</p>
    </div>
  );
}