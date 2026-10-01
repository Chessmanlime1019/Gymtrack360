import { supabase } from "@/lib/supabaseClient";

export interface OperacionHistorial {
  id: string;
  tabla: string;
  operacion: "INSERT" | "UPDATE" | "DELETE";
  sede_id: string | null;
  sedeNombre: string | null;
  actor_id: string | null;
  actorNombre: string | null;
  detalle: Record<string, unknown> | null;
  created_at: string;
  descripcion: string;
}

interface HistorialRow {
  id: string;
  tabla: string;
  operacion: "INSERT" | "UPDATE" | "DELETE";
  registro_id: string | null;
  sede_id: string | null;
  actor_id: string | null;
  detalle: Record<string, unknown> | null;
  created_at: string;
}

interface SedeMini {
  id: string;
  nombre: string;
}
interface ActorMini {
  id: string;
  nombre: string;
  apellido: string;
}

const NOMBRE_TABLA: Record<string, string> = {
  profiles: "usuario",
  sedes: "sede",
  planes: "plan",
  membresias: "membresía",
  pagos: "pago",
};

// Arma una frase legible a partir de tabla + operación + el detalle (la
// fila completa en el momento del cambio, guardada por el trigger).
function describir(fila: HistorialRow): string {
  const d = fila.detalle ?? {};
  const entidad = NOMBRE_TABLA[fila.tabla] ?? fila.tabla;

  if (fila.tabla === "profiles") {
    const nombre = [d.nombre, d.apellido].filter(Boolean).join(" ") || "un usuario";
    if (d.activo === false) return `Se desactivó a ${nombre}`;
    if (d.activo === true) return `Se activó a ${nombre}`;
    return `Se actualizó el rol de ${nombre} a "${d.role ?? "?"}"`;
  }
  if (fila.tabla === "sedes") {
    if (fila.operacion === "INSERT") return `Se creó la sede "${d.nombre ?? ""}"`;
    if (d.activa === false) return `Se desactivó la sede "${d.nombre ?? ""}"`;
    if (d.activa === true) return `Se activó la sede "${d.nombre ?? ""}"`;
    return `Se editó la sede "${d.nombre ?? ""}"`;
  }
  if (fila.tabla === "planes") {
    if (fila.operacion === "INSERT") return `Se creó el plan "${d.nombre ?? ""}"`;
    if (d.activo === false) return `Se desactivó el plan "${d.nombre ?? ""}"`;
    if (d.activo === true) return `Se activó el plan "${d.nombre ?? ""}"`;
    return `Se editó el plan "${d.nombre ?? ""}"`;
  }
  if (fila.tabla === "membresias") {
    if (fila.operacion === "INSERT") return "Se asignó una nueva membresía";
    if (d.estado === "cancelada") return "Se canceló una membresía";
    if (d.estado === "vencida") return "Una membresía pasó a vencida (renovación)";
    return "Se actualizó una membresía";
  }
  if (fila.tabla === "pagos") {
    const monto = typeof d.monto === "number" ? `S/ ${d.monto.toFixed(2)}` : "";
    return `Se registró un pago ${monto}`.trim();
  }
  return `${fila.operacion} en ${entidad}`;
}

export async function obtenerHistorial(
  sedeId: string | null,
  desde: string,
  hastaISO: string
): Promise<OperacionHistorial[]> {
  let query = supabase
    .from("historial_operaciones")
    .select("id, tabla, operacion, registro_id, sede_id, actor_id, detalle, created_at")
    .gte("created_at", desde)
    .lte("created_at", hastaISO)
    .order("created_at", { ascending: false })
    .limit(500);

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  const { data, error } = await query.returns<HistorialRow[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const sedeIds = [...new Set(data.map((f) => f.sede_id).filter(Boolean))] as string[];
  const actorIds = [...new Set(data.map((f) => f.actor_id).filter(Boolean))] as string[];

  const [sedesRes, actoresRes] = await Promise.all([
    sedeIds.length
      ? supabase.from("sedes").select("id, nombre").in("id", sedeIds).returns<SedeMini[]>()
      : Promise.resolve({ data: [] as SedeMini[], error: null }),
    actorIds.length
      ? supabase
          .from("profiles")
          .select("id, nombre, apellido")
          .in("id", actorIds)
          .returns<ActorMini[]>()
      : Promise.resolve({ data: [] as ActorMini[], error: null }),
  ]);

  const mapaSedes = new Map((sedesRes.data ?? []).map((s) => [s.id, s.nombre]));
  const mapaActores = new Map(
    (actoresRes.data ?? []).map((a) => [a.id, `${a.nombre} ${a.apellido}`])
  );

  return data.map((f) => ({
    id: f.id,
    tabla: f.tabla,
    operacion: f.operacion,
    sede_id: f.sede_id,
    sedeNombre: f.sede_id ? (mapaSedes.get(f.sede_id) ?? null) : null,
    actor_id: f.actor_id,
    actorNombre: f.actor_id ? (mapaActores.get(f.actor_id) ?? "Alguien del sistema") : "Sistema",
    detalle: f.detalle,
    created_at: f.created_at,
    descripcion: describir(f),
  }));
}