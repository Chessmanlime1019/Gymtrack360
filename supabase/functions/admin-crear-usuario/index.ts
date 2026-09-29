// supabase/functions/admin-crear-usuario/index.ts
//
// Crea un usuario (Auth + fila en profiles) desde el panel de administración.
// Se ejecuta en el servidor porque necesita la service_role key: esa clave
// NUNCA debe usarse desde el navegador.
//
// Seguridad: antes de crear nada, valida con el token de quien llama que
// esa persona ya es super_admin o admin_sede en la tabla profiles. Si no,
// devuelve 403. Así nadie puede llamar a esta función a mano (por ejemplo
// desde la consola del navegador) y crear cuentas con permisos que no le
// corresponden.
//
// Deploy: supabase functions deploy admin-crear-usuario
// (no hace falta configurar nada mas: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
// ya existen automaticamente dentro de toda Edge Function de Supabase)

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLES_VALIDOS = [
  "super_admin",
  "admin_sede",
  "recepcionista",
  "profesional",
  "cliente",
] as const;
type Rol = (typeof ROLES_VALIDOS)[number];

interface CuerpoPeticion {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  role: Rol;
  sedeId: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Falta autenticación." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente "como el que llama": respeta RLS, sirve solo para confirmar
    // quién es y qué rol tiene.
    const clienteLlamador = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await clienteLlamador.auth.getUser();

    if (!user) {
      return json({ error: "Sesión inválida." }, 401);
    }

    const { data: perfilLlamador, error: errPerfil } = await clienteLlamador
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (errPerfil || !perfilLlamador) {
      return json({ error: "No se pudo verificar tu rol." }, 403);
    }

    if (!["super_admin", "admin_sede"].includes(perfilLlamador.role)) {
      return json({ error: "No tienes permiso para crear usuarios." }, 403);
    }

    const body: CuerpoPeticion = await req.json();

    if (!body.nombre || !body.apellido || !body.email || !body.password) {
      return json({ error: "Faltan datos obligatorios." }, 400);
    }
    if (body.password.length < 8) {
      return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
    }
    if (!ROLES_VALIDOS.includes(body.role)) {
      return json({ error: "Rol inválido." }, 400);
    }

    // Cliente con permisos totales: solo para crear el usuario y su perfil.
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: nuevoUsuario, error: errCrear } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (errCrear || !nuevoUsuario.user) {
      return json({ error: errCrear?.message ?? "No se pudo crear el usuario." }, 400);
    }

    // upsert: por si un trigger ya crea una fila vacía en profiles al
    // registrarse en Auth. Así funciona exista o no ese trigger.
    const { error: errPerfilNuevo } = await admin.from("profiles").upsert({
      id: nuevoUsuario.user.id,
      nombre: body.nombre,
      apellido: body.apellido,
      role: body.role,
      sede_id: body.role === "super_admin" ? null : body.sedeId,
      activo: true,
    });

    if (errPerfilNuevo) {
      // El usuario de Auth ya se creó; si el perfil falla, se revierte
      // para no dejar una cuenta fantasma sin perfil.
      await admin.auth.admin.deleteUser(nuevoUsuario.user.id);
      return json({ error: "No se pudo crear el perfil del usuario." }, 400);
    }

    return json({ id: nuevoUsuario.user.id }, 201);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error inesperado." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}