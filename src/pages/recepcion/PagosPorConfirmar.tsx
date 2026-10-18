import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, CheckCircle2, Hourglass, Smartphone, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AsyncState } from "@/components/ui/AsyncState";
import { obtenerSedesActivas } from "@/services/sedesService";
import {
  obtenerSolicitudesSede,
  revisarSolicitud,
  type SolicitudStaff,
} from "@/services/solicitudesPagoService";

const input =
  "w-full h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

const MOTIVOS_RAPIDOS = [
  "El pago no llegó a nuestra cuenta",
  "El monto no coincide",
  "El N.° de operación no coincide",
  "No se acercó a pagar en caja",
];

function soles(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima",
  });
}

function haceCuanto(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

const ESTADO_TEXTO: Record<SolicitudStaff["estado"], { texto: string; color: string }> = {
  pendiente: { texto: "Pendiente", color: "text-warning bg-warning/10" },
  aprobada: { texto: "Confirmado", color: "text-success bg-success/10" },
  rechazada: { texto: "Rechazado", color: "text-danger bg-danger/10" },
  cancelada: { texto: "Cancelado por el cliente", color: "text-muted bg-muted/15" },
};

export default function PagosPorConfirmar() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeSel, setSedeSel] = useState<string>(sesion?.sedeId ?? "");
  const sedeId = esSuperAdmin ? sedeSel : (sesion?.sedeId ?? "");
  const [vista, setVista] = useState<"pendientes" | "revisadas">("pendientes");
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const sedes = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const solicitudes = useQuery({
    queryKey: ["solicitudes-pago", sedeId, vista],
    queryFn: () => obtenerSolicitudesSede(sedeId, vista),
    enabled: !!sedeId,
    // Llegan solicitudes nuevas en cualquier momento.
    refetchInterval: vista === "pendientes" ? 15_000 : false,
  });

  const revisar = useMutation({
    mutationFn: revisarSolicitud,
    onSuccess: (_, p) => {
      const s = solicitudes.data?.find((x) => x.id === p.id);
      setAviso({
        tipo: "ok",
        texto: p.aprobar
          ? `Pago confirmado. La membresía de ${s?.clienteNombre ?? "el cliente"} ya está activa.`
          : `Pago rechazado. ${s?.clienteNombre ?? "El cliente"} recibió el motivo.`,
      });
      setRechazando(null);
      setMotivo("");
      queryClient.invalidateQueries({ queryKey: ["solicitudes-pago"] });
      queryClient.invalidateQueries({ queryKey: ["recepcion-caja"] });
    },
    onError: (e: Error) => setAviso({ tipo: "error", texto: e.message || "No se pudo completar la acción." }),
  });

  const datos = solicitudes.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl text-ink">Pagos por confirmar</h1>
        <p className="text-muted text-sm mt-1">
          Pagos que los clientes enviaron desde la app. Verifica el Yape/Plin o cobra en caja y confirma para activar
          la membresía.
        </p>
      </div>

      {esSuperAdmin && (
        <div className="max-w-xs">
          <label htmlFor="sede" className="block text-xs text-muted mb-1.5">
            Sede con la que operas
          </label>
          <select id="sede" value={sedeSel} onChange={(e) => setSedeSel(e.target.value)} className={input}>
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

      <div className="inline-flex rounded-xl border border-line p-1 bg-surface">
        {(["pendientes", "revisadas"] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setVista(v);
              setAviso(null);
            }}
            className={`h-9 px-4 rounded-lg text-sm font-medium ${
              vista === v ? "bg-primary text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            {v === "pendientes" ? "Pendientes" : "Revisados"}
          </button>
        ))}
      </div>

      {aviso && (
        <div
          className={`rounded-xl border text-sm px-4 py-3 ${
            aviso.tipo === "ok"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      {!sedeId ? (
        <div className="bg-surface rounded-2xl p-10 text-center text-muted text-sm border border-line">
          {esSuperAdmin ? "Selecciona una sede." : "Tu cuenta no tiene una sede asignada."}
        </div>
      ) : (
        <AsyncState
          isLoading={solicitudes.isLoading}
          isError={solicitudes.isError}
          isEmpty={datos.length === 0}
          emptyMessage={vista === "pendientes" ? "No hay pagos por confirmar. ¡Todo al día!" : "Aún no hay pagos revisados."}
        >
          <ul className="space-y-3">
            {datos.map((s) => {
              const Icono = s.metodo === "Efectivo" ? Banknote : Smartphone;
              const estado = ESTADO_TEXTO[s.estado];
              const abierto = rechazando === s.id;
              const ocupado = revisar.isPending && revisar.variables?.id === s.id;
              return (
                <li key={s.id} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                      <Icono className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink font-semibold truncate">{s.clienteNombre}</p>
                      <p className="text-muted text-xs">
                        {s.planNombre} · {s.metodo}
                        {s.numeroOperacion && (
                          <>
                            {" "}
                            · Op. <span className="text-ink font-mono">{s.numeroOperacion}</span>
                          </>
                        )}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        {s.estado === "pendiente"
                          ? `Enviado ${haceCuanto(s.createdAt)}`
                          : `Revisado ${fechaHora(s.revisadoAt ?? s.createdAt)}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-ink text-lg font-bold">{soles(s.monto)}</p>
                      <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full ${estado.color}`}>
                        {s.estado === "pendiente" ? (
                          <span className="inline-flex items-center gap-1">
                            <Hourglass className="w-3 h-3" /> {estado.texto}
                          </span>
                        ) : (
                          estado.texto
                        )}
                      </span>
                    </div>
                  </div>

                  {s.estado === "rechazada" && s.motivoRechazo && (
                    <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">Motivo: {s.motivoRechazo}</p>
                  )}

                  {s.estado === "pendiente" && !abierto && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          setAviso(null);
                          revisar.mutate({ id: s.id, aprobar: true });
                        }}
                        disabled={revisar.isPending}
                        className="flex-1 min-h-[44px] rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {ocupado
                          ? "Confirmando…"
                          : s.metodo === "Efectivo"
                            ? `Cobré ${soles(s.monto)} · Activar`
                            : `Llegó el ${s.metodo} · Activar`}
                      </button>
                      <button
                        onClick={() => {
                          setAviso(null);
                          setRechazando(s.id);
                          setMotivo("");
                        }}
                        disabled={revisar.isPending}
                        className="min-h-[44px] px-4 rounded-xl border border-danger/40 text-danger hover:bg-danger/10 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" /> Rechazar
                      </button>
                    </div>
                  )}

                  {abierto && (
                    <div className="space-y-2 border-t border-line pt-3">
                      <p className="text-xs text-muted">¿Por qué se rechaza? El cliente verá este mensaje.</p>
                      <div className="flex flex-wrap gap-2">
                        {MOTIVOS_RAPIDOS.map((m) => (
                          <button
                            key={m}
                            onClick={() => setMotivo(m)}
                            className={`text-xs px-3 h-8 rounded-full border ${
                              motivo === m ? "border-primary text-primary bg-primary/10" : "border-line text-ink-2"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <input
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value.slice(0, 200))}
                        placeholder="O escribe otro motivo"
                        className={input}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => revisar.mutate({ id: s.id, aprobar: false, motivo: motivo.trim() })}
                          disabled={motivo.trim().length < 3 || revisar.isPending}
                          className="flex-1 min-h-[44px] rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-40"
                        >
                          {ocupado ? "Rechazando…" : "Confirmar rechazo"}
                        </button>
                        <button
                          onClick={() => setRechazando(null)}
                          className="min-h-[44px] px-4 rounded-xl border border-line text-ink-2 text-sm"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {vista === "pendientes" && datos.length > 0 && (
            <p className="text-muted text-xs inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> La lista se actualiza sola cada 15 segundos.
            </p>
          )}
        </AsyncState>
      )}
    </div>
  );
}
