import type { TipoAviso } from "@/services/avisosService";

export const ESTILO_AVISO: Record<
  TipoAviso,
  { etiqueta: string; barra: string; chip: string; texto: string }
> = {
  info: { etiqueta: "Informativo", barra: "bg-info", chip: "bg-info/10 text-info", texto: "text-info" },
  importante: {
    etiqueta: "Importante",
    barra: "bg-warning",
    chip: "bg-warning/10 text-warning",
    texto: "text-warning",
  },
  promo: {
    etiqueta: "Promoción",
    barra: "bg-primary",
    chip: "bg-primary/10 text-primary",
    texto: "text-primary",
  },
};

export function fechaAviso(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Lima",
  });
}

export function esNuevo(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 3 * 86_400_000;
}