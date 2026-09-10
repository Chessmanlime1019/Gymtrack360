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
    const { data: listener } =
      supabase.auth.onAuthStateChange((event, session) => {
        if (
          event === "PASSWORD_RECOVERY" ||
          (event === "SIGNED_IN" && session)
        ) {
          setSesionValida(true);
        }
      });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSesionValida(true);
    });

    const timeout = setTimeout(() => {
      setSesionValida((actual) =>
        actual === null ? false : actual
      );
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
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la contraseña"
      );
    } finally {
      setCargando(false);
    }
  }

  /* =========================================================
     VERIFICANDO
  ========================================================= */
  if (sesionValida === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] text-white">

        <div className="text-center">

          <div
            className="
              w-12 h-12
              mx-auto
              rounded-full
              border-2
              border-[#f15a24]/20
              border-t-[#f15a24]
              animate-spin
            "
          />

          <p className="mt-5 text-sm text-white/55">
            Verificando link...
          </p>

        </div>

      </div>
    );
  }

  /* =========================================================
     LINK INVALIDO
  ========================================================= */
  if (sesionValida === false) {
    return (
      <div className="min-h-screen flex bg-[#0d0d0d] text-white overflow-hidden">

        <div className="relative w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-10 lg:px-16 xl:px-24">

          <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none">
            <div className="absolute top-0 left-0 w-[180px] h-px bg-[#f15a24] rotate-[-45deg] origin-left opacity-70" />
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

            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="text-red-400"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m9 9 6 6" />
                <path d="m15 9-6 6" />
              </svg>

            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              Link inválido o expirado
            </h2>

            <p className="mt-3 text-[15px] leading-6 text-white/55">
              Solicita un nuevo link de recuperación
              de contraseña.
            </p>

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

        </div>

      </div>
    );
  }

  /* =========================================================
     EXITO
  ========================================================= */
  if (exito) {
    return (
      <div className="min-h-screen flex bg-[#0d0d0d] text-white overflow-hidden">

        <div className="relative w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-10 lg:px-16 xl:px-24">

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
              ¡Contraseña actualizada!
            </h2>

            <p className="mt-3 text-[15px] text-white/55">
              Redirigiendo al login...
            </p>

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

        </div>

      </div>
    );
  }

  /* =========================================================
     FORMULARIO
  ========================================================= */
  return (
    <div className="min-h-screen flex bg-[#0d0d0d] text-white overflow-hidden">

      <div className="relative w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-10 lg:px-16 xl:px-24">

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

          <div className="mb-8">

            <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight">
              Nueva contraseña
            </h1>

            <p className="mt-2 text-[15px] text-white/50">
              Define una nueva contraseña para tu cuenta.
            </p>

          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >

            {/* NUEVA CONTRASEÑA */}
            <div>

              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-white/80 mb-2"
              >
                Nueva contraseña
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
                  autoComplete="new-password"
                  {...register("password")}
                  className="
                    w-full
                    h-[52px]
                    rounded-[9px]
                    bg-[#17191b]
                    border border-white/15
                    px-4 pl-12
                    text-[14px]
                    text-white
                    outline-none
                    focus:border-[#f15a24]
                    focus:ring-2
                    focus:ring-[#f15a24]/10
                    hover:border-white/25
                    transition-all
                  "
                />

              </div>

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
                  id="confirmarPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmarPassword")}
                  className="
                    w-full
                    h-[52px]
                    rounded-[9px]
                    bg-[#17191b]
                    border border-white/15
                    px-4 pl-12
                    text-[14px]
                    text-white
                    outline-none
                    focus:border-[#f15a24]
                    focus:ring-2
                    focus:ring-[#f15a24]/10
                    hover:border-white/25
                    transition-all
                  "
                />

              </div>

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
              disabled={cargando}
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
              {cargando
                ? "Guardando..."
                : "Actualizar contraseña"}
            </button>

          </form>

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