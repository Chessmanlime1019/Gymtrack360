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
  recuperarPassword: (email: string) => Promise<void>;
  verificarCodigoRecuperacion: (email: string, codigo: string) => Promise<void>;
  actualizarPassword: (nuevaPassword: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refrescarPerfil: () => Promise<void>;
  registrar: (params: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    sedeId: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CUENTA_DESACTIVADA = "Tu cuenta está desactivada. Comunícate con la administración del gimnasio.";

async function cargarPerfil(userId: string, email: string): Promise<SesionUsuario> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nombre, apellido, role, sede_id, avatar_url, activo")
    .eq("id", userId)
    .single<Pick<Profile, "nombre" | "apellido" | "role" | "sede_id" | "avatar_url" | "activo">>();

  if (error || !data) {
    throw new Error("No se pudo cargar el perfil del usuario");
  }
  if (!data.activo) throw new Error(CUENTA_DESACTIVADA);

  return {
    userId,
    email,
    nombre: data.nombre,
    apellido: data.apellido,
    role: data.role as UserRole,
    sedeId: data.sede_id,
    avatarUrl: data.avatar_url,
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
        } catch (err) {
          if (activo) setSesion(null);
          // La desactivaron con la sesión abierta: se cierra al volver a entrar.
          if (err instanceof Error && err.message === CUENTA_DESACTIVADA) await supabase.auth.signOut();
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: perfil } = await supabase
      .from("profiles")
      .select("activo")
      .eq("id", data.user.id)
      .single<Pick<Profile, "activo">>();
    if (perfil && !perfil.activo) {
      await supabase.auth.signOut();
      throw new Error(CUENTA_DESACTIVADA);
    }
  }

  async function refrescarPerfil() {
    if (!sesion) return;
    const perfil = await cargarPerfil(sesion.userId, sesion.email);
    setSesion(perfil);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSesion(null);
  }

  async function recuperarPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  // Valida el código que llega en el correo de recuperación. Si es correcto,
  // Supabase abre una sesión temporal que permite cambiar la contraseña.
  async function verificarCodigoRecuperacion(email: string, codigo: string) {
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "recovery" });
    if (error) throw error;
  }

  async function actualizarPassword(nuevaPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
    if (error) throw error;
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
    <AuthContext.Provider
      value={{
        sesion,
        cargando,
        login,
        logout,
        registrar,
        recuperarPassword,
        verificarCodigoRecuperacion,
        actualizarPassword,
        refrescarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de <AuthProvider>");
  return ctx;
}