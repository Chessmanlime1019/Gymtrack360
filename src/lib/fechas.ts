// Fechas del negocio en hora de Lima (UTC-5, sin horario de verano).
//
// No usar new Date().toISOString().slice(0, 10) para saber "hoy": eso es la
// fecha en UTC, que desde las 7 p. m. de Lima ya es el día siguiente.

export const ZONA_LIMA = "America/Lima";

// Día (YYYY-MM-DD) en Lima de un instante. Solo para timestamps; una fecha
// sin hora ("2026-11-02") ya es un día y se usa tal cual.
export function diaLima(instante: Date | string = new Date()): string {
  return new Date(instante).toLocaleDateString("en-CA", { timeZone: ZONA_LIMA });
}

export const hoyLima = () => diaLima();

export const primerDiaMesLima = () => `${hoyLima().slice(0, 8)}01`;

// Suma días a una fecha YYYY-MM-DD sin pasar por la zona horaria del equipo.
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Límites de un día de Lima, listos para filtrar columnas timestamptz.
export const inicioDiaLima = (fecha: string) => `${fecha}T00:00:00-05:00`;
export const finDiaLima = (fecha: string) => `${fecha}T23:59:59.999-05:00`;

// "lunes, 3 de noviembre" en hora de Lima.
export function fechaLargaLima(): string {
  return new Date().toLocaleDateString("es-PE", { timeZone: ZONA_LIMA, weekday: "long", day: "numeric", month: "long" });
}

export function saludoLima(): string {
  const hora = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: ZONA_LIMA })) % 24;
  return hora >= 5 && hora < 12 ? "Buenos días" : hora >= 12 && hora < 19 ? "Buenas tardes" : "Buenas noches";
}
