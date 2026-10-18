import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { prepararSonido, reproducirSonido } from "@/lib/sonidoNotificacion";
import { obtenerMiPerfil } from "@/services/perfilService";
import { obtenerMembresiaVigenteCliente } from "@/services/membresiasService";
import { obtenerRutinas } from "@/services/rutinasService";
import { obtenerMisPagos } from "@/services/miMembresiaService";
import { obtenerResumenProfesional } from "@/services/dashboardProfesionalService";

export type TipoNotificacion = "info" | "success" | "warning" | "danger";

export interface Notificacion {
  // Recordatorios: id estable mientras la situación no cambie (si cambia, vuelve a aparecer como nueva).
  // Eventos: id de la fila en la tabla notificaciones.
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  texto: string;
  ruta?: string;
  origen: "evento" | "recordatorio";
  fecha?: string; // solo eventos
  leida?: boolean; // solo eventos (los recordatorios usan el almacenamiento local)
}

interface EventoRow {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string | null;
  ruta: string | null;
  leida: boolean;
  created_at: string;
}

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const enDiasISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const diasHasta = (fecha: string) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${fecha.slice(0, 10)}T00:00:00`).getTime() - hoy.getTime()) / 86_400_000);
};
const haceDias = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86_400_000;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

async function contarMembresias(sedeId: string | null, desde: string, hasta: string): Promise<number> {
  let q = supabase
    .from("membresias")
    .select("id", { count: "exact", head: true })
    .eq("estado", "activa")
    .gte("fecha_fin", desde)
    .lte("fecha_fin", hasta);
  if (sedeId) q = q.eq("sede_origen_id", sedeId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function calcular(role: string, sedeId: string | null, userId: string): Promise<Notificacion[]> {
  const lista: Notificacion[] = [];

  if (role === "cliente") {
    const [membresia, rutinas, pagos] = await Promise.all([
      obtenerMembresiaVigenteCliente(userId),
      obtenerRutinas({ clienteId: userId }),
      obtenerMisPagos(userId),
    ]);

    if (!membresia) {
      lista.push({
        origen: "recordatorio",
        id: "cli-sin-membresia",
        tipo: "danger",
        titulo: "No tienes una membresía activa",
        texto: "Paga tu plan para poder entrar al gimnasio.",
        ruta: "/cliente/pagar",
      });
    } else {
      const d = diasHasta(membresia.fechaFin);
      if (d <= 7) {
        lista.push({
        origen: "recordatorio",
          id: `cli-vence-${membresia.fechaFin.slice(0, 10)}`,
          tipo: d <= 2 ? "danger" : "warning",
          titulo: d <= 0 ? "Tu membresía vence hoy" : `Tu membresía vence en ${plural(d, "día", "días")}`,
          texto: `Plan ${membresia.planNombre}. Renuévala para no perder el acceso.`,
          ruta: "/cliente/pagar",
        });
      }
    }

    const nueva = rutinas.find((r) => r.activa && haceDias(r.updatedAt) <= 7);
    if (nueva) {
      lista.push({
        origen: "recordatorio",
        id: `cli-rutina-${nueva.id}-${nueva.updatedAt}`,
        tipo: "success",
        titulo: "Tienes una rutina nueva",
        texto: `${nueva.profesionalNombre} dejó lista “${nueva.nombre}”.`,
        ruta: "/cliente/rutinas",
      });
    } else if (membresia && !rutinas.some((r) => r.activa)) {
      lista.push({
        origen: "recordatorio",
        id: "cli-sin-rutina",
        tipo: "info",
        titulo: "Aún no tienes una rutina",
        texto: "Pídele a tu profesional que arme tu plan de entrenamiento.",
      });
    }

    const pago = pagos[0];
    if (pago && haceDias(pago.fecha) <= 3) {
      lista.push({
        origen: "recordatorio",
        id: `cli-pago-${pago.id}`,
        tipo: "success",
        titulo: "Pago registrado",
        texto: `Recibimos tu pago de S/ ${pago.monto.toFixed(2)} (${pago.metodoPago}).`,
        ruta: "/cliente/mi-membresia",
      });
    }
  } else if (role === "profesional") {
    const { clientes } = await obtenerResumenProfesional(userId);
    const sinRutina = clientes.filter((c) => !c.rutinaActiva).length;
    const porVencer = clientes.filter((c) => c.diasMembresia !== null && c.diasMembresia >= 0 && c.diasMembresia <= 7).length;
    // Con membresía vigente pero sin asistir hace 7 días o más.
    const sinVenir = clientes.filter((c) => {
      const vigente = c.diasMembresia !== null && c.diasMembresia >= 0;
      return vigente && (!c.ultimaVisita || haceDias(c.ultimaVisita) >= 7);
    }).length;

    if (sinRutina > 0)
      lista.push({
        origen: "recordatorio",
        id: `prof-sin-rutina-${sinRutina}`,
        tipo: "warning",
        titulo: `${plural(sinRutina, "cliente sin rutina", "clientes sin rutina")}`,
        texto: "Crea su plan de entrenamiento.",
        ruta: "/profesional/mis-clientes",
      });
    if (porVencer > 0)
      lista.push({
        origen: "recordatorio",
        id: `prof-por-vencer-${porVencer}`,
        tipo: "warning",
        titulo: `${plural(porVencer, "membresía por vencer", "membresías por vencer")}`,
        texto: "Tus clientes podrían dejar de venir si no renuevan.",
        ruta: "/profesional/mis-clientes",
      });
    if (sinVenir > 0)
      lista.push({
        origen: "recordatorio",
        id: `prof-sin-venir-${sinVenir}`,
        tipo: "info",
        titulo: `${plural(sinVenir, "cliente lleva", "clientes llevan")} 7 días o más sin venir`,
        texto: "Es buen momento para motivarlos.",
        ruta: "/profesional/mis-clientes",
      });
  } else {
    // super_admin, admin_sede, recepcionista
    const sede = role === "super_admin" ? null : sedeId;
    const rutaMembresias = role === "recepcionista" ? "/recepcion/buscar-cliente" : "/admin/membresias";
    const [hoy, semana] = await Promise.all([
      contarMembresias(sede, hoyISO(), hoyISO()),
      contarMembresias(sede, enDiasISO(1), enDiasISO(7)),
    ]);

    if (hoy > 0)
      lista.push({
        origen: "recordatorio",
        id: `adm-vencen-hoy-${hoyISO()}-${hoy}`,
        tipo: "danger",
        titulo: `${plural(hoy, "membresía vence hoy", "membresías vencen hoy")}`,
        texto: "Avísales para que renueven antes de entrar.",
        ruta: rutaMembresias,
      });
    if (semana > 0)
      lista.push({
        origen: "recordatorio",
        id: `adm-vencen-semana-${hoyISO()}-${semana}`,
        tipo: "warning",
        titulo: `${plural(semana, "membresía vence", "membresías vencen")} en los próximos 7 días`,
        texto: "Buen momento para ofrecer la renovación.",
        ruta: rutaMembresias,
      });
  }

  return lista;
}

async function obtenerEventos(userId: string): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from("notificaciones")
    .select("id, tipo, titulo, mensaje, ruta, leida, created_at")
    .eq("usuario_id", userId)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<EventoRow[]>();
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    tipo: e.tipo,
    titulo: e.titulo,
    texto: e.mensaje ?? "",
    ruta: e.ruta ?? undefined,
    origen: "evento" as const,
    fecha: e.created_at,
    leida: e.leida,
  }));
}

export function useNotificaciones() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const role = sesion?.role ?? null;
  const sedeId = sesion?.sedeId ?? null;

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil, enabled: !!role });
  const userId = perfil.data?.id ?? null;

  // Recordatorios calculados (membresía por vencer, etc.)
  const recordatoriosQ = useQuery({
    queryKey: ["notificaciones", role, sedeId, userId],
    queryFn: () => calcular(role as string, sedeId, userId as string),
    enabled: !!role && !!userId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });

  // Eventos reales guardados en la base de datos
  const claveEventos = ["notificaciones-eventos", userId];
  const eventosQ = useQuery({
    queryKey: claveEventos,
    queryFn: () => obtenerEventos(userId as string),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000, // respaldo por si el tiempo real no está disponible
    refetchOnWindowFocus: true,
  });

  // Aviso emergente cuando llega una notificación nueva
  const [nueva, setNueva] = useState<Notificacion | null>(null);

  useEffect(() => {
    if (!userId) return;
    return prepararSonido();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const canal = supabase
      .channel(`notificaciones-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${userId}` },
        (payload) => {
          const e = payload.new as EventoRow;
          const n: Notificacion = {
            id: e.id,
            tipo: e.tipo,
            titulo: e.titulo,
            texto: e.mensaje ?? "",
            ruta: e.ruta ?? undefined,
            origen: "evento",
            fecha: e.created_at,
            leida: false,
          };
          queryClient.invalidateQueries({ queryKey: ["notificaciones-eventos", userId] });
          setNueva(n);
          reproducirSonido(n.tipo);

          // Si la app está en segundo plano y el usuario dio permiso, aviso del sistema.
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
              new Notification(n.titulo, { body: n.texto, icon: "/icons/icon-192.png" });
            }
          } catch {
            /* algunos navegadores móviles no permiten new Notification(): se ignora */
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [userId, queryClient]);

  useEffect(() => {
    if (!nueva) return;
    const t = setTimeout(() => setNueva(null), 5000);
    return () => clearTimeout(t);
  }, [nueva]);

  // "Leídas" de los recordatorios: solo en este navegador
  const clave = userId ? `gt-notifs-leidas-${userId}` : null;
  const [leidasLocal, setLeidasLocal] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!clave) return;
    try {
      const guardado = localStorage.getItem(clave);
      setLeidasLocal(new Set(guardado ? (JSON.parse(guardado) as string[]) : []));
    } catch {
      setLeidasLocal(new Set());
    }
  }, [clave]);

  const guardarLocal = useCallback(
    (sig: Set<string>) => {
      setLeidasLocal(sig);
      if (!clave) return;
      try {
        localStorage.setItem(clave, JSON.stringify([...sig].slice(-200)));
      } catch {
        /* sin almacenamiento: quedan leídas solo mientras la pestaña esté abierta */
      }
    },
    [clave]
  );

  const eventos = eventosQ.data ?? [];
  const recordatorios = (recordatoriosQ.data ?? []).map((n) => ({ ...n, leida: leidasLocal.has(n.id) }));
  const notificaciones: Notificacion[] = useMemo(() => [...eventos, ...recordatorios], [eventos, recordatorios]);
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const marcarLeida = useCallback(
    async (n: Notificacion) => {
      if (n.leida) return;
      if (n.origen === "recordatorio") {
        guardarLocal(new Set([...leidasLocal, n.id]));
        return;
      }
      // Evento: se marca al instante en pantalla y luego en la base de datos
      queryClient.setQueryData<Notificacion[]>(claveEventos, (prev) =>
        (prev ?? []).map((x) => (x.id === n.id ? { ...x, leida: true } : x))
      );
      await (supabase.from("notificaciones") as any).update({ leida: true }).eq("id", n.id);
    },
    [leidasLocal, guardarLocal, queryClient, userId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const marcarTodas = useCallback(async () => {
    guardarLocal(new Set([...leidasLocal, ...recordatorios.map((n) => n.id)]));
    queryClient.setQueryData<Notificacion[]>(claveEventos, (prev) => (prev ?? []).map((x) => ({ ...x, leida: true })));
    if (userId) {
      await (supabase.from("notificaciones") as any)
        .update({ leida: true })
        .eq("usuario_id", userId)
        .eq("leida", false);
    }
  }, [leidasLocal, recordatorios, guardarLocal, queryClient, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    notificaciones,
    noLeidas,
    cargando: (eventosQ.isLoading || recordatoriosQ.isLoading || perfil.isLoading) && notificaciones.length === 0,
    error: eventosQ.isError && recordatoriosQ.isError,
    marcarLeida,
    marcarTodas,
    refrescar: () => {
      eventosQ.refetch();
      recordatoriosQ.refetch();
    },
    nueva,
    descartarNueva: () => setNueva(null),
  };
}