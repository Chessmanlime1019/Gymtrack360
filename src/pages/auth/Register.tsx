import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { registerSchema, type RegisterFormValues } from "@/schemas/authSchemas";

async function obtenerSedesActivas() {
  const { data, error } = await supabase
    .from("sedes")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();

  if (error) throw error;
  return data;
}

export default function Register() {
  const { registrar } = useAuth();
  const navigate = useNavigate();
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [cargandoSubmit, setCargandoSubmit] = useState(false);

  const { data: sedes, isLoading: cargandoSedes } = useQuery({
    queryKey: ["sedes-activas"],
    queryFn: obtenerSedesActivas,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterFormValues) {
    setErrorApi(null);
    setCargandoSubmit(true);
    try {
      await registrar({
        email: values.email,
        password: values.password,
        nombre: values.nombre,
        apellido: values.apellido,
        sedeId: values.sedeId,
      });
      setExito(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setErrorApi(
        err instanceof Error ? err.message : "No se pudo completar el registro"
      );
    } finally {
      setCargandoSubmit(false);
    }
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-lg text-center">
          <h2 className="text-primary text-lg font-semibold mb-2">
            ¡Cuenta creada!
          </h2>
          <p className="text-muted text-sm">
            Revisa tu correo para confirmar tu cuenta. Redirigiendo al login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary mb-1">GYMTRACK 360</h1>
        <p className="text-muted text-sm mb-6">Crea tu cuenta de cliente</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nombre" className="block text-sm mb-1">
                Nombre
              </label>
              <input
                id="nombre"
                {...register("nombre")}
                className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.nombre && (
                <p className="text-red-400 text-xs mt-1">{errors.nombre.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="apellido" className="block text-sm mb-1">
                Apellido
              </label>
              <input
                id="apellido"
                {...register("apellido")}
                className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.apellido && (
                <p className="text-red-400 text-xs mt-1">{errors.apellido.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="sedeId" className="block text-sm mb-1">
              Sede
            </label>
            <select
              id="sedeId"
              {...register("sedeId")}
              disabled={cargandoSedes}
              defaultValue=""
              className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>
                {cargandoSedes ? "Cargando sedes..." : "Selecciona tu sede"}
              </option>
              {sedes?.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
            {errors.sedeId && (
              <p className="text-red-400 text-xs mt-1">{errors.sedeId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              Contraseña
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
            disabled={cargandoSubmit}
            className="w-full bg-primary text-background font-semibold rounded-lg py-2 text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {cargandoSubmit ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="text-muted text-xs text-center mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}