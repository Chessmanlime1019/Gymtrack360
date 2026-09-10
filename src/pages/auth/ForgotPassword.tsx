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
        err instanceof Error
          ? err.message
          : "No se pudo enviar el correo"
      );
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex bg-[#0d0d0d] text-white overflow-hidden">

        {/* IZQUIERDA */}
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
                  <path d="M22 12a10 10 0 1 1-10-10" />
                  <path d="M22 4v6h-6" />
                </svg>
              </div>

              <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight">
                Revisa tu correo
              </h1>

              <p className="mt-3 text-[15px] leading-6 text-white/55">
                Si el correo existe en nuestro sistema,
                te enviamos un enlace para restablecer
                tu contraseña.
              </p>

              <Link
                to="/login"
                className="
                  inline-flex
                  items-center
                  gap-2
                  mt-8
                  text-[#f15a24]
                  text-sm
                  font-medium
                  hover:text-[#ff7541]
                  transition-colors
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>

                Volver a iniciar sesión
              </Link>

            </div>

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

  return (
    <div className="min-h-screen flex bg-[#0d0d0d] text-white overflow-hidden">

      {/* IZQUIERDA */}
      <div className="relative w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-10 lg:px-16 xl:px-24 bg-[#0d0d0d] overflow-hidden">

        <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none">
          <div className="absolute top-0 left-0 w-[180px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-70" />
          <div className="absolute top-[42px] left-0 w-[140px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-25" />
        </div>

        <div className="absolute bottom-0 right-0 w-72 h-72 pointer-events-none">
          <div className="absolute bottom-[35px] right-[-20px] w-[180px] h-px bg-[#f15a24] rotate-[-45deg] origin-right opacity-25" />
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

          <div className="mb-8">

            <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight">
              ¿Olvidaste tu contraseña?
            </h1>

            <p className="mt-2 text-[15px] text-white/50">
              Ingresa tu correo y te enviaremos un enlace
              para recuperarla.
            </p>

          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >

            <div>

              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-white/80 mb-2"
              >
                Correo
              </label>

              <div className="relative">

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
                    border border-white/15
                    px-4 pl-12
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
                  placeholder="tucorreo@gymtrack.com"
                />

              </div>

              {errors.email && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.email.message}
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
              disabled={cargando}
              className="
                group
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
              {cargando ? "Enviando..." : "Enviar link de recuperación"}
            </button>

          </form>

          <p className="text-white/45 text-[13px] text-center mt-7">
            <Link
              to="/login"
              className="text-[#f15a24] font-medium hover:text-[#ff7541] transition-colors"
            >
              Volver a iniciar sesión
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