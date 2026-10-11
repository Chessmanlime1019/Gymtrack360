import { supabase } from "@/lib/supabaseClient";
import { obtenerRutinas, type RutinaDetalle } from "@/services/rutinasService";

export interface ClienteResumen {
  id: string;
  nombre: string;
  apellido: string;
  avatarUrl: string | null;
  rutinaActiva: RutinaDetalle | null;
  membresiaFin: string | null; // fecha_fin de la membresía activa más reciente
  diasMembresia: number | null; // días que faltan (negativo = vencida)
  ultimaVisita: string | null;
  visitas30d: number;
}

export interface ResumenProfesional {
  clientes: ClienteResumen[];
  totalRutinas: number;
  rutinasActivas: number;
  visitasPorDia: { fecha: string; total: number }[]; // últimos 7 días, de más antiguo a hoy
}

interface PersonaRow {
  id: string;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
}
interface MembRow {
  cliente_id: string;
  estado: string;
  fecha_fin: string;
}
interface AsisRow {
  cliente_id: string;
  fecha_hora: string;
}

function diasHasta(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin.slice(0, 10)}T00:00:00`);
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function obtenerResumenProfesional(profesionalId: string): Promise<ResumenProfesional> {
  const { data: vinculos, error: errV } = await supabase
    .from("profesional_clientes")
    .select("cliente_id")
    .eq("profesional_id", profesionalId)
    .returns<{ cliente_id: string }[]>();
  if (errV) throw errV;

  const rutinas = await obtenerRutinas({ profesionalId });
  const ids = [...new Set((vinculos ?? []).map((v) => v.cliente_id))];

  if (ids.length === 0) {
    return {
      clientes: [],
      totalRutinas: rutinas.length,
      rutinasActivas: rutinas.filter((r) => r.activa).length,
      visitasPorDia: ultimosDias().map((fecha) => ({ fecha, total: 0 })),
    };
  }

  const desde30 = new Date();
  desde30.setDate(desde30.getDate() - 30);

  const [personas, membresias, asistencias] = await Promise.all([
    supabase.from("profiles").select("id, nombre, apellido, avatar_url").in("id", ids).returns<PersonaRow[]>(),
    supabase
      .from("membresias")
      .select("cliente_id, estado, fecha_fin")
      .in("cliente_id", ids)
      .eq("estado", "activa")
      .order("fecha_fin", { ascending: false })
      .returns<MembRow[]>(),
    supabase
      .from("asistencias")
      .select("cliente_id, fecha_hora")
      .in("cliente_id", ids)
      .gte("fecha_hora", desde30.toISOString())
      .order("fecha_hora", { ascending: false })
      .limit(1000)
      .returns<AsisRow[]>(),
  ]);
  if (personas.error) throw personas.error;
  if (membresias.error) throw membresias.error;
  if (asistencias.error) throw asistencias.error;

  const clientes: ClienteResumen[] = (personas.data ?? []).map((p) => {
    const mem = (membresias.data ?? []).find((m) => m.cliente_id === p.id) ?? null;
    const visitas = (asistencias.data ?? []).filter((a) => a.cliente_id === p.id);
    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      avatarUrl: p.avatar_url,
      rutinaActiva: rutinas.find((r) => r.clienteId === p.id && r.activa) ?? null,
      membresiaFin: mem?.fecha_fin ?? null,
      diasMembresia: mem ? diasHasta(mem.fecha_fin) : null,
      ultimaVisita: visitas[0]?.fecha_hora ?? null,
      visitas30d: visitas.length,
    };
  });

  const dias = ultimosDias();
  const visitasPorDia = dias.map((fecha) => ({
    fecha,
    total: (asistencias.data ?? []).filter((a) => aISO(new Date(a.fecha_hora)) === fecha).length,
  }));

  return {
    clientes,
    totalRutinas: rutinas.length,
    rutinasActivas: rutinas.filter((r) => r.activa).length,
    visitasPorDia,
  };
}

function ultimosDias(): string[] {
  const res: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    res.push(aISO(d));
  }
  return res;
}