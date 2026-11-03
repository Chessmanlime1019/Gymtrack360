import { useEffect, useState, type ReactNode } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { PasswordInput } from "@/components/ui/PasswordInput";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "@/schemas/authSchemas";

// Recuperar contraseña en 3 pasos, sin salir de la pantalla:
//   1. Correo  ->  Supabase envía un código de verificación al correo.
//   2. Código  ->  verifyOtp({ type: "recovery" }) abre una sesión temporal.
//   3. Nueva contraseña  ->  updateUser({ password }).
type Paso = "correo" | "codigo" | "nueva" | "listo";

const ESPERA_REENVIO = 60; // Supabase no permite reenviar antes de 60 s

const inputClase = `
  w-full h-[52px] rounded-[9px] bg-[#17191b] border border-white/15 px-4 pl-12
  text-[14px] text-white placeholder:text-white/25 outline-none
  focus:border-[#f15a24] focus:ring-2 focus:ring-[#f15a24]/10
  hover:border-white/25 transition-all
`;

const botonClase = `
  w-full h-[52px] rounded-[9px] bg-[#f15a24] text-white font-semibold text-[14px]
  shadow-[0_8px_30px_rgba(241,90,36,0.18)] hover:bg-[#ff6930]
  hover:shadow-[0_10px_35px_rgba(241,90,36,0.25)] transition-all
  disabled:opacity-50 disabled:cursor-not-allowed
`;

// Supabase responde en inglés: se traduce lo que puede ver el usuario.
function mensajeError(err: unknown, porDefecto: string): string {
  const m = err instanceof Error ? err.message : "";
  if (/expired|invalid/i.test(m)) return "El código no es válido o ya venció. Revisa el correo o pide uno nuevo.";
  if (/security purposes|after \d+ seconds/i.test(m)) return "Espera un momento antes de pedir otro código.";
  if (/rate limit/i.test(m)) return "Se enviaron demasiados correos. Intenta de nuevo en unos minutos.";
  if (/same.*password|different from the old/i.test(m)) return "La nueva contraseña debe ser distinta a la anterior.";
  if (/weak|at least/i.test(m)) return "La contraseña es demasiado débil. Usa al menos 6 caracteres.";
  return m || porDefecto;
}

export default function ForgotPassword() {
  const { recuperarPassword, verificarCodigoRecuperacion, actualizarPassword } = useAuth();
  const navigate = useNavigate();

  const [paso, setPaso] = useState<Paso>("correo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const formCorreo = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });
  const formNueva = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function enviarCodigo(correo: string) {
    setErrorApi(null);
    setCargando(true);
    try {
      await recuperarPassword(correo);
      setEmail(correo);
      setCodigo("");
      setEspera(ESPERA_REENVIO);
      setPaso("codigo");
    } catch (err) {
      setErrorApi(mensajeError(err, "No se pudo enviar el código."));
    } finally {
      setCargando(false);
    }
  }

  async function verificar() {
    setErrorApi(null);
    setCargando(true);
    try {
      await verificarCodigoRecuperacion(email, codigo);
      setPaso("nueva");
    } catch (err) {
      setErrorApi(mensajeError(err, "No se pudo verificar el código."));
    } finally {
      setCargando(false);
    }
  }

  async function guardarNueva(values: ResetPasswordValues) {
    setErrorApi(null);
    setCargando(true);
    try {
      await actualizarPassword(values.password);
      setPaso("listo");
      // La sesión ya está abierta: entra directo a su panel.
      setTimeout(() => navigate("/", { replace: true }), 1800);
    } catch (err) {
      setErrorApi(mensajeError(err, "No se pudo actualizar la contraseña."));
    } finally {
      setCargando(false);
    }
  }

  const codigoValido = /^\d{6,10}$/.test(codigo);

  /* ------------------------------------------------------------ 4. Listo */
  if (paso === "listo") {
    return (
      <Marco>
        <Icono tono="exito">
          <path d="M20 6 9 17l-5-5" />
        </Icono>
        <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight">¡Contraseña actualizada!</h1>
        <p className="mt-3 text-[15px] text-white/55">Entrando a tu cuenta…</p>
      </Marco>
    );
  }

  return (
    <Marco>
      <Pasos actual={paso} />

      {/* ------------------------------------------------------------ 1. Correo */}
      {paso === "correo" && (
        <>
          <Titulo
            titulo="¿Olvidaste tu contraseña?"
            texto="Ingresa tu correo y te enviaremos un código de verificación para crear una nueva."
          />
          <form onSubmit={formCorreo.handleSubmit((v) => enviarCodigo(v.email))} className="space-y-5">
            <Campo id="email" etiqueta="Correo" icono={<IconoCorreo />} error={formCorreo.formState.errors.email?.message}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...formCorreo.register("email")}
                className={inputClase}
                placeholder="tucorreo@gymtrack.com"
              />
            </Campo>
            <ErrorApi texto={errorApi} />
            <button type="submit" disabled={cargando} className={botonClase}>
              {cargando ? "Enviando…" : "Enviar código"}
            </button>
          </form>
        </>
      )}

      {/* ------------------------------------------------------------ 2. Código */}
      {paso === "codigo" && (
        <>
          <Titulo
            titulo="Revisa tu correo"
            texto={`Si ${email} está registrado, te enviamos un código de verificación. Escríbelo aquí.`}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (codigoValido) verificar();
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="codigo" className="block text-[13px] font-medium text-white/80 mb-2">
                Código de verificación
              </label>
              <input
                id="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="••••••"
                className="w-full h-[60px] rounded-[9px] bg-[#17191b] border border-white/15 text-center text-[26px] font-bold tracking-[0.5em] text-white placeholder:text-white/20 outline-none focus:border-[#f15a24] focus:ring-2 focus:ring-[#f15a24]/10 hover:border-white/25 transition-all"
              />
              <p className="text-white/40 text-xs mt-2">
                ¿No llegó? Revisa la carpeta de spam. El código vence en 1 hora.
              </p>
            </div>
            <ErrorApi texto={errorApi} />
            <button type="submit" disabled={cargando || !codigoValido} className={botonClase}>
              {cargando ? "Verificando…" : "Verificar código"}
            </button>
          </form>

          <div className="flex items-center justify-between mt-5 text-[13px]">
            <button
              type="button"
              onClick={() => {
                setErrorApi(null);
                setPaso("correo");
              }}
              className="text-white/50 hover:text-white transition-colors"
            >
              Cambiar correo
            </button>
            <button
              type="button"
              disabled={espera > 0 || cargando}
              onClick={() => enviarCodigo(email)}
              className="text-[#f15a24] font-medium hover:text-[#ff7541] disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
            >
              {espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
            </button>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------ 3. Nueva contraseña */}
      {paso === "nueva" && (
        <>
          <Titulo titulo="Nueva contraseña" texto="Código verificado. Define una nueva contraseña para tu cuenta." />
          <form onSubmit={formNueva.handleSubmit(guardarNueva)} className="space-y-5">
            <Campo
              id="password"
              etiqueta="Nueva contraseña"
              icono={<IconoCandado />}
              error={formNueva.formState.errors.password?.message}
            >
              <PasswordInput id="password" autoComplete="new-password" {...formNueva.register("password")} className={inputClase} />
            </Campo>
            <Campo
              id="confirmarPassword"
              etiqueta="Confirmar contraseña"
              icono={<IconoCandado />}
              error={formNueva.formState.errors.confirmarPassword?.message}
            >
              <PasswordInput
                id="confirmarPassword"
                autoComplete="new-password"
                {...formNueva.register("confirmarPassword")}
                className={inputClase}
              />
            </Campo>
            <ErrorApi texto={errorApi} />
            <button type="submit" disabled={cargando} className={botonClase}>
              {cargando ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        </>
      )}

      {paso !== "nueva" && (
        <p className="text-white/45 text-[13px] text-center mt-7">
          <Link to="/login" className="text-[#f15a24] font-medium hover:text-[#ff7541] transition-colors">
            Volver a iniciar sesión
          </Link>
        </p>
      )}
    </Marco>
  );
}

/* ================================================================ piezas */

function Marco({ children }: { children: ReactNode }) {
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
                <span className="text-[#f15a24] font-black text-xl italic rotate-[12deg]">G</span>
              </div>
              <div className="text-[28px] leading-none tracking-tight font-extrabold italic">
                <span className="text-white">GYMTRACK</span>
                <span className="text-[#f15a24] ml-2">360</span>
              </div>
            </div>
            <div className="mt-4 w-16 h-[3px] bg-[#f15a24] rounded-full" />
          </div>
          {children}
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
              <p className="text-[28px] xl:text-[30px] font-bold leading-tight">Entrena. Controla. Progresa.</p>
              <p className="text-white/65 text-[13px] mt-2">La gestión completa de Cascada Gym, en un solo lugar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pasos({ actual }: { actual: Paso }) {
  const pasos: { id: Paso; texto: string }[] = [
    { id: "correo", texto: "Correo" },
    { id: "codigo", texto: "Código" },
    { id: "nueva", texto: "Nueva contraseña" },
  ];
  const indice = pasos.findIndex((p) => p.id === actual);
  return (
    <ol className="flex items-center gap-2 mb-7 text-[12px]">
      {pasos.map((p, i) => (
        <li key={p.id} className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full grid place-items-center font-bold ${
              i < indice ? "bg-[#f15a24] text-white" : i === indice ? "border-2 border-[#f15a24] text-[#f15a24]" : "border border-white/20 text-white/35"
            }`}
          >
            {i < indice ? "✓" : i + 1}
          </span>
          <span className={i === indice ? "text-white" : "text-white/40"}>{p.texto}</span>
          {i < pasos.length - 1 && <span className="w-6 h-px bg-white/15" />}
        </li>
      ))}
    </ol>
  );
}

function Titulo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-[15px] text-white/50">{texto}</p>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  icono,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  icono: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-white/80 mb-2">
        {etiqueta}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">{icono}</div>
        {children}
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}

function ErrorApi({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">{texto}</div>;
}

function Icono({ children, tono }: { children: ReactNode; tono: "exito" }) {
  return (
    <div
      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
        tono === "exito" ? "bg-[#f15a24]/10 border border-[#f15a24]/20 text-[#f15a24]" : ""
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        {children}
      </svg>
    </div>
  );
}

function IconoCorreo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-white/40">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconoCandado() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-white/40">
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
