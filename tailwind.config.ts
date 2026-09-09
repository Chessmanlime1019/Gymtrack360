import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // paleta "Warm Wellness" — crema + naranja, tipo dashboard
        // de gimnasio boutique. Reemplaza la anterior "Dark Fitness".
        background: "#F7F3ED",
        surface: "#FFFFFF",
        primary: "#E8672B",
        "primary-dark": "#C2521E",
        muted: "#8A7B6C",
        line: "#ECE3D6",
        ink: "#241F19",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;