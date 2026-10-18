import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Archivos de /public que también se guardan para uso sin conexión.
      includeAssets: [
        "icons/favicon.ico",
        "icons/favicon-16.png",
        "icons/favicon-32.png",
        "icons/apple-touch-icon.png",
        "icons/logo-gymtrack.png",
      ],
      manifest: {
        name: "GYMTRACK 360",
        short_name: "GYMTRACK",
        description: "Gestión y acceso digital para Cascada Gym: membresías, pagos, rutinas y control de ingreso por QR.",
        lang: "es-PE",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0B0F13",
        background_color: "#060A0E",
        categories: ["health", "fitness", "lifestyle"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // No se guarda nada de Supabase: los datos deben ser siempre frescos.
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        // El archivo principal pesa ~1.9 MB; este límite evita que el plugin lo ignore.
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true, // para poder probar desde tablet/celular en la misma red
  },
});