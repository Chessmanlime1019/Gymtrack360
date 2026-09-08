import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/schemas/authSchemas";

export default function ResetPassword() {
  const { actualizarPassword } = useAuth();
  const navigate = useNavigate();
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [sesionValida, setSesionValida] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase procesa el token del link y dispara este evento cuando
    // la sesión de recuperación queda lista. Si el link es inválido o
    // ya expiró, nunca llega a haber sesión y mostramos el error.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSesionValida(true);
      }
    });

    // Por si el evento ya disparó antes de montar este listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSesionValida(true);
    });

    const timeout = setTimeout(() => {
      setSesionValida((actual) => (actual === null ? false : actual));
    }, 3000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(values: ResetPasswordValues) {
    setErrorApi(null);
    setCargando(true);
    try {
      await actualizarPassword(values.password);
      setExito(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setErrorApi(
        err instanceof Error ? err.message : "No se pudo actualizar la contraseña"
      );
    } finally {
      setCargando(false);
    }
  }

  if (sesionValida === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted text-sm">Verificando link...</p>
      </div>
    );
  }

  if (sesionValida === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-lg text-center space-y-3">
          <h2 className="text-red-400 text-lg font-semibold">Link inválido o expirado</h2>
          <p className="text-muted text-sm">
            Solicita un nuevo link de recuperación de contraseña.
          </p>
        </div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-lg text-center">
          <h2 className="text-primary text-lg font-semibold mb-2">
            ¡Contraseña actualizada!
          </h2>
          <p className="text-muted text-sm">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary mb-1">GYMTRACK 360</h1>
        <p className="text-muted text-sm mb-6">Define tu nueva contraseña</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              Nueva contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmarPassword" className="block text-sm mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmarPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmarPassword")}
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.confirmarPassword && (
              <p className="text-red-400 text-xs mt-1">
                {errors.confirmarPassword.message}
              </p>
            )}
          </div>

          {errorApi && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              {errorApi}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-primary text-background font-semibold rounded-lg py-2 text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}