import type { MembresiaEstado } from "@/types";


const ESTILO: Record<MembresiaEstado, string> = {
  activa: "bg-primary/10 text-primary",
  vencida: "bg-yellow-500/10 text-yellow-400",
  cancelada: "bg-red-500/10 text-red-400",
};

const ETIQUETA: Record<MembresiaEstado, string> = {
  activa: "Activa",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export function BadgeEstadoMembresia({ estado }: { estado: MembresiaEstado | null }) {
  if (!estado) {
    return <span className="text-xs text-muted">Sin membresía</span>;
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTILO[estado]}`}>
      {ETIQUETA[estado]}
    </span>
  );
}