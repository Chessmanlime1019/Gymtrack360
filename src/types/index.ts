export * from "./database.types";

// Respuesta de la función RPC validar_acceso_qr
export interface ValidacionAcceso {
  autorizado: boolean;
  tipo?: "entrada" | "salida";
  motivo: string | null;
  cliente: string | null;
  plan: string | null;
  minutos?: number; // solo en salidas
  dentro?: number;
  aforo_maximo?: number | null;
}

// Sesión de usuario enriquecida con su perfil (usada en AuthContext)
export interface SesionUsuario {
  userId: string;
  email: string;
  nombre: string;
  apellido: string;
  role: import("./database.types").UserRole;
  sedeId: string | null;
  avatarUrl: string | null;
}