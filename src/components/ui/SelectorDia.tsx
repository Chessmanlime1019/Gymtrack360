import { ChevronLeft, ChevronRight } from "lucide-react";
import { hoyLima } from "@/services/recepcionService";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (fecha: string) => void;
}

function mover(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}

// Selector de día con flechas. No deja elegir fechas futuras.
export function SelectorDia({ value, onChange }: Props) {
  const hoy = hoyLima();
  const esHoy = value === hoy;
  const etiqueta = esHoy
    ? "Hoy"
    : new Date(`${value}T12:00:00`).toLocaleDateString("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      <button
        onClick={() => onChange(mover(value, -1))}
        aria-label="Día anterior"
        className="w-9 h-9 grid place-items-center rounded-lg text-ink-2 hover:bg-background"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <label className="relative px-3 h-9 grid place-items-center text-sm font-medium text-ink cursor-pointer min-w-[110px] text-center capitalize">
        {etiqueta}
        <input
          type="date"
          value={value}
          max={hoy}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Elegir fecha"
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      <button
        onClick={() => onChange(mover(value, 1))}
        disabled={esHoy}
        aria-label="Día siguiente"
        className="w-9 h-9 grid place-items-center rounded-lg text-ink-2 hover:bg-background disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}