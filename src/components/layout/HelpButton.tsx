import { useEffect, useRef, useState } from "react";
import { ChevronDown, HelpCircle, Mail, MessageCircle } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

// Datos de contacto de soporte. Déjalos vacíos ("") para ocultar el botón.
const SOPORTE_EMAIL = "";
const SOPORTE_WHATSAPP = ""; // solo números con código de país, ej. "51999888777"

interface Pregunta {
  p: string;
  r: string;
}

const COMUNES: Pregunta[] = [
  {
    p: "¿Cómo instalo la app en mi celular?",
    r: "En Android abre el menú de Chrome y elige “Instalar app”. En iPhone, desde Safari toca Compartir y luego “Agregar a pantalla de inicio”.",
  },
  {
    p: "¿Cómo cambio mi contraseña?",
    r: "Entra a tu perfil (menú de tu foto, arriba a la derecha) y usa “Cambiar contraseña”. Si no la recuerdas, en el login toca “¿Olvidaste tu contraseña?”.",
  },
];

const POR_ROL: Record<string, Pregunta[]> = {
  cliente: [
    {
      p: "¿Cómo entro al gimnasio?",
      r: "Abre “Mi QR” y muéstralo en recepción. Si no tienes celular, dicta tu código (empieza con GT360-). Necesitas una membresía vigente.",
    },
    {
      p: "¿Cómo pago o renuevo mi membresía?",
      r: "Entra a “Pagar”, elige tu plan y paga con Yape, Plin o efectivo. Al terminar se genera tu recibo.",
    },
    {
      p: "¿Dónde veo mi rutina?",
      r: "En “Mis Rutinas”. Si todavía no tienes una, pídesela a tu profesional.",
    },
  ],
  profesional: [
    {
      p: "¿Cómo creo una rutina?",
      r: "En “Rutinas” toca “Nueva rutina”, elige al cliente, arma cada día con ejercicios y guarda. El cliente recibe un aviso.",
    },
    {
      p: "¿Cómo tomo a un cliente a cargo?",
      r: "En “Mis Clientes”, pestaña “Clientes de la sede”, elige al cliente y toca “Tomar a cargo”.",
    },
  ],
  recepcionista: [
    {
      p: "¿Cómo valido el ingreso de un cliente?",
      r: "En “Control de Acceso” escanea su QR o escribe su código GT360-… Verifica que tengas elegida la sede correcta.",
    },
    {
      p: "¿Cómo registro un pago o una membresía?",
      r: "Busca al cliente en “Buscar Cliente” o usa “Registrar Pago”. Puedes cobrar con efectivo, Yape, Plin o transferencia y descargar la boleta.",
    },
  ],
  admin_sede: [
    {
      p: "¿Cómo creo un usuario de mi sede?",
      r: "En “Usuarios” toca “Nuevo usuario” y elige el rol (recepción o profesional). Quedará asignado a tu sede.",
    },
    {
      p: "¿Dónde veo reportes?",
      r: "En “Reportes” puedes filtrar por fechas y exportar a Excel o PDF.",
    },
  ],
  super_admin: [
    {
      p: "¿Cómo administro las sedes?",
      r: "En “Sedes” puedes crear, editar y activar o desactivar cada sede. Los usuarios, planes y reportes se pueden ver por sede.",
    },
    {
      p: "¿Dónde veo qué pasó en el sistema?",
      r: "En “Reportes” → “Historial de operaciones” se registra quién hizo cada cambio y cuándo.",
    },
  ],
};

export function HelpButton() {
  const { sesion } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera o con Escape (también en el celular).
  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent | TouchEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const preguntas = [...(POR_ROL[sesion?.role ?? ""] ?? []), ...COMUNES];
  const hayContacto = !!SOPORTE_EMAIL || !!SOPORTE_WHATSAPP;

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Ayuda"
        aria-expanded={abierto}
        className="w-11 h-11 rounded-xl grid place-items-center text-ink-2 hover:bg-surface hover:text-ink transition-colors"
      >
        <HelpCircle size={20} />
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Ayuda"
          className="fixed inset-x-3 top-[66px] md:absolute md:inset-x-auto md:right-0 md:top-[52px] md:w-[360px] z-50 bg-surface border border-line-strong rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-line">
            <p className="text-ink font-semibold">Ayuda</p>
            <p className="text-muted text-xs mt-0.5">Preguntas frecuentes</p>
          </div>

          {/* Alto máximo con scroll: nunca se sale de la pantalla */}
          <div className="max-h-[min(55vh,380px)] overflow-y-auto">
            <ul>
              {preguntas.map((q, i) => {
                const abiertaEsta = abierta === i;
                return (
                  <li key={q.p} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setAbierta(abiertaEsta ? null : i)}
                      aria-expanded={abiertaEsta}
                      className="w-full flex items-center justify-between gap-3 px-4 min-h-[52px] text-left hover:bg-bar"
                    >
                      <span className="text-ink text-sm font-medium">{q.p}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-muted transition-transform ${abiertaEsta ? "rotate-180" : ""}`}
                      />
                    </button>
                    {abiertaEsta && <p className="px-4 pb-4 text-muted text-xs leading-relaxed">{q.r}</p>}
                  </li>
                );
              })}
            </ul>
          </div>

          {hayContacto && (
            <div className="p-3 border-t border-line grid gap-2 bg-bar">
              <p className="text-muted text-xs px-1">¿Sigues con dudas? Escríbenos:</p>
              {SOPORTE_WHATSAPP && (
                <a
                  href={`https://wa.me/${SOPORTE_WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[44px] rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              {SOPORTE_EMAIL && (
                <a
                  href={`mailto:${SOPORTE_EMAIL}`}
                  className="min-h-[44px] rounded-xl border border-line-strong text-ink-2 hover:border-primary hover:text-primary text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Mail size={16} /> Correo de soporte
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}