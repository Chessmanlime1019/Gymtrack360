import { z } from "zod";

export const OBJETIVOS = [
  "Hipertrofia",
  "Fuerza",
  "Pérdida de grasa",
  "Resistencia",
  "Tonificación",
  "Movilidad y rehabilitación",
] as const;

export const NIVELES = ["Principiante", "Intermedio", "Avanzado"] as const;

export const GRUPOS_MUSCULARES = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Piernas",
  "Glúteos",
  "Pantorrillas",
  "Core",
  "Cardio",
] as const;

// Cabecera de la rutina. Los ejercicios se validan aparte en la pantalla.
export const rutinaSchema = z.object({
  nombre: z.string().min(3, "Mínimo 3 caracteres"),
  clienteId: z.string().min(1, "Elige un cliente"),
  objetivo: z.string().min(1, "Elige un objetivo"),
  nivel: z.string().min(1, "Elige un nivel"),
  semanas: z.string().optional(),
  descripcion: z.string().optional(),
});

export type RutinaFormValues = z.infer<typeof rutinaSchema>;