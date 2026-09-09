import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, type LoginFormValues } from "@/schemas/authSchemas";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [cargandoSubmit, setCargandoSubmit] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setErrorApi(null);
    setCargandoSubmit(true);
    try {
      await login(values.email, values.password);
      navigate("/");
    } catch (err) {
      setErrorApi(
        err instanceof Error ? err.message : "No se pudo iniciar sesiÃ³n"
      );
    } finally {
      setCargandoSubmit(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary mb-1">GYMTRACK 360</h1>
        <p className="text-muted text-sm mb-6">Inicia sesiÃ³n para continuar</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="tucorreo@gymtrack.com"
            />
            {errors.email && (
              <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              ContraseÃ±a
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="w-full rounded-lg bg-background border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            />
            {errors.password && (
              <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-primary text-xs hover:underline"
            >
              Â¿Olvidaste tu contraseÃ±a?
            </Link>
          </div>

          {errorApi && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-sm rounded-lg px-3 py-2">
              {errorApi}
            </div>
          )}

          <button
            type="submit"
            disabled={cargandoSubmit}
            className="w-full bg-primary text-background font-semibold rounded-lg py-2 text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {cargandoSubmit ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-muted text-xs text-center mt-6">
          Â¿No tienes cuenta?{" "}
          <Link to="/register" className="text-primary hover:underline">
            RegÃ­strate
          </Link>
        </p>
      </div>
    </div>
  );
}
