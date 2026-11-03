import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Apariencia: claro, oscuro o la del sistema operativo. La elección se guarda
// en este navegador. index.html aplica la clase .dark antes de que cargue
// React (misma clave y misma regla) para que no parpadee al abrir la app.

export type Tema = "light" | "dark" | "system";

interface TemaContextValue {
  tema: Tema;
  resuelto: "light" | "dark";
  setTema: (t: Tema) => void;
}

const CLAVE = "gt-tema";
const COLOR_BARRA = { light: "#FFFFFF", dark: "#0B0F13" };

const TemaContext = createContext<TemaContextValue | undefined>(undefined);

function leerTema(): Tema {
  try {
    const t = localStorage.getItem(CLAVE);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    /* sin almacenamiento: se usa el del sistema */
  }
  return "system";
}

const consulta = () => window.matchMedia("(prefers-color-scheme: dark)");

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(leerTema);
  const [sistemaOscuro, setSistemaOscuro] = useState(() => consulta().matches);

  useEffect(() => {
    const mq = consulta();
    const alCambiar = () => setSistemaOscuro(mq.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  const resuelto = tema === "system" ? (sistemaOscuro ? "dark" : "light") : tema;

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle("dark", resuelto === "dark");
    raiz.style.colorScheme = resuelto;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLOR_BARRA[resuelto]);
  }, [resuelto]);

  function setTema(t: Tema) {
    setTemaState(t);
    try {
      localStorage.setItem(CLAVE, t);
    } catch {
      /* vale solo mientras la pestaña esté abierta */
    }
  }

  return <TemaContext.Provider value={{ tema, resuelto, setTema }}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error("useTema debe usarse dentro de <TemaProvider>");
  return ctx;
}
