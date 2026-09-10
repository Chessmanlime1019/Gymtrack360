import { useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useQuery } from "@tanstack/react-query";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

import { supabase } from "@/lib/supabaseClient";

import {
  registerSchema,
  type RegisterFormValues,
} from "@/schemas/authSchemas";

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

  const {
    data: sedes,
    isLoading: cargandoSedes,
    isError: errorSedes,
  } = useQuery({
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
        err instanceof Error
          ? err.message
          : "No se pudo completar el registro"
      );
    } finally {
      setCargandoSubmit(false);
    }
  }

  if (exito) {
    return (
      <div className="min-h-screen flex bg-[#0d0d0d] text-white overflow-hidden">

        <div className="relative w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-10 lg:px-16 xl:px-24 bg-[#0d0d0d]">

          <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none">
            <div className="absolute top-0 left-0 w-[180px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-70" />
            <div className="absolute top-[42px] left-0 w-[140px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-25" />
          </div>

          <div className="relative z-10 w-full max-w-[520px]">

            <div className="mb-10">

              <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-[10px] border-[5px] border-[#f15a24] border-r-transparent rotate-[-12deg] flex items-center justify-center">
                  <span className="text-[#f15a24] font-black text-xl italic rotate-[12deg]">
                    G
                  </span>
                </div>

                <div className="text-[28px] leading-none tracking-tight font-extrabold italic">
                  <span className="text-white">GYMTRACK</span>
                  <span className="text-[#f15a24] ml-2">360</span>
                </div>

              </div>

              <div className="mt-4 w-16 h-[3px] bg-[#f15a24] rounded-full" />

            </div>

            <div className="max-w-md">

              <div className="w-16 h-16 rounded-2xl bg-[#f15a24]/10 border border-[#f15a24]/20 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="text-[#f15a24]"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold tracking-tight">
                ¡Cuenta creada!
              </h2>

              <p className="mt-3 text-[15px] leading-6 text-white/55">
                Revisa tu correo para confirmar tu cuenta.
                Redirigiendo al login...
              </p>

            </div>

          </div>
        </div>

        <div className="hidden lg:block lg:w-1/2 relative min-h-screen overflow-hidden bg-black">

          <img
            src="/login-gym.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />

          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/40 via-transparent to-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          <div className="absolute bottom-12 left-10 right-10">
            <div className="flex gap-4">

              <div className="w-[3px] rounded-full bg-[#f15a24] shrink-0" />

              <div>
                <p className="text-[28px] xl:text-[30px] font-bold leading-tight">
                  Entrena. Controla. Progresa.
                </p>

                <p className="text-white/65 text-[13px] mt-2">
                  La gestión completa de Cascada Gym, en un solo lugar.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0d0d0d] text-white overflow-hidden">

      {/* IZQUIERDA */}
      <div className="relative w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-10 lg:px-16 xl:px-24 bg-[#0d0d0d] overflow-y-auto">

        <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none">
          <div className="absolute top-0 left-0 w-[180px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-70" />
          <div className="absolute top-[42px] left-0 w-[140px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-25" />
        </div>

        <div className="relative z-10 w-full max-w-[520px] py-6">

          <div className="mb-8">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-[10px] border-[5px] border-[#f15a24] border-r-transparent rotate-[-12deg] flex items-center justify-center">
                <span className="text-[#f15a24] font-black text-xl italic rotate-[12deg]">
                  G
                </span>
              </div>

              <div className="text-[28px] leading-none tracking-tight font-extrabold italic">
                <span className="text-white">GYMTRACK</span>
                <span className="text-[#f15a24] ml-2">360</span>
              </div>

            </div>

            <div className="mt-4 w-16 h-[3px] bg-[#f15a24] rounded-full" />

          </div>

          <div className="mb-7">

            <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight">
              Crear cuenta
            </h1>

            <p className="mt-2 text-[15px] text-white/50">
              Crea tu cuenta de cliente y comienza tu entrenamiento.
            </p>

          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >

            {/* NOMBRE + APELLIDO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>

                <label
                  htmlFor="nombre"
                  className="block text-[13px] font-medium text-white/80 mb-2"
                >
                  Nombre
                </label>

                <input
                  id="nombre"
                  {...register("nombre")}
                  className="
                    w-full h-[50px]
                    rounded-[9px]
                    bg-[#17191b]
                    border border-white/15
                    px-4
                    text-[14px]
                    text-white
                    placeholder:text-white/25
                    outline-none
                    focus:border-[#f15a24]
                    focus:ring-2
                    focus:ring-[#f15a24]/10
                    hover:border-white/25
                    transition-all
                  "
                />

                {errors.nombre && (
                  <p className="text-red-400 text-xs mt-2">
                    {errors.nombre.message}
                  </p>
                )}

              </div>

              <div>

                <label
                  htmlFor="apellido"
                  className="block text-[13px] font-medium text-white/80 mb-2"
                >
                  Apellido
                </label>

                <input
                  id="apellido"
                  {...register("apellido")}
                  className="
                    w-full h-[50px]
                    rounded-[9px]
                    bg-[#17191b]
                    border border-white/15
                    px-4
                    text-[14px]
                    text-white
                    placeholder:text-white/25
                    outline-none
                    focus:border-[#f15a24]
                    focus:ring-2
                    focus:ring-[#f15a24]/10
                    hover:border-white/25
                    transition-all
                  "
                />

                {errors.apellido && (
                  <p className="text-red-400 text-xs mt-2">
                    {errors.apellido.message}
                  </p>
                )}

              </div>

            </div>

            {/* CORREO */}
            <div>

              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-white/80 mb-2"
              >
                Correo
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className="
                  w-full h-[50px]
                  rounded-[9px]
                  bg-[#17191b]
                  border border-white/15
                  px-4
                  text-[14px]
                  text-white
                  placeholder:text-white/25
                  outline-none
                  focus:border-[#f15a24]
                  focus:ring-2
                  focus:ring-[#f15a24]/10
                  hover:border-white/25
                  transition-all
                "
              />

              {errors.email && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.email.message}
                </p>
              )}

            </div>

            {/* SEDE */}
            <div>

              <label
                htmlFor="sedeId"
                className="block text-[13px] font-medium text-white/80 mb-2"
              >
                Sede
              </label>

              <select
                id="sedeId"
                {...register("sedeId")}
                disabled={cargandoSedes || errorSedes}
                defaultValue=""
                className="
                  w-full h-[50px]
                  rounded-[9px]
                  bg-[#17191b]
                  border border-white/15
                  px-4
                  text-[14px]
                  text-white
                  outline-none
                  focus:border-[#f15a24]
                  focus:ring-2
                  focus:ring-[#f15a24]/10
                  hover:border-white/25
                  transition-all
                "
              >
                <option value="" disabled className="bg-[#17191b]">
                  {cargandoSedes
                    ? "Cargando sedes..."
                    : errorSedes
                    ? "Error al cargar sedes"
                    : sedes && sedes.length === 0
                    ? "No hay sedes disponibles"
                    : "Selecciona tu sede"}
                </option>

                {sedes?.map((sede) => (
                  <option
                    key={sede.id}
                    value={sede.id}
                    className="bg-[#17191b]"
                  >
                    {sede.nombre}
                  </option>
                ))}
              </select>

              {errors.sedeId && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.sedeId.message}
                </p>
              )}

              {errorSedes && (
                <p className="text-red-400 text-xs mt-2">
                  No se pudieron cargar las sedes.
                  Revisa tu conexión o intenta de nuevo.
                </p>
              )}

            </div>

            {/* CONTRASEÑA */}
            <div>

              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-white/80 mb-2"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
                className="
                  w-full h-[50px]
                  rounded-[9px]
                  bg-[#17191b]
                  border border-white/15
                  px-4
                  text-[14px]
                  text-white
                  placeholder:text-white/25
                  outline-none
                  focus:border-[#f15a24]
                  focus:ring-2
                  focus:ring-[#f15a24]/10
                  hover:border-white/25
                  transition-all
                "
              />

              {errors.password && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.password.message}
                </p>
              )}

            </div>

            {/* CONFIRMAR */}
            <div>

              <label
                htmlFor="confirmarPassword"
                className="block text-[13px] font-medium text-white/80 mb-2"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmarPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmarPassword")}
                className="
                  w-full h-[50px]
                  rounded-[9px]
                  bg-[#17191b]
                  border border-white/15
                  px-4
                  text-[14px]
                  text-white
                  placeholder:text-white/25
                  outline-none
                  focus:border-[#f15a24]
                  focus:ring-2
                  focus:ring-[#f15a24]/10
                  hover:border-white/25
                  transition-all
                "
              />

              {errors.confirmarPassword && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.confirmarPassword.message}
                </p>
              )}

            </div>

            {errorApi && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                {errorApi}
              </div>
            )}

            <button
              type="submit"
              disabled={cargandoSubmit}
              className="
                w-full
                h-[52px]
                rounded-[9px]
                bg-[#f15a24]
                text-white
                font-semibold
                text-[14px]
                shadow-[0_8px_30px_rgba(241,90,36,0.18)]
                hover:bg-[#ff6930]
                hover:shadow-[0_10px_35px_rgba(241,90,36,0.25)]
                transition-all
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {cargandoSubmit
                ? "Creando cuenta..."
                : "Registrarme"}
            </button>

          </form>

          <p className="text-white/45 text-[13px] text-center mt-6">

            ¿Ya tienes cuenta?{" "}

            <Link
              to="/login"
              className="
                text-[#f15a24]
                font-medium
                hover:text-[#ff7541]
                transition-colors
              "
            >
              Inicia sesión
            </Link>

          </p>

        </div>
      </div>

      {/* DERECHA */}
      <div className="hidden lg:block lg:w-1/2 relative min-h-screen overflow-hidden bg-black">

        <img
          src="/login-gym.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/40 via-transparent to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        <div className="absolute bottom-12 left-10 right-10">

          <div className="flex gap-4">

            <div className="w-[3px] rounded-full bg-[#f15a24] shrink-0" />

            <div>

              <p className="text-[28px] xl:text-[30px] font-bold leading-tight">
                Entrena. Controla. Progresa.
              </p>

              <p className="text-white/65 text-[13px] mt-2">
                La gestión completa de Cascada Gym, en un solo lugar.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}