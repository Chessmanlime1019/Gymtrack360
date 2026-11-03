import type { Config } from "tailwindcss";

// Los colores salen de src/styles/tokens.css (claro en :root, oscuro en .dark).
// rgb(var(...) / <alpha-value>) mantiene las clases con opacidad, como bg-primary/20.
const color = (nombre: string) => `rgb(var(--c-${nombre}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: color("bg"), // fondo de pagina
        bar: color("bar"), // sidebar, barra superior, navegacion inferior
        surface: color("surface"), // tarjetas y paneles
        card: color("surface"),
        "surface-hover": color("surface-hover"),
        primary: color("primary"), // naranja de marca
        "primary-dark": color("primary-dark"), // hover
        "primary-press": color("primary-press"),
        muted: color("muted"),
        "ink-2": color("ink-2"), // texto secundario
        line: color("line"), // bordes
        "line-strong": color("line-strong"),
        ink: color("ink"), // texto principal
        success: color("success"),
        warning: color("warning"),
        danger: color("danger"),
        info: color("info"),
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans Variable"',
          '"Plus Jakarta Sans"',
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
