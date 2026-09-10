import { useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

import {
  loginSchema,
  type LoginFormValues,
} from "@/schemas/authSchemas";

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
        err instanceof Error
          ? err.message
          : "No se pudo iniciar sesión"
      );
    } finally {
      setCargandoSubmit(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0d0d0d] text-white overflow-hidden">

      {/* =========================================================
          COLUMNA IZQUIERDA - LOGIN
      ========================================================= */}
      <div className="relative w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-10 lg:px-16 xl:px-24 bg-[#0d0d0d] overflow-hidden">

        {/* Decoración superior izquierda */}
        <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none">
          <div className="absolute top-0 left-0 w-[180px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-80" />

          <div className="absolute top-[42px] left-0 w-[140px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-30" />
        </div>

        {/* Decoración inferior derecha */}
        <div className="absolute bottom-0 right-0 w-72 h-72 pointer-events-none">
          <div className="absolute bottom-[30px] right-[-20px] w-[180px] h-px bg-[#f15a24] rotate-[-45deg] origin-right opacity-40" />

          <div className="absolute bottom-[70px] right-[-10px] w-[120px] h-px bg-[#f15a24] rotate-[-45deg] origin-right opacity-20" />
        </div>

        {/* Brillo naranja sutil */}
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-[#f15a24]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[520px]">

          {/* =====================================================
              LOGO
          ===================================================== */}
          <div className="mb-10">

            <div className="flex items-center gap-3">

              {/* Icono G estilizado */}
              <div className="relative flex items-center justify-center w-11 h-11">
                <div className="absolute inset-0 border-[5px] border-[#f15a24] border-r-transparent rounded-[10px] rotate-[-12deg]" />

                <span className="relative text-[#f15a24] font-black text-xl italic">
                  G
                </span>
              </div>

              <div className="text-[28px] leading-none tracking-tight font-extrabold italic">
                <span className="text-white">GYMTRACK</span>
                <span className="text-[#f15a24] ml-2">360</span>
              </div>

            </div>

            {/* Línea de marca */}
            <div className="mt-4 w-16 h-[3px] bg-[#f15a24] rounded-full" />

          </div>

          {/* =====================================================
              TITULO
          ===================================================== */}
          <div className="mb-8">

            <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight text-white">
              Bienvenido de nuevo
            </h1>

            <p className="mt-2 text-[15px] text-white/50">
              Accede a tu espacio de entrenamiento
            </p>

          </div>

          {/* =====================================================
              FORMULARIO
          ===================================================== */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >

            {/* CORREO */}
            <div>

              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-white/80 mb-2"
              >
                Correo
              </label>

              <div className="relative">

                {/* Icono */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="text-white/40"
                  >
                    <rect
                      width="20"
                      height="16"
                      x="2"
                      y="4"
                      rx="2"
                    />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className="
                    w-full
                    h-[52px]
                    rounded-[9px]
                    bg-[#17191b]
                    border
                    border-white/15
                    px-4
                    pl-12
                    text-[14px]
                    text-white
                    placeholder:text-white/25
                    outline-none
                    transition-all
                    duration-200
                    focus:border-[#f15a24]
                    focus:ring-2
                    focus:ring-[#f15a24]/10
                    hover:border-white/25
                  "
                  placeholder="tucorreo@gymtrack.com"
                />

              </div>

              {errors.email && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.email.message}
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

              <div className="relative">

                {/* Icono candado */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="text-white/40"
                  >
                    <rect
                      width="18"
                      height="11"
                      x="3"
                      y="11"
                      rx="2"
                    />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                  className="
                    w-full
                    h-[52px]
                    rounded-[9px]
                    bg-[#17191b]
                    border
                    border-white/15
                    px-4
                    pl-12
                    text-[14px]
                    text-white
                    placeholder:text-white/25
                    outline-none
                    transition-all
                    duration-200
                    focus:border-[#f15a24]
                    focus:ring-2
                    focus:ring-[#f15a24]/10
                    hover:border-white/25
                  "
                  placeholder="••••••••"
                />

              </div>

              {errors.password && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.password.message}
                </p>
              )}

            </div>

            {/* OLVIDASTE CONTRASEÑA */}
            <div className="flex justify-end pt-0">

              <Link
                to="/forgot-password"
                className="
                  text-[#f15a24]
                  text-[12px]
                  font-medium
                  hover:text-[#ff7541]
                  transition-colors
                "
              >
                ¿Olvidaste tu contraseña?
              </Link>

            </div>

            {/* ERROR API */}
            {errorApi && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                {errorApi}
              </div>
            )}

            {/* =====================================================
                BOTÓN
            ===================================================== */}
            <button
              type="submit"
              disabled={cargandoSubmit}
              className="
                group
                relative
                w-full
                h-[52px]
                overflow-hidden
                rounded-[9px]
                bg-[#f15a24]
                text-white
                font-semibold
                text-[14px]
                shadow-[0_8px_30px_rgba(241,90,36,0.18)]
                transition-all
                duration-200
                hover:bg-[#ff6930]
                hover:shadow-[0_10px_35px_rgba(241,90,36,0.25)]
                active:scale-[0.99]
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >

              <span className="relative z-10 flex items-center justify-center gap-2">
                {cargandoSubmit ? (
                  "Ingresando..."
                ) : (
                  <>
                    Ingresar

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="
                        transition-transform
                        duration-200
                        group-hover:translate-x-1
                      "
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </span>

            </button>

          </form>

          {/* =====================================================
              REGISTRO
          ===================================================== */}
          <p className="text-white/45 text-[13px] text-center mt-7">

            ¿No tienes cuenta?{" "}

            <Link
              to="/register"
              className="
                text-[#f15a24]
                font-medium
                hover:text-[#ff7541]
                transition-colors
              "
            >
              Regístrate
            </Link>

          </p>

          {/* =====================================================
              BENEFICIOS
          ===================================================== */}
          <div className="mt-16 pt-7 border-t border-white/10">

            <div className="grid grid-cols-3 gap-4">

              {/* Seguimiento */}
              <div className="flex items-start gap-3">

                <div className="text-[#f15a24] mt-0.5">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M3 3v18h18" />
                    <path d="m7 16 4-5 3 3 5-7" />
                  </svg>

                </div>

                <div>
                  <p className="text-white/80 text-[11px] font-medium">
                    Seguimiento
                  </p>

                  <p className="text-white/35 text-[10px] mt-0.5">
                    de progreso
                  </p>
                </div>

              </div>

              {/* Entrenamiento */}
              <div className="flex items-start gap-3 border-l border-white/10 pl-4">

                <div className="text-[#f15a24] mt-0.5">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
                  </svg>

                </div>

                <div>
                  <p className="text-white/80 text-[11px] font-medium">
                    Gestiona
                  </p>

                  <p className="text-white/35 text-[10px] mt-0.5">
                    tus entrenamientos
                  </p>
                </div>

              </div>

              {/* Disciplina */}
              <div className="flex items-start gap-3 border-l border-white/10 pl-4">

                <div className="text-[#f15a24] mt-0.5">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>

                </div>

                <div>
                  <p className="text-white/80 text-[11px] font-medium">
                    Más disciplina.
                  </p>

                  <p className="text-white/35 text-[10px] mt-0.5">
                    Mejores resultados.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =========================================================
          COLUMNA DERECHA - IMAGEN
      ========================================================= */}
      <div className="hidden lg:block lg:w-1/2 relative min-h-screen bg-black overflow-hidden">

        {/* Imagen */}
        <img
          src="/login-gym.png"
          alt=""
          className="
            absolute
            inset-0
            w-full
            h-full
            object-cover
            object-center
          "
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Overlay oscuro para integrar la imagen */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Degradado lateral */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/35 via-transparent to-black/10" />

        {/* Degradado inferior */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* =====================================================
            TEXTO SOBRE LA FOTO
        ===================================================== */}
        <div className="absolute bottom-12 left-10 xl:left-12 right-10">

          <div className="flex gap-4">

            {/* Línea naranja */}
            <div className="w-[3px] rounded-full bg-[#f15a24] shrink-0" />

            <div>

              <p className="text-[28px] xl:text-[30px] font-bold leading-tight tracking-tight text-white">
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