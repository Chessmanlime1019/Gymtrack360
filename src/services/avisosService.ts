import { supabase } from "@/lib/supabaseClient";

export type TipoAviso = "info" | "importante" | "promo";

export interface Aviso {
  id: string;
  sedeId: string | null; // null = todas las sedes
  titulo: string;
  mensaje: string;
  tipo: TipoAviso;
  fijado: boolean;
  activo: boolean;
  venceEn: string | null; // YYYY-MM-DD
  createdAt: string;
  publicadoPor: string;
}

interface Fila {
  id: string;
  sede_id: string | null;
  titulo: string;
  mensaje: string;
  tipo: TipoAviso;
  fijado: boolean;
  activo: boolean;
  vence_en: string | null;
  created_at: string;
  publicado_por: string;
}

const COLUMNAS = "id, sede_id, titulo, mensaje, tipo, fijado, activo, vence_en, created_at, publicado_por";

export function hoyLima(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

const mapear = (f: Fila): Aviso => ({
  id: f.id,
  sedeId: f.sede_id,
  titulo: f.titulo,
  mensaje: f.mensaje,
  tipo: f.tipo,
  fijado: f.fijado,
  activo: f.activo,
  venceEn: f.vence_en,
  createdAt: f.created_at,
  publicadoPor: f.publicado_por,
});

export function estaVigente(a: Aviso): boolean {
  return a.activo && (!a.venceEn || a.venceEn >= hoyLima());
}

// Fijados primero, luego los más recientes.
function ordenar(lista: Aviso[]): Aviso[] {
  return [...lista].sort((a, b) =>
    a.fijado !== b.fijado ? (a.fijado ? -1 : 1) : b.createdAt.localeCompare(a.createdAt)
  );
}

// Lo que ve cualquier persona: avisos activos y vigentes de su sede (la base
// de datos ya lo filtra; aquí se vuelve a filtrar por seguridad de la vista).
export async function obtenerAvisosVigentes(): Promise<Aviso[]> {
  const { data, error } = await (supabase.from("avisos") as any)
    .select(COLUMNAS)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ordenar(((data ?? []) as Fila[]).map(mapear).filter(estaVigente));
}

// Vista del staff: incluye ocultos y vencidos de su sede.
export async function obtenerAvisosGestion(): Promise<Aviso[]> {
  const { data, error } = await (supabase.from("avisos") as any)
    .select(COLUMNAS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ordenar(((data ?? []) as Fila[]).map(mapear));
}

export interface DatosAviso {
  sedeId: string | null;
  titulo: string;
  mensaje: string;
  tipo: TipoAviso;
  fijado: boolean;
  venceEn: string | null;
}

export async function crearAviso(d: DatosAviso) {
  const { error } = await (supabase.from("avisos") as any).insert({
    sede_id: d.sedeId,
    titulo: d.titulo.trim(),
    mensaje: d.mensaje.trim(),
    tipo: d.tipo,
    fijado: d.fijado,
    vence_en: d.venceEn,
  });
  if (error) throw new Error("No se pudo publicar el aviso.");
}

export async function actualizarAviso(id: string, d: Omit<DatosAviso, "sedeId">) {
  const { error } = await (supabase.from("avisos") as any)
    .update({
      titulo: d.titulo.trim(),
      mensaje: d.mensaje.trim(),
      tipo: d.tipo,
      fijado: d.fijado,
      vence_en: d.venceEn,
    })
    .eq("id", id);
  if (error) throw new Error("No se pudo guardar el aviso.");
}

export async function alternarActivoAviso(id: string, activo: boolean) {
  const { error } = await (supabase.from("avisos") as any).update({ activo }).eq("id", id);
  if (error) throw error;
}

export async function eliminarAviso(id: string) {
  const { error } = await (supabase.from("avisos") as any).delete().eq("id", id);
  if (error) throw error;
}