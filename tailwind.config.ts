import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0F1113",
        surface: "#1A1E22",
        primary: "#F15A24",
        "primary-dark": "#FF6930",
        muted: "#8F99A3",
        line: "#2A3036",
        ink: "#FFFFFF",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;