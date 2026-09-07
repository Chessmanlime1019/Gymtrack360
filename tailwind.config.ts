import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // paleta "Dark Fitness / Neon Green"
        background: "#0F0F0F",
        surface: "#1A1A1A",
        primary: "#39FF14",
        "primary-dark": "#2ECC0F",
        muted: "#737373",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;