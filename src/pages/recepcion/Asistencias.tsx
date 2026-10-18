import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Search, UserCheck, Users } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { AsyncState } from "@/components/ui/AsyncState";
import { SelectorDia } from "@/components/ui/SelectorDia";
import { obtenerSedesActivas } from "@/services/sedesService";
import { hoyLima, horaLima, obtenerAsistenciasDelDia } from "@/services/recepcionService";

const input =
  "w-full h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima",
  });
}
function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Asistencias() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const esSuperAdmin = sesion?.role === "super_admin";

  const [sedeSel, setSedeSel] = useState<string>(sesion?.sedeId ?? "");
  const sedeId = esSuperAdmin ? sedeSel : (sesion?.sedeId ?? "");

  const [fecha, setFecha] = useState<string>(hoyLima());
  const [busqueda, setBusqueda] = useState("");

  const sedes = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
    enabled: esSuperAdmin,
  });

  const asistencias = useQuery({
    queryKey: ["recepcion-asistencias", sedeId, fecha],
    queryFn: () => obtenerAsistenciasDelDia(sedeId, fecha),
    enabled: !!sedeId,
  });

  // En vivo: cuando alguien entra, se actualiza la lista del día de hoy.
  useEffect(() => {
    if (!sedeId || fecha !== hoyLima()) return;
    const canal = supabase
      .channel(`recepcion-asistencias-${sedeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "asistencias", filter: `sede_id=eq.${sedeId}` },
        () => queryClient.invalidateQueries({ queryKey: ["recepcion-asistencias", sedeId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [sedeId, fecha, queryClient]);

  const datos = asistencias.data ?? [];

  const resumen = useMemo(() => {
    const porHora = new Array<number>(24).fill(0);
    datos.forEach((a) => {
      porHora[horaLima(a.fechaHora)] += 1;
    });
    const max = Math.max(0, ...porHora);
    const pico = max > 0 ? porHora.indexOf(max) : null;
    const usadas = porHora.map((n, h) => (n > 0 ? h : -1)).filter((h) => h >= 0);
    const desde = Math.min(6, ...(usadas.length ? usadas : [6]));
    const hasta = Math.max(21, ...(usadas.length ? usadas : [21]));
    return {
      total: datos.length,
      unicos: new Set(datos.map((a) => a.clienteId)).size,
      porHora,
      max,
      pico,
      desde,
      hasta,
    };
  }, [datos]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? datos.filter((a) => a.clienteNombre.toLowerCase().includes(q)) : datos;
  }, [datos, busqueda]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-ink">Asistencias</h1>
          <p className="text-muted text-sm mt-1">Quién entró al gimnasio y a qué hora.</p>
        </div>
        <SelectorDia value={fecha} onChange={setFecha} />
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
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Entradas", valor: String(resumen.total), icono: UserCheck },
              { label: "Clientes distintos", valor: String(resumen.unicos), icono: Users },
              {
                label: "Hora pico",
                valor: resumen.pico === null ? "—" : `${String(resumen.pico).padStart(2, "0")}:00`,
                icono: Clock,
              },
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

          {/* Entradas por hora */}
          <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5">
            <p className="text-sm font-semibold text-ink mb-4">Entradas por hora</p>
            <div className="flex items-end gap-1 sm:gap-1.5 h-28">
              {Array.from({ length: resumen.hasta - resumen.desde + 1 }, (_, i) => {
                const h = resumen.desde + i;
                const n = resumen.porHora[h];
                const alto = resumen.max > 0 ? Math.max((n / resumen.max) * 100, n > 0 ? 8 : 0) : 0;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                    <span className="text-[10px] text-muted h-3">{n > 0 ? n : ""}</span>
                    <div
                      className={`w-full rounded-t-md ${n === resumen.max && n > 0 ? "bg-primary" : "bg-primary/35"}`}
                      style={{ height: `${alto}%` }}
                      title={`${h}:00 — ${n} entradas`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 sm:gap-1.5 mt-2">
              {Array.from({ length: resumen.hasta - resumen.desde + 1 }, (_, i) => (
                <span key={i} className="flex-1 text-center text-[10px] text-muted">
                  {(resumen.desde + i) % 2 === 0 ? resumen.desde + i : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Lista */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente por nombre..."
              className={`${input} pl-9`}
            />
          </div>

          <AsyncState
            isLoading={asistencias.isLoading}
            isError={asistencias.isError}
            isEmpty={lista.length === 0}
            emptyMessage={
              busqueda ? "Ningún cliente coincide con la búsqueda." : "No hay entradas en este día."
            }
          >
            <div className="grid lg:grid-cols-2 gap-2">
              {lista.map((a) => (
                <div
                  key={a.id}
                  className="bg-surface border border-line rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-ink font-bold text-base leading-none">{hora(a.fechaHora)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold grid place-items-center shrink-0">
                    {iniciales(a.clienteNombre)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{a.clienteNombre}</p>
                    <p className="text-xs text-muted truncate">{a.planNombre ?? "Sin plan registrado"}</p>
                  </div>
                </div>
              ))}
            </div>
          </AsyncState>
        </>
      )}
    </div>
  );
}