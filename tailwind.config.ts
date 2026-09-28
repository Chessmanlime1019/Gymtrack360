import type { Config } from "tailwindcss";

// Los colores van en hex (no en var()) para que sigan funcionando las clases
// con opacidad, como bg-primary/20. Son los mismos valores de src/styles/tokens.css:
// si cambias uno aqui, cambialo tambien alla.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#060A0E", // fondo de pagina
        bar: "#0B0F13", // sidebar, barra superior, navegacion inferior (nuevo)
        surface: "#12181E", // tarjetas y paneles (antes #1A1E22)
        card: "#12181E", // igual que surface, nombre nuevo para codigo nuevo
        "surface-hover": "#171F27",
        primary: "#E8570C", // naranja de marca (antes #F15A24)
        "primary-dark": "#F26A1B", // hover; el nombre viene del proyecto
        "primary-press": "#C94A08",
        muted: "#8F99A3",
        "ink-2": "#C9D1D9", // texto secundario
        line: "#1E2329", // bordes (antes #2A3036)
        "line-strong": "#2A3036", // bordes al pasar el mouse o de mayor contraste
        ink: "#FFFFFF",
        success: "#22C55E",
        warning: "#E2A72E",
        danger: "#F75E53",
        info: "#4F82F5",
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          "Inter",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;