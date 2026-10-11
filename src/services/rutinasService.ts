import { supabase } from "@/lib/supabaseClient";

export interface EjercicioCatalogo {
  id: string;
  nombre: string;
  grupo_muscular: string | null;
  equipo: string | null;
}

export interface RutinaEjercicioDetalle {
  id: string;
  ejercicioId: string;
  ejercicioNombre: string;
  grupoMuscular: string | null;
  equipo: string | null;
  dia: number;
  orden: number;
  series: number;
  repeticiones: number;
  descansoSeg: number;
  pesoSugerido: string | null;
  notas: string | null;
}

export interface RutinaDetalle {
  id: string;
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  nivel: string | null;
  semanas: number | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
  clienteId: string;
  clienteNombre: string;
  profesionalId: string;
  profesionalNombre: string;
  ejercicios: RutinaEjercicioDetalle[];
  totalDias: number;
}

export interface EjercicioEntrada {
  ejercicioId: string;
  dia: number;
  series: number;
  repeticiones: number;
  descansoSeg: number;
  pesoSugerido: string;
  notas: string;
}

export interface RutinaEntrada {
  nombre: string;
  descripcion: string;
  objetivo: string;
  nivel: string;
  semanas: number | null;
  clienteId: string;
  activa: boolean;
  ejercicios: EjercicioEntrada[];
}

interface RutinaRow {
  id: string;
  profesional_id: string;
  cliente_id: string;
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  nivel: string | null;
  semanas: number | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

interface RutinaEjRow {
  id: string;
  rutina_id: string;
  ejercicio_id: string;
  dia: number;
  orden: number;
  series: number;
  repeticiones: number;
  descanso_seg: number;
  peso_sugerido: string | null;
  notas: string | null;
}

interface PersonaMini {
  id: string;
  nombre: string;
  apellido: string;
}

export interface ClienteSedeMini {
  id: string;
  nombre: string;
  apellido: string;
}

// ---------- Catálogo ----------
export async function obtenerEjercicios(): Promise<EjercicioCatalogo[]> {
  const { data, error } = await supabase
    .from("ejercicios")
    .select("id, nombre, grupo_muscular, equipo")
    .order("nombre")
    .returns<EjercicioCatalogo[]>();
  if (error) throw error;
  return data ?? [];
}

export async function crearEjercicio(params: {
  nombre: string;
  grupoMuscular: string;
  equipo?: string;
}): Promise<EjercicioCatalogo> {
  const { data, error } = await (supabase.from("ejercicios") as any)
    .insert({
      nombre: params.nombre,
      grupo_muscular: params.grupoMuscular,
      equipo: params.equipo || null,
    })
    .select("id, nombre, grupo_muscular, equipo")
    .single();
  if (error) throw error;
  return data as EjercicioCatalogo;
}

// ---------- Clientes de la sede del profesional ----------
export async function obtenerClientesDeSede(sedeId: string): Promise<ClienteSedeMini[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .eq("role", "cliente")
    .eq("sede_id", sedeId)
    .order("nombre")
    .returns<ClienteSedeMini[]>();
  if (error) throw error;
  return data ?? [];
}

// ---------- Lectura de rutinas (sirve al profesional y al cliente) ----------
// El filtro por rol lo hace RLS; aquí solo se acota por profesional o cliente.
export async function obtenerRutinas(filtro: {
  profesionalId?: string;
  clienteId?: string;
}): Promise<RutinaDetalle[]> {
  let query = supabase
    .from("rutinas")
    .select(
      "id, profesional_id, cliente_id, nombre, descripcion, objetivo, nivel, semanas, activa, created_at, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (filtro.profesionalId) query = query.eq("profesional_id", filtro.profesionalId);
  if (filtro.clienteId) query = query.eq("cliente_id", filtro.clienteId);

  const { data: rutinas, error } = await query.returns<RutinaRow[]>();
  if (error) throw error;
  if (!rutinas || rutinas.length === 0) return [];

  const rutinaIds = rutinas.map((r) => r.id);
  const personaIds = [...new Set(rutinas.flatMap((r) => [r.cliente_id, r.profesional_id]))];

  const [{ data: filas, error: errFilas }, { data: personas }, catalogo] = await Promise.all([
    supabase
      .from("rutina_ejercicios")
      .select(
        "id, rutina_id, ejercicio_id, dia, orden, series, repeticiones, descanso_seg, peso_sugerido, notas"
      )
      .in("rutina_id", rutinaIds)
      .order("dia")
      .order("orden")
      .returns<RutinaEjRow[]>(),
    supabase.from("profiles").select("id, nombre, apellido").in("id", personaIds).returns<PersonaMini[]>(),
    obtenerEjercicios(),
  ]);
  if (errFilas) throw errFilas;

  const mapaPersona = new Map((personas ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`.trim()]));
  const mapaEj = new Map(catalogo.map((e) => [e.id, e]));

  return rutinas.map((r) => {
    const ejercicios: RutinaEjercicioDetalle[] = (filas ?? [])
      .filter((f) => f.rutina_id === r.id)
      .map((f) => {
        const ej = mapaEj.get(f.ejercicio_id);
        return {
          id: f.id,
          ejercicioId: f.ejercicio_id,
          ejercicioNombre: ej?.nombre ?? "Ejercicio",
          grupoMuscular: ej?.grupo_muscular ?? null,
          equipo: ej?.equipo ?? null,
          dia: f.dia ?? 1,
          orden: f.orden,
          series: f.series,
          repeticiones: f.repeticiones,
          descansoSeg: f.descanso_seg ?? 60,
          pesoSugerido: f.peso_sugerido,
          notas: f.notas,
        };
      });

    return {
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      objetivo: r.objetivo,
      nivel: r.nivel,
      semanas: r.semanas,
      activa: r.activa,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      clienteId: r.cliente_id,
      clienteNombre: mapaPersona.get(r.cliente_id) ?? "Cliente",
      profesionalId: r.profesional_id,
      profesionalNombre: mapaPersona.get(r.profesional_id) ?? "Profesional",
      ejercicios,
      totalDias: ejercicios.length ? Math.max(...ejercicios.map((e) => e.dia)) : 0,
    };
  });
}

// ---------- Escritura (profesional) ----------
function filasEjercicios(rutinaId: string, ejercicios: EjercicioEntrada[]) {
  return ejercicios.map((e, i) => ({
    rutina_id: rutinaId,
    ejercicio_id: e.ejercicioId,
    dia: e.dia,
    orden: i + 1,
    series: e.series,
    repeticiones: e.repeticiones,
    descanso_seg: e.descansoSeg,
    peso_sugerido: e.pesoSugerido.trim() || null,
    notas: e.notas.trim() || null,
  }));
}

// Al crear una rutina el cliente queda vinculado al profesional (si no lo estaba).
async function vincularCliente(profesionalId: string, clienteId: string, sedeId: string) {
  const { data, error } = await supabase
    .from("profesional_clientes")
    .select("id")
    .eq("profesional_id", profesionalId)
    .eq("cliente_id", clienteId)
    .limit(1)
    .returns<{ id: string }[]>();
  if (error) throw error;
  if (data && data.length > 0) return;

  const { error: errIns } = await (supabase.from("profesional_clientes") as any).insert({
    profesional_id: profesionalId,
    cliente_id: clienteId,
    sede_id: sedeId,
  });
  if (errIns) throw errIns;
}

export async function guardarRutina(params: {
  id?: string;
  profesionalId: string;
  sedeId: string;
  datos: RutinaEntrada;
}) {
  const { id, profesionalId, sedeId, datos } = params;
  const cabecera = {
    cliente_id: datos.clienteId,
    nombre: datos.nombre,
    descripcion: datos.descripcion.trim() || null,
    objetivo: datos.objetivo,
    nivel: datos.nivel,
    semanas: datos.semanas,
    activa: datos.activa,
    updated_at: new Date().toISOString(),
  };

  let rutinaId = id;

  if (rutinaId) {
    const { error } = await (supabase.from("rutinas") as any).update(cabecera).eq("id", rutinaId);
    if (error) throw error;
    const { error: errDel } = await (supabase.from("rutina_ejercicios") as any)
      .delete()
      .eq("rutina_id", rutinaId);
    if (errDel) throw errDel;
  } else {
    await vincularCliente(profesionalId, datos.clienteId, sedeId);
    const { data, error } = await (supabase.from("rutinas") as any)
      .insert({ ...cabecera, profesional_id: profesionalId })
      .select("id")
      .single();
    if (error) throw error;
    rutinaId = (data as { id: string }).id;
  }

  const filas = filasEjercicios(rutinaId as string, datos.ejercicios);
  if (filas.length > 0) {
    const { error } = await (supabase.from("rutina_ejercicios") as any).insert(filas);
    if (error) throw error;
  }
}

export async function alternarRutinaActiva(id: string, activa: boolean) {
  const { error } = await (supabase.from("rutinas") as any)
    .update({ activa, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarRutina(id: string) {
  const { error: errEj } = await (supabase.from("rutina_ejercicios") as any).delete().eq("rutina_id", id);
  if (errEj) throw errEj;
  const { error } = await (supabase.from("rutinas") as any).delete().eq("id", id);
  if (error) throw error;
}