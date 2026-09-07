import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Profile, SesionUsuario, UserRole } from "@/types";

interface AuthContextValue {
  sesion: SesionUsuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registrar: (params: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    sedeId: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function cargarPerfil(userId: string, email: string): Promise<SesionUsuario> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nombre, apellido, role, sede_id")
    .eq("id", userId)
    .single<Pick<Profile, "nombre" | "apellido" | "role" | "sede_id">>();

  if (error || !data) {
    throw new Error("No se pudo cargar el perfil del usuario");
  }

  return {
    userId,
    email,
    nombre: data.nombre,
    apellido: data.apellido,
    role: data.role as UserRole,
    sedeId: data.sede_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!activo) return;
      if (session?.user) {
        try {
          const perfil = await cargarPerfil(session.user.id, session.user.email!);
          if (activo) setSesion(perfil);
        } catch {
          if (activo) setSesion(null);
        }
      }
      if (activo) setCargando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!activo) return;
        if (session?.user) {
          try {
            const perfil = await cargarPerfil(session.user.id, session.user.email!);
            if (activo) setSesion(perfil);
          } catch {
            if (activo) setSesion(null);
          }
        } else {
          setSesion(null);
        }
      }
    );

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
    setSesion(null);
  }

  async function registrar(params: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    sedeId: string;
  }) {
    const { error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          nombre: params.nombre,
          apellido: params.apellido,
          sede_id: params.sedeId,
        },
      },
    });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ sesion, cargando, login, logout, registrar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de <AuthProvider>");
  return ctx;
}