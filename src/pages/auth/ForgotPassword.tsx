import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/schemas/authSchemas";

export default function ForgotPassword() {
  const { recuperarPassword } = useAuth();
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setErrorApi(null);
    setCargando(true);
    try {
      await recuperarPassword(values.email);
      setEnviado(true);
    } catch (err) {
      setErrorApi(
        err instanceof Error ? err.message : "No se pudo enviar el correo"
      );
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-lg text-center space-y-3">
          <h2 className="text-primary text-lg font-semibold">Revisa tu correo</h2>
          <p className="text-muted text-sm">
            Si el correo existe en nuestro sistema, te enviamos un link para
            restablecer tu contraseÃ±a.
          </p>
          <Link to="/login" className="text-primary text-sm hover:underline inline-block">
            Volver a iniciar sesiÃ³n
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary mb-1">GYMTRACK 360</h1>
        <p className="text-muted text-sm mb-6">
          Ingresa tu correo para recuperar tu contraseÃ±a
        </p>

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

          {errorApi && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-sm rounded-lg px-3 py-2">
              {errorApi}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-primary text-background font-semibold rounded-lg py-2 text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {cargando ? "Enviando..." : "Enviar link de recuperaciÃ³n"}
          </button>
        </form>

        <p className="text-muted text-xs text-center mt-6">
          <Link to="/login" className="text-primary hover:underline">
            Volver a iniciar sesiÃ³n
          </Link>
        </p>
      </div>
    </div>
  );
}
