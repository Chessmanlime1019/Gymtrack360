import { supabase } from "@/lib/supabaseClient";
import type { MembresiaEstado } from "@/types";

export interface MembresiaConDetalle {
  id: string;
  cliente_id: string;
  clienteNombre: string;
  plan_id: string;
  planNombre: string;
  sede_origen_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: MembresiaEstado;
}

interface MembresiaRow {
  id: string;
  cliente_id: string;
  plan_id: string;
  sede_origen_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: MembresiaEstado;
}

interface ClienteMini {
  id: string;
  nombre: string;
  apellido: string;
}

interface PlanMini {
  id: string;
  nombre: string;
}

export async function obtenerMembresias(
  sedeId: string | null
): Promise<MembresiaConDetalle[]> {
  let query = supabase
    .from("membresias")
    .select("id, cliente_id, plan_id, sede_origen_id, fecha_inicio, fecha_fin, estado")
    .order("fecha_fin", { ascending: false });

  if (sedeId) {
    query = query.eq("sede_origen_id", sedeId);
  }

  const { data, error } = await query.returns<MembresiaRow[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Igual que en clientesService: dos consultas separadas en vez de un
  // join embebido, porque Relationships:[] en database.types.ts bloquea
  // la inferencia de tipos de los joins de PostgREST.
  const clienteIds = [...new Set(data.map((m) => m.cliente_id))];
  const planIds = [...new Set(data.map((m) => m.plan_id))];

  const [{ data: clientes, error: errCli }, { data: planes, error: errPlan }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nombre, apellido")
        .in("id", clienteIds)
        .returns<ClienteMini[]>(),
      supabase
        .from("planes")
        .select("id, nombre")
        .in("id", planIds)
        .returns<PlanMini[]>(),
    ]);

  if (errCli) throw errCli;
  if (errPlan) throw errPlan;

  const mapaClientes = new Map((clientes ?? []).map((c) => [c.id, c]));
  const mapaPlanes = new Map((planes ?? []).map((p) => [p.id, p]));

  return data.map((m) => {
    const cliente = mapaClientes.get(m.cliente_id);
    const plan = mapaPlanes.get(m.plan_id);
    return {
      ...m,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : "Cliente",
      planNombre: plan?.nombre ?? "Plan",
    };
  });
}

export async function crearMembresia(params: {
  clienteId: string;
  planId: string;
  sedeId: string;
  duracionDias: number;
}) {
  const fechaInicio = new Date();
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + params.duracionDias);

  const { error } = await (supabase.from("membresias") as any).insert({
    cliente_id: params.clienteId,
    plan_id: params.planId,
    sede_origen_id: params.sedeId,
    fecha_inicio: fechaInicio.toISOString().slice(0, 10),
    fecha_fin: fechaFin.toISOString().slice(0, 10),
    estado: "activa",
  });

  if (error) throw error;
}

export async function renovarMembresia(params: {
  membresiaAnteriorId: string;
  clienteId: string;
  planId: string;
  sedeId: string;
  duracionDias: number;
  fechaFinAnterior: string;
}) {
  // Regla de negocio (documentada a propósito, es una simplificación
  // razonable para el alcance del proyecto): si la membresía anterior
  // aún no vence, la renovación extiende desde esa fecha, no desde hoy,
  // así el cliente no "pierde" días ya pagados. Si ya venció, arranca hoy.
  const hoy = new Date();
  const finAnterior = new Date(params.fechaFinAnterior);
  const fechaInicio = finAnterior > hoy ? finAnterior : hoy;
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + params.duracionDias);

  // Marca la anterior como vencida para que no queden 2 membresías
  // "activa" compitiendo dentro de validar_acceso_qr.
  const { error: errUpdate } = await (supabase.from("membresias") as any)
    .update({ estado: "vencida" })
    .eq("id", params.membresiaAnteriorId);
  if (errUpdate) throw errUpdate;

  const { error: errInsert } = await (supabase.from("membresias") as any).insert({
    cliente_id: params.clienteId,
    plan_id: params.planId,
    sede_origen_id: params.sedeId,
    fecha_inicio: fechaInicio.toISOString().slice(0, 10),
    fecha_fin: fechaFin.toISOString().slice(0, 10),
    estado: "activa",
  });
  if (errInsert) throw errInsert;
}

export async function cancelarMembresia(id: string) {
  const { error } = await (supabase.from("membresias") as any)
    .update({ estado: "cancelada" })
    .eq("id", id);
  if (error) throw error;
}