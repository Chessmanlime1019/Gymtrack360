import { supabase } from "@/lib/supabaseClient";

export interface Medicion {
  id: string;
  clienteId: string;
  fecha: string; // YYYY-MM-DD
  pesoKg: number | null;
  grasaPct: number | null;
  cinturaCm: number | null;
  pechoCm: number | null;
  caderaCm: number | null;
  brazoCm: number | null;
  piernaCm: number | null;
  nota: string | null;
  registradoPor: string;
}

export type CampoMedicion =
  | "pesoKg"
  | "grasaPct"
  | "cinturaCm"
  | "pechoCm"
  | "caderaCm"
  | "brazoCm"
  | "piernaCm";

interface Fila {
  id: string;
  cliente_id: string;
  fecha: string;
  peso_kg: number | null;
  grasa_pct: number | null;
  cintura_cm: number | null;
  pecho_cm: number | null;
  cadera_cm: number | null;
  brazo_cm: number | null;
  pierna_cm: number | null;
  nota: string | null;
  registrado_por: string;
}

const num = (v: number | string | null): number | null => (v === null ? null : Number(v));

// Orden cronológico (de la más antigua a la más reciente).
export async function obtenerMediciones(clienteId: string): Promise<Medicion[]> {
  const { data, error } = await (supabase.from("mediciones") as any)
    .select(
      "id, cliente_id, fecha, peso_kg, grasa_pct, cintura_cm, pecho_cm, cadera_cm, brazo_cm, pierna_cm, nota, registrado_por"
    )
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;

  return ((data ?? []) as Fila[]).map((f) => ({
    id: f.id,
    clienteId: f.cliente_id,
    fecha: f.fecha,
    pesoKg: num(f.peso_kg),
    grasaPct: num(f.grasa_pct),
    cinturaCm: num(f.cintura_cm),
    pechoCm: num(f.pecho_cm),
    caderaCm: num(f.cadera_cm),
    brazoCm: num(f.brazo_cm),
    piernaCm: num(f.pierna_cm),
    nota: f.nota,
    registradoPor: f.registrado_por,
  }));
}

export interface NuevaMedicion {
  clienteId: string;
  fecha: string;
  pesoKg?: number;
  grasaPct?: number;
  cinturaCm?: number;
  pechoCm?: number;
  caderaCm?: number;
  brazoCm?: number;
  piernaCm?: number;
  nota?: string;
}

export async function crearMedicion(m: NuevaMedicion) {
  const { error } = await (supabase.from("mediciones") as any).insert({
    cliente_id: m.clienteId,
    fecha: m.fecha,
    peso_kg: m.pesoKg ?? null,
    grasa_pct: m.grasaPct ?? null,
    cintura_cm: m.cinturaCm ?? null,
    pecho_cm: m.pechoCm ?? null,
    cadera_cm: m.caderaCm ?? null,
    brazo_cm: m.brazoCm ?? null,
    pierna_cm: m.piernaCm ?? null,
    nota: m.nota?.trim() ? m.nota.trim() : null,
  });
  if (error) throw new Error("No se pudo guardar. Revisa que los valores sean realistas.");
}

export async function eliminarMedicion(id: string) {
  const { error } = await (supabase.from("mediciones") as any).delete().eq("id", id);
  if (error) throw error;
}