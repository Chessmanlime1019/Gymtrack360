import { supabase } from "@/lib/supabaseClient";

export interface MiPerfil {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  sede_id: string | null;
  qr_code: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface PerfilRow {
  id: string;
  nombre: string;
  apellido: string;
  sede_id: string | null;
  qr_code: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface MiSede {
  id: string;
  nombre: string;
  direccion: string | null;
}

export interface MiVisita {
  id: string;
  fecha_hora: string;
}

// Perfil de quien está logueado. El id y el correo salen de la sesión de
// Supabase Auth (no se piden como parámetro), así nadie puede consultar
// el perfil de otra persona pasando un id distinto.
export async function obtenerMiPerfil(): Promise<MiPerfil> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error("Sin sesión activa");
  const user = authData.user;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, sede_id, qr_code, avatar_url, created_at")
    .eq("id", user.id)
    .single<PerfilRow>();

  if (error) throw error;
  return { ...data, email: user.email ?? "" };
}

export async function obtenerMiSede(sedeId: string): Promise<MiSede> {
  const { data, error } = await supabase
    .from("sedes")
    .select("id, nombre, direccion")
    .eq("id", sedeId)
    .single<MiSede>();

  if (error) throw error;
  return data;
}

// Últimas visitas del cliente (entradas registradas por recepción).
// 60 alcanza de sobra para contar las del mes y mostrar las últimas 5.
export async function obtenerMisVisitas(clienteId: string, limite = 60): Promise<MiVisita[]> {
  const { data, error } = await supabase
    .from("asistencias")
    .select("id, fecha_hora")
    .eq("cliente_id", clienteId)
    .order("fecha_hora", { ascending: false })
    .limit(limite)
    .returns<MiVisita[]>();

  if (error) throw error;
  return data ?? [];
}

// Solo nombre y apellido: nunca se envían rol ni sede desde esta pantalla.
export async function actualizarMiPerfil(
  id: string,
  cambios: { nombre: string; apellido: string }
) {
  const { error } = await (supabase.from("profiles") as any)
    .update({ nombre: cambios.nombre, apellido: cambios.apellido })
    .eq("id", id);

  if (error) throw error;
}

export async function cambiarContrasena(nueva: string) {
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) throw error;
}