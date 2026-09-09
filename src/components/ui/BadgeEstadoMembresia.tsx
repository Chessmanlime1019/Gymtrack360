import type { MembresiaEstado } from "@/types";


const ESTILO: Record<MembresiaEstado, string> = {
  activa: "bg-green-600/10 text-green-600",
  vencida: "bg-yellow-600/10 text-yellow-600",
  cancelada: "bg-red-600/10 text-red-600",
};
const ETIQUETA: Record<MembresiaEstado, string> = {
  activa: "Activa",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export function BadgeEstadoMembresia({ estado }: { estado: MembresiaEstado | null }) {
  if (!estado) {
    return <span className="text-xs text-muted">Sin membresÃ­a</span>;
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTILO[estado]}`}>
      {ETIQUETA[estado]}
    </span>
  );
}
